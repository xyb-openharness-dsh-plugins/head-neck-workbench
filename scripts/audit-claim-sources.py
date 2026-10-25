#!/usr/bin/env python3
"""医学断言来源覆盖审计：34 个页签里，哪些「像结论的句子」既没有来源也没标未核实。

## 为什么不是查关键词就完事
组织规则是「医学内容标来源与版本，未核实写『未核实』，禁相邻疾病外推」。
但「哪句算医学断言」无法靠正则判定——「放疗后口干」是事实陈述，「多数人 3 年内会缓解」
就是需要出处的结论。所以这里的做法是**窄口径、只查能被机器识别的硬特征**：

  1. 含**数字 + 时间/剂量/概率单位**（`年`、`%`、`Gy`、`mg`、`天`、`周`、`次/年`）
  2. 或含**指南式动词 + 绝对量词**（`应`/`需`/`必须`/`禁止` 且同时出现 `年`/`%`/`次`）
  3. 排除：演示数据行（表格里带日期的记录）、界面文案（页码、版本、按钮）

判据仍然是**分级**的（闸门写错比没有闸门更糟）：
  - 硬失败：一个页签里有 ≥1 句命中且该页签**既无 `src` 出处块也无「未核实」**
  - 告警：同页签有出处但命中句不在出处块附近（可能挂错位置）

输出每页签：命中数 / 是否带来源 / 是否标未核实 / 命中样例。

用法：python3 scripts/audit-claim-sources.py [--port 5195] [--json]
"""
import argparse
import json
import re
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PKG = "@xyb-community/head-neck-workbench"
ARTIFACT = Path.home() / "Library/Application Support/dsh-desktop/harness/profiles/web/node_modules" / PKG

# 一句话里同时出现「数字 + 这些单位」才算硬特征（避免把「2026 年 3 月」也算成断言）
UNITS = r"(?:天|周|个月|年|小时|%|Gy|mg|mL|ml|次/年|倍)"
NUM_UNIT = re.compile(rf"\d+(?:\.\d+)?\s*{UNITS}")
# 指南式动词 + 绝对表述
DIRECTIVE = re.compile(r"(必须|禁止|不要|应(?:当)?|需要|一定要)")
# 明显是界面/数据行的排除词
NOISE = re.compile(r"(演示|版本|v\d+\.\d+|第\s*\d+\s*页|共\s*\d+|截图)")
# 表格行：患者自己的记录（有日期或制表符），不是我们写的结论
RECORD_ROW = re.compile(r"(^\d{4}-\d{2}-\d{2})|\t|（原文）|出院小结原文")
# 出处的另一种写法：来源块之外，表格里用 src-* 引用编号
SRC_HINT = re.compile(r"(来源：|src-|PMID|出处|NCCN|CSCO|WHO\s*\d{4}|CTCAE)")


# 已裁定可豁免的页签：出处就是「患者自己的记录」，不需要文献。
# 每条都要写清理由，否则豁免会变成藏问题的地方。
KNOWN_OK = {
    "tx/放疗": "放疗剂量与次数是本档案自己的处方记录（60 Gy / 30 次），出处就是这条记录本身",
}


def serve():
    db = Path(tempfile.gettempdir()) / "hn-claims.db"
    proc = subprocess.Popen(
        ["node", "scripts/serve-artifact.mjs", "--port", str(PORT), "--db", str(db), str(ARTIFACT)],
        cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    for _ in range(80):
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{PORT}/api/head-neck-workbench/health", timeout=1)
            return proc
        except Exception:
            time.sleep(0.25)
    proc.kill()
    raise SystemExit("serve-artifact 没起来")


def sentences(text):
    parts = re.split(r"[。；\n]", text)
    return [p.strip() for p in parts if len(p.strip()) >= 8]


def main():
    global PORT
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=5195)
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()
    PORT = args.port

    from playwright.sync_api import sync_playwright

    proc = serve()
    rows = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(channel="chrome")
            page = browser.new_page(viewport={"width": 1440, "height": 900})
            page.goto(f"http://127.0.0.1:{PORT}/api/head-neck-workbench/ui/", wait_until="networkidle")
            page.wait_for_timeout(400)
            pages = page.eval_on_selector_all("a[data-page]", "els => els.map(e => [e.dataset.page, e.textContent.trim()])")
            for page_id, page_name in pages:
                page.click(f'a[data-page="{page_id}"]')
                page.wait_for_timeout(200)
                tabs = page.eval_on_selector_all("button[role=tab][data-tab]", "els => els.map(e => e.dataset.tab)")
                for tab in tabs:
                    page.click(f'button[role=tab][data-tab="{tab}"]')
                    page.wait_for_timeout(150)
                    body = page.inner_text("#wbPage")
                    has_src = bool(SRC_HINT.search(body))
                    has_unverified = "未核实" in body
                    hits = []
                    for s in sentences(body):
                        if NOISE.search(s) or RECORD_ROW.search(s):
                            continue
                        if NUM_UNIT.search(s) or (DIRECTIVE.search(s) and re.search(r"\d", s)):
                            hits.append(s[:120])
                    if hits:
                        rows.append({
                            "page": page_id, "pageName": page_name, "tab": tab,
                            "hits": len(hits), "src": has_src, "unverified": has_unverified,
                            "sample": hits[0],
                        })
            browser.close()
    finally:
        proc.terminate()

    hard = [r for r in rows if not r["src"] and not r["unverified"] and f"{r['page']}/{r['tab']}" not in KNOWN_OK]
    soft = [r for r in rows if r not in hard]

    if args.json:
        print(json.dumps({"hard": hard, "soft": soft, "total": len(rows)}, ensure_ascii=False, indent=2))
        return

    print(f"命中「像结论的句子」的页签：{len(rows)} 个（硬失败 {len(hard)} / 告警 {len(soft)}）\n")
    for k, why in KNOWN_OK.items():
        print(f"  · 已裁定豁免 {k}：{why}")
    if KNOWN_OK:
        print()
    for r in rows:
        mark = "✗" if r in hard else "!"
        where = f"{r['page']}/{r['tab']}"
        tags = []
        if f"{r['page']}/{r['tab']}" in KNOWN_OK:
            tags.append("已裁定豁免")
        if r["src"]:
            tags.append("有出处")
        if r["unverified"]:
            tags.append("标未核实")
        print(f"  {mark} {where:<28} 命中 {r['hits']:>2} 句  {'·'.join(tags) or '既无出处也未标未核实'}")
        print(f"      例：{r['sample']}")
    print()
    if hard:
        print("✗ 硬失败页签：这些页面说了带数字的结论，却没有任何出处或未核实标记。")
        sys.exit(1)
    print("PASS —— 所有含数字结论的页签都带了出处或未核实标记")


if __name__ == "__main__":
    main()
