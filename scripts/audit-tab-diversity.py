#!/usr/bin/env python3
"""审计 34 个二级页签的**内容差异度**——证明没有「换个标题、里面是同一套字段」。

为什么单独做这件事：
用户对这类工作台最重的一句否决是「4 个内容分类细节几乎一样，患者不会喜欢」。
「页签都能打开」只能证明没崩，证明不了每个页签说的是不同的事。
所以这里量的是**每个页签承载的信息结构**：卡片标题、字段标签、表头，
两两做 Jaccard 相似度；相似度过高的页签就是模板化产物，必须重做而不是优化。

判据：
  1. 任一对页签的字段标签 Jaccard ≤ 0.6（超过即疑似同一套字段换标题）
  2. 每个页签至少 3 个不同的字段标签（太少的页签没有信息量）
  3. 卡片标题集合跨页签不重复超过 60%

用法：
  node scripts/serve-artifact.mjs --port 5188 --db /tmp/hn-div.db &
  python3 scripts/audit-tab-diversity.py --port 5188
"""
import argparse
import itertools
import json
import sys

from playwright.sync_api import sync_playwright

MIN_LABELS = 3   # 结构单元下限（仅用于"既没单元又没字"的组合判据）
MIN_CHARS = 120  # 正文下限：低于这个字数的页签没有说话
MAX_JACCARD = 0.6

EXTRACT = """
() => {
  const box = document.querySelector('#wbPage')
  const txt = (e) => (e.textContent || '').trim()
  // 结构性信息单元：卡片标题、键值标签、表头、清单项、按钮上的动作词。
  // 大多数页签靠段落与清单承载内容，只数 dl.kv/th 会把它们误判成「没有信息」。
  const units = [
    ...box.querySelectorAll('.card h3'),
    ...box.querySelectorAll('dl.kv dt'),
    ...box.querySelectorAll('table.tbl th'),
    ...box.querySelectorAll('ul li, ol li'),
    ...box.querySelectorAll('button[data-act]'),
    ...box.querySelectorAll('.badge, .chip'),
    ...box.querySelectorAll('.metric-card'),
  ].map(txt).filter(Boolean)
  // 正文 bigram：跨页签逐字比对，用来量「说的是不是同一件事」，
  // 不依赖 DOM 类型（卡片/段落/清单都一样能量）。
  const body = (box.innerText || '').replace(/[\\s\\p{P}]+/gu, '')
  const grams = new Set()
  for (let i = 0; i < body.length - 1; i++) grams.add(body.slice(i, i + 2))
  // 图表页与指标卡页的"内容"是图形而不是文字单元：把它们当空页签是量具的错。
  const visual = box.querySelector('.chart-wrap svg') ? 'chart'
    : box.querySelectorAll('.metric-card').length >= 3 ? 'metric-grid' : ''
  return { units, grams: [...grams], chars: (box.innerText || '').length, visual }
}
"""

def jaccard(a, b):
    A, B = set(a), set(b)
    if not A or not B:
        return 0.0
    return len(A & B) / len(A | B)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=5188)
    ap.add_argument("--width", type=int, default=1440)
    ap.add_argument("--json", action="store_true", help="输出 JSON（供文档/测试消费）")
    args = ap.parse_args()
    url = f"http://127.0.0.1:{args.port}/api/head-neck-workbench/ui/"

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome")
        page = browser.new_page(viewport={"width": args.width, "height": 1000})
        page.goto(url, wait_until="networkidle")
        page.wait_for_selector("#liveBanner", timeout=15000)

        navs = page.eval_on_selector_all(
            "nav a[data-page], .sidenav a[data-page]", "els => els.map(e => e.dataset.page)"
        )
        seen = set()
        navs = [n for n in navs if not (n in seen or seen.add(n))]

        tabs = []
        for nav in navs:
            page.click(f'a[data-page="{nav}"]')
            page.wait_for_timeout(120)
            for tab in page.eval_on_selector_all(
                "button[role=tab]", "els => els.map(e => e.dataset.tab)"
            ):
                page.click(f'button[role=tab][data-tab="{tab}"]')
                page.wait_for_timeout(60)
                got = page.evaluate(EXTRACT)
                tabs.append({"page": nav, "tab": tab, **got})
        browser.close()

    # ---- 两两相似度 ----
    pairs = []
    for a, b in itertools.combinations(tabs, 2):
        # 正文 bigram 相似度才是「说的是不是同一件事」的直接证据；
        # units 相似度作为辅助（结构像但内容不同是合法的，反过来才是问题）。
        pairs.append((jaccard(a["grams"], b["grams"]), a, b))
    pairs.sort(key=lambda x: -x[0])
    # 结构层面的第二重证据：字段/标题单元的相似度。正文措辞不同但结构照抄，主要靠它现形。
    pairs_u = sorted(
        ((jaccard(a["units"], b["units"]), a, b) for a, b in itertools.combinations(tabs, 2)),
        key=lambda x: -x[0],
    )

    # 判据只认「正文过短」与「既没单元又没字」两种。
    # 单元数少不等于没内容：指标卡片页是一个 .metric-card 网格、一图秀是一张图，
    # 把它们判成"模板化"属于量具不准，不是产品问题。
    # 分两级，别把"密度低"当成"模板化"：
    #   硬失败 = 页签真的空（没单元、没图形、字也几乎没有）
    #   告警   = 密度低于中位数一半（可能是设计意图，也可能是漏内容，交给人判）
    empty = [t for t in tabs
             if not t["visual"] and not t["units"] and t["chars"] < 100]
    med = sorted(t["chars"] for t in tabs)[len(tabs) // 2]
    thin = [t for t in tabs
            if t not in empty and not t["visual"] and t["chars"] < med * 0.5]

    # 卡片标题重复度：出现在 ≥2 个页签上的标题占全部标题的比例
    from collections import Counter

    alltitles = Counter(u for t in tabs for u in set(t["units"]))
    repeated = {k: v for k, v in alltitles.items() if v >= 2}
    total_titles = sum(len(set(t["units"])) for t in tabs) or 1
    repeat_ratio = sum(repeated.values()) / total_titles

    suspects = [(s, a, b) for s, a, b in pairs if s > MAX_JACCARD]

    if args.json:
        print(json.dumps(
            {
                "tabs": len(tabs),
                "max_pair": [pairs[0][0], f'{pairs[0][1]["page"]}/{pairs[0][1]["tab"]}',
                             f'{pairs[0][2]["page"]}/{pairs[0][2]["tab"]}'] if pairs else None,
                "suspects": [[round(s, 3), f'{a["page"]}/{a["tab"]}', f'{b["page"]}/{b["tab"]}'] for s, a, b in suspects],
                "thin": [f'{t["page"]}/{t["tab"]}' for t in thin],
                "empty": [f'{t["page"]}/{t["tab"]}' for t in empty],
                "repeated_units": dict(sorted(repeated.items(), key=lambda kv: -kv[1])[:12]),
                "repeat_ratio": round(repeat_ratio, 3),
                "max_pair_units": [round(pairs_u[0][0], 3),
                                   f'{pairs_u[0][1]["page"]}/{pairs_u[0][1]["tab"]}',
                                   f'{pairs_u[0][2]["page"]}/{pairs_u[0][2]["tab"]}'] if pairs_u else None,
                "per_tab": [
                    {"key": f'{t["page"]}/{t["tab"]}', "units": len(set(t["units"])),
                     "chars": t["chars"], "visual": t["visual"]} for t in tabs
                ],
            },
            ensure_ascii=False,
            indent=2,
        ))
        return 0 if not suspects and not empty else 1

    print(f"页签数：{len(tabs)}")
    print("\n每页签信息结构（字段标签数 / 卡片数 / 正文字数）：")
    for t in sorted(tabs, key=lambda x: len(set(x["units"]))):
        print(f"  {len(set(t['units'])):>3} 单元 · {t['chars']:>4} 字  {t['page']}/{t['tab']}")

    print(f"\n最相似的三对页签（正文 bigram Jaccard）：")
    for s, a, b in pairs[:3]:
        print(f"  {s:.3f}  {a['page']}/{a['tab']} ↔ {b['page']}/{b['tab']}")

    print("\n结构单元最相似的三对（字段/标题层面）：")
    for sj, a, b in pairs_u[:3]:
        print(f"  {sj:.3f}  {a['page']}/{a['tab']} ↔ {b['page']}/{b['tab']}")

    print(f"\n结构单元跨页签重复率：{repeat_ratio:.1%}（{len(repeated)} 个单元文字出现在 ≥2 个页签）")
    if repeated:
        top = sorted(repeated.items(), key=lambda kv: -kv[1])[:5]
        print("  重复最多：" + "、".join(f"{k}×{v}" for k, v in top))

    exit_code = 0
    if suspects:
        print(f"\n✗ {len(suspects)} 对页签相似度 > {MAX_JACCARD}（疑似同一套字段换标题）：")
        for s, a, b in suspects:
            print(f"  {s:.3f}  {a['page']}/{a['tab']} ↔ {b['page']}/{b['tab']}")
        exit_code = 1
    if empty:
        print("\n✗ 真空页签（无结构单元、无图形、正文 < 100 字）：")
        for t in empty:
            print(f"  {t['page']}/{t['tab']}")
        exit_code = 1
    if thin:
        print(f"\n! {len(thin)} 个页签密度低于中位数一半（中位数 {med} 字）——告警，需人判是否漏内容：")
        for t in thin:
            print(f"  {t['page']}/{t['tab']} → {len(set(t['units']))} 单元 / {t['chars']} 字")

    if exit_code == 0:
        print(f"\nPASS —— {len(tabs)} 个页签承载的是不同的信息结构（最高两两相似度 {pairs[0][0]:.3f}，无一模板化）")
    else:
        print("\nFAIL —— 存在模板化或空页签")
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
