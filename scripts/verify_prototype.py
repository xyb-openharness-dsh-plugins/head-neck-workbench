#!/usr/bin/env python3
"""HTML 原型自检：34 个页签全量渲染 + 关键交互 + 部位驱动视图。

用法：python3 scripts/verify_prototype.py
依赖：本机 Chrome（playwright channel="chrome"），不下载浏览器。
"""
import sys, pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
FILE = (ROOT / 'prototypes/v0.1/index.html').as_uri()
results = []

def ok(name, cond, detail=''):
    results.append((name, bool(cond), detail))

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome')
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    errors = []
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))

    page.goto(FILE)
    page.wait_for_timeout(400)

    ok('页面加载无 console error', not errors, ' | '.join(errors))

    nav = page.locator('#navList a').count()
    ok('一级导航 10 项', nav == 10, f'实际 {nav}')

    tabs = page.evaluate("""() => {
      const out = [];
      for (const n of NAV) for (const t of visibleTabs(n.id)) out.push({page:n.id, tab:t});
      return out;
    }""")
    ok('二级页签合计 34 个（档案 A）', len(tabs) == 34, f'实际 {len(tabs)}')

    bad = []
    for it in tabs:
        page.evaluate("""(it) => { STATE.page = it.page; STATE.tab = it.tab; render(); }""", it)
        info = page.evaluate("""() => {
          const el = document.querySelector('#wbPage');
          return { text: (el.innerText||'').trim(), html: el.innerHTML };
        }""")
        junk = any(x in info['html'] for x in ('undefined', 'NaN', '[object Object]'))
        if len(info['text']) < 40 or junk:
            bad.append(f"{it['page']}/{it['tab']} len={len(info['text'])}" + (' JUNK' if junk else ''))
    ok('34 个页签全部有内容且无 undefined/NaN/[object Object]', not bad, ' ; '.join(bad))

    # 鼻咽路径
    npc = page.evaluate("""() => {
      const sel = document.querySelector('#prof');
      sel.value = 'B'; sel.dispatchEvent(new Event('change'));
      STATE.page='tx'; STATE.tab = visibleTabs('tx')[0]; render();
      return {
        tabs: Array.from(document.querySelectorAll('#tabs button')).map(b=>b.textContent),
        total: NAV.reduce((a,n)=>a+visibleTabs(n.id).length,0)
      };
    }""")
    ok('鼻咽档案下「手术与切除范围」隐藏', '手术与切除范围' not in npc['tabs'], '/'.join(npc['tabs']))
    ok('鼻咽档案下「放疗」置首', npc['tabs'][0] == '放疗', '/'.join(npc['tabs']))
    ok('鼻咽档案页签合计 33 个', npc['total'] == 33, f"实际 {npc['total']}")

    # 切回 A + 指标卡
    page.evaluate("""() => {
      const sel = document.querySelector('#prof');
      sel.value='A'; sel.dispatchEvent(new Event('change'));
      STATE.page='metrics'; STATE.tab='指标卡片'; render();
    }""")
    before = page.get_attribute('.metric-card', 'aria-pressed')
    page.click('.metric-card')
    after = page.get_attribute('.metric-card', 'aria-pressed')
    flipped = page.get_attribute('.metric-card', 'data-flipped')
    others = page.eval_on_selector_all('.metric-card', "els => els.slice(1).map(e=>e.getAttribute('aria-pressed'))")
    ok('指标卡翻转前 aria-pressed=false', before == 'false', str(before))
    ok('翻转后 aria-pressed=true 且 data-flipped=true', after == 'true' and flipped == 'true', f'{after}/{flipped}')
    ok('其余卡片仍为 false（单卡布尔值）', all(v == 'false' for v in others), ','.join(map(str, others)))

    # 一图秀
    page.evaluate("""() => { STATE.page='metrics'; STATE.tab='一图秀'; render(); }""")
    page.wait_for_timeout(150)
    chart = page.evaluate("""() => {
      const svg = document.querySelector('#chartHost svg');
      if (!svg) return {ok:false};
      return { ok:true,
        paths: svg.querySelectorAll('path[d]').length,
        dots: svg.querySelectorAll('circle').length,
        events: svg.querySelectorAll('rect').length,
        legend: (document.querySelector('#chartLegend').textContent||'').trim() };
    }""")
    ok('一图秀渲染曲线与数据点', chart['ok'] and chart['paths'] >= 2 and chart['dots'] >= 8, str(chart))
    ok('治疗事件不被指标窗口裁掉（档案 A 应 4 个）', chart['events'] == 4, f"实际 {chart['events']}")
    ok('一图秀图例非空', bool(chart.get('legend')), chart.get('legend', ''))

    win = page.evaluate("""() => {
      const c = () => document.querySelectorAll('#chartHost circle').length;
      const all = c();
      STATE.win='3m'; render();
      const m3 = document.querySelectorAll('#chartHost circle').length;
      STATE.win='all'; render();
      return {all, m3};
    }""")
    ok('近 3 月窗口数据点少于全部', win['m3'] < win['all'], str(win))

    # 关切清单
    page.evaluate("""() => { STATE.page='late'; STATE.tab='关切清单'; render(); }""")
    n0 = page.locator('#concernHost .concern').count()
    page.fill('#cInput', '演示：新增一条关切')
    page.click('#cAdd')
    n1 = page.locator('#concernHost .concern').count()
    ok('关切清单可新增', n1 == n0 + 1, f'{n0} → {n1}')

    # 急救卡
    page.evaluate("""() => { STATE.page='airway'; STATE.tab='堵管与脱管'; render(); }""")
    rescue = page.eval_on_selector('.rescue', 'el => el.innerText')
    ok('急救卡含「不能经口鼻呼吸」与「不要只看我的嘴」',
       '不能经口鼻呼吸' in rescue and '不要只看我的嘴' in rescue, rescue[:60].replace('\n', ' '))

    # 私密
    priv = page.evaluate("""() => {
      STATE.page='mind'; STATE.tab='说不出口的事'; render();
      return document.querySelector('#wbPage').innerText;
    }""")
    ok('私密页声明不进摘要与导出', '不进复诊摘要' in priv and '不进导出' in priv)

    # 打印样式
    printcss = page.evaluate("""() => Array.from(document.styleSheets).some(ss => {
      try { return Array.from(ss.cssRules).some(r => r.cssText && r.cssText.includes('@media print')); }
      catch { return false; }
    })""")
    ok('存在 @media print 打印样式', printcss)

    # 四条轨道不相加
    page.evaluate("""() => { STATE.page='board'; STATE.tab='四条轨道'; render(); }""")
    tracks = page.eval_on_selector('#wbPage', 'el => el.innerText')
    ok('四条轨道页写明「永远不相加」', '永远不相加' in tracks)

    # 布局：窄屏不溢出、图表滚动只在容器内、指标卡固定高度
    page.set_viewport_size({'width': 390, 'height': 844})
    page.evaluate("() => { STATE.page='board'; STATE.tab='今天要知道的'; render(); }")
    page.wait_for_timeout(200)
    doc_w = page.evaluate("() => document.documentElement.scrollWidth")
    ok('390 宽下页面无横向溢出', doc_w <= 391, f'scrollWidth={doc_w}')

    page.evaluate("() => { STATE.page='metrics'; STATE.tab='指标卡片'; render(); }")
    page.wait_for_timeout(150)
    h = page.eval_on_selector('.metric-card', 'el => Math.round(el.getBoundingClientRect().height)')
    ok('指标卡固定高度 276（不因内容撑开）', h == 276, f'实际 {h}')

    page.evaluate("() => { STATE.page='metrics'; STATE.tab='一图秀'; render(); }")
    page.wait_for_timeout(150)
    cb = page.evaluate("""() => {
      const w = document.querySelector('.chart-wrap');
      return { cw: w.clientWidth, sw: w.scrollWidth, doc: document.documentElement.scrollWidth };
    }""")
    ok('图表横向滚动只在容器内，页面不溢出',
       cb['sw'] > cb['cw'] and cb['doc'] <= 391, str(cb))

    browser.close()

passed = sum(1 for _, p, _ in results if p)
print('\n=== 自检结果 ===')
for name, p, detail in results:
    print(('PASS  ' if p else 'FAIL  ') + name + (f'  [{detail}]' if detail else ''))
print(f'\n{passed}/{len(results)} 通过')
sys.exit(0 if passed == len(results) else 1)
