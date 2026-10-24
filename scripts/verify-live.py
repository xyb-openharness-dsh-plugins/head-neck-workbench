#!/usr/bin/env python3
"""M5 真浏览器验收：界面是不是真的长在数据库上，点一下是不是真的写回磁盘。

判据（缺一条不算通过）：
  1. 0 个未捕获异常、0 个失败请求、0 条 console error
  2. 演示横幅存在且写明「虚构示例」
  3. 页面上出现的档案名/关切文本来自数据库（不是原型里的 DEMO 常量）
  4. 点一次「问过了」，磁盘库里的 asked 真的翻了
  5. 390 宽下 documentElement.scrollWidth === innerWidth（不横向溢出）

用法：python3 scripts/verify-live.py [--port 5178] [--db /tmp/x.db]
"""
import argparse
import json
import sqlite3
import sys
import urllib.request

from playwright.sync_api import sync_playwright


def api(port, path):
    with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/head-neck-workbench{path}") as r:
        return json.loads(r.read().decode())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=5178)
    ap.add_argument("--db", default="/tmp/hn-test.db")
    args = ap.parse_args()

    results = []
    def check(name, ok, detail=""):
        results.append((name, ok, detail))
        print(("PASS " if ok else "FAIL ") + name + (("  " + detail) if detail else ""))

    boot = api(args.port, "/bootstrap")
    db_name = boot["subject"]["display_name"]
    db_concern = boot["tables"]["concerns"][0]
    concern_id = db_concern["id"]
    before_asked = db_concern["asked"]

    errors, page_errors, failed = [], [], []

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 900})
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: page_errors.append(str(e)))
        page.on("requestfailed", lambda r: failed.append(r.url))

        page.goto(f"http://127.0.0.1:{args.port}/api/head-neck-workbench/ui", wait_until="networkidle")
        page.wait_for_selector("#liveBanner", timeout=8000)
        page.wait_for_timeout(400)

        banner = page.inner_text("#liveBanner")
        check("演示横幅写明虚构示例", "虚构示例" in banner, banner.strip()[:40])

        # 界面上的档案名与数据库一致
        # 注意：原型里 DEMO 是顶层 const，不是 window 的属性，只能按裸标识符取
        shown = page.evaluate("DEMO.A.name")
        check("档案名来自数据库", shown == db_name, f"ui={shown!r} db={db_name!r}")

        # 点一次「问过了」——关切清单在「长期与复诊 → 关切清单」
        page.locator('#navList a[data-page="late"]').click()
        page.wait_for_timeout(250)
        page.locator('#tabs button[data-tab="关切清单"]').click()
        page.wait_for_timeout(400)

        body = page.inner_text("body")
        check("关切文本来自数据库", db_concern["text"][:12] in body, db_concern["text"][:20])

        row = page.locator(".concern").first
        row.wait_for(timeout=5000)
        concern_id = row.get_attribute("data-id")
        con = sqlite3.connect(args.db)
        before_asked = con.execute("SELECT asked FROM concerns WHERE id=?", (concern_id,)).fetchone()[0]
        con.close()

        page.locator(f'.concern[data-id="{concern_id}"] button[data-act="asked"]').click()
        page.wait_for_timeout(1200)

        con = sqlite3.connect(args.db)
        after = con.execute("SELECT asked FROM concerns WHERE id=?", (concern_id,)).fetchone()[0]
        con.close()
        check("点一次写回磁盘", after != before_asked, f"{concern_id}: {before_asked} -> {after}")

        # 窄屏不横向溢出
        page.set_viewport_size({"width": 390, "height": 844})
        page.wait_for_timeout(400)
        overflow = page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
        check("390 宽无横向溢出", overflow <= 0, f"overflow={overflow}px")

        check("0 未捕获异常", not page_errors, "; ".join(page_errors[:2]))
        check("0 console error", not errors, "; ".join(errors[:2]))
        check("0 失败请求", not failed, "; ".join(failed[:2]))

        browser.close()

    ok = all(r[1] for r in results)
    print(f"\n{sum(1 for r in results if r[1])}/{len(results)} 通过")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
