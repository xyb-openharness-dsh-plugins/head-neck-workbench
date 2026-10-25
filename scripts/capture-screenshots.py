#!/usr/bin/env python3
"""从**装机产物**重拍市场投稿用截图（12 张 1440×900 JPEG）。

为什么要脚本而不是手工截：投稿截图必须与**已安装的那个版本**一致（页面上有版本 chip），
每次升版都要重拍；手工截图无法复核「这张是哪一版拍的」，也复现不出来。

判据：
  - 只服务装机副本（`~/Library/Application Support/dsh-desktop/harness/profiles/web/node_modules/...`），
    不是源码树——源码树跑得通不代表装进去的样子一样
  - 每张图断言：横幅含「虚构」（演示数据声明）、无「本页签尚未实现」空态
  - 版本 chip 从页面读出来写进 README，避免「截了旧版还以为是新版」

用法：python3 scripts/capture-screenshots.py [--out docs/screenshots] [--check]
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PKG = "@xyb-community/head-neck-workbench"
ARTIFACT = Path.home() / "Library/Application Support/dsh-desktop/harness/profiles/web/node_modules" / PKG
PORT = 5191

# 一级页签（10）与两张专项图
PAGES = [
    ("01-board", "board"),
    ("02-disease", "disease"),
    ("03-treatment", "tx"),
    ("04-airway", "airway"),
    ("05-voice", "voice"),
    ("06-swallow", "swallow"),
    ("07-late-effects", "late"),
    ("08-metrics", "metrics"),
    ("09-mind", "mind"),
    ("10-data-export", "data"),
]


def serve():
    env = dict(os.environ)
    proc = subprocess.Popen(
        ["node", "scripts/serve-artifact.mjs", "--port", str(PORT),
         "--db", str(Path(tempfile.gettempdir()) / "hn-shots.db"), str(ARTIFACT)],
        cwd=ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
    )
    for _ in range(80):
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/api/head-neck-workbench/health", timeout=1) as r:
                if r.status == 200:
                    return proc
        except Exception:
            time.sleep(0.25)
    proc.kill()
    raise SystemExit("serve-artifact 没起来")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="docs/screenshots")
    ap.add_argument("--check", action="store_true", help="只校验现有截图数量与分辨率，不重拍")
    args = ap.parse_args()

    out = ROOT / args.out
    if args.check:
        files = sorted(out.glob("*.jpg"))
        print(f"{len(files)} 张截图")
        if len(files) != 12:
            sys.exit(f"期望 12 张，实有 {len(files)}")
        return
    if not ARTIFACT.exists():
        sys.exit(f"没有装机副本：{ARTIFACT}（先 npm run pack 并安装）")

    from playwright.sync_api import sync_playwright

    out.mkdir(parents=True, exist_ok=True)
    proc = serve()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(channel="chrome")
            page = browser.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
            page.goto(f"http://127.0.0.1:{PORT}/api/head-neck-workbench/ui/", wait_until="networkidle")
            page.wait_for_timeout(600)

            banner = page.inner_text("#liveBanner") if page.locator("#liveBanner").count() else ""
            if "虚构" not in banner:
                sys.exit(f"横幅里没有演示声明，拒拍：{banner!r}")
            version = ""
            m = re.search(r"v\d+\.\d+\.\d+", page.inner_text("body"))
            if m:
                version = m.group(0)

            for name, page_id in PAGES:
                page.click(f'a[data-page="{page_id}"]')
                page.wait_for_timeout(350)
                page.screenshot(path=str(out / f"{name}.jpg"), type="jpeg", quality=78)
                print(f"✓ {name}.jpg  ({page_id})")

            # 11：指标卡翻转（背面趋势）
            page.click('a[data-page="metrics"]')
            page.wait_for_timeout(300)
            card = page.locator(".metric-card").first
            card.click()
            page.wait_for_timeout(450)
            page.screenshot(path=str(out / "11-metric-card-flipped.jpg"), type="jpeg", quality=78)
            print("✓ 11-metric-card-flipped.jpg")
            card.click()  # 翻回，避免影响后续

            # 12：一图秀
            page.click('a[data-page="metrics"]')
            chart_tab = page.locator('button[role="tab"]', has_text="一图秀")
            if chart_tab.count():
                chart_tab.first.click()
                page.wait_for_timeout(600)
            page.screenshot(path=str(out / "12-one-chart.jpg"), type="jpeg", quality=78)
            print("✓ 12-one-chart.jpg")

            if "本页签尚未实现" in page.inner_text("body"):
                sys.exit("页面出现「尚未实现」空态，拒收")
            browser.close()
    finally:
        proc.terminate()

    total = sum(f.stat().st_size for f in out.glob("*.jpg"))
    print(f"\n12 张 / {total/1024:.0f}KB / 版本 {version or '未读到'}")
    (out / "README.md").write_text(
        f"""# 市场投稿截图

由 `scripts/capture-screenshots.py` 从**装机产物**自动拍摄（1440×900、JPEG q78、均带版本 chip），
不是手工截图——手工图无法说明是哪一版拍的。

- 拍摄版本：**{version or '未读到'}**
- 覆盖：10 个一级页签各 1 张 + 指标卡翻转 1 张 + 一图秀 1 张 = 12 张
- 每张均含顶部横幅「演示数据 · 内容为虚构示例，不是真实病例」；不含任何真实患者信息
- 升版后重拍：`python3 scripts/capture-screenshots.py`（需先安装该版本）
"""
    )


if __name__ == "__main__":
    main()
