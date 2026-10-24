import pathlib, json
from playwright.sync_api import sync_playwright
FILE = pathlib.Path('/Users/qinxiaoqiang/Downloads/head-neck-workbench/prototypes/v0.1/index.html').as_uri()
R = {}
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome')
    pg = b.new_page(viewport={'width':1440,'height':1000})
    pg.goto(FILE); pg.wait_for_timeout(300)
    pg.evaluate("() => { STATE.page='metrics'; STATE.tab='一图秀'; render(); }")
    pg.wait_for_timeout(300)
    R['buttons'] = pg.evaluate("() => Array.from(document.querySelectorAll('#wbPage button')).map(b=>b.textContent.trim())")

    # C1 量纲差异大的两指标都占满纵向区：weight(kg 62) vs mouth(mm 33)
    R['C1'] = pg.evaluate("""() => {
      STATE.chartCodes=['weight','mouth']; mountChart();
      const ps=[...document.querySelectorAll('#chartHost path')];
      const hs=ps.map(p=>{const b=p.getBBox();return +b.height.toFixed(1)});
      return {paths:hs, maxDiff: hs.length>1 ? +Math.abs(hs[0]-hs[1]).toFixed(1) : null};
    }""")
    # C2 单点不连线：mouth 只给一个点
    R['C2'] = pg.evaluate("""() => {
      const s=SUBJ(); const saved=JSON.parse(JSON.stringify(s.obs));
      s.obs = saved.filter(o=>o.code!=='mouth').concat(saved.filter(o=>o.code==='mouth').slice(0,1));
      STATE.chartCodes=['mouth']; mountChart();
      const r={paths:document.querySelectorAll('#chartHost path').length,
               dots:document.querySelectorAll('#chartHost circle').length};
      s.obs = saved; STATE.chartCodes=['weight','alb','hb']; mountChart();
      return r;
    }""")
    # C3 空窗口空态
    R['C3'] = pg.evaluate("""() => {
      const before = document.querySelector('#chartHost').innerHTML;
      STATE.chartCodes=['__none__']; mountChart();
      const hasEmpty = !!document.querySelector('#chartHost .empty');
      const txt = (document.querySelector('#chartHost .empty')||{}).textContent || '';
      STATE.chartCodes=['weight','alb','hb']; mountChart();
      return {hasEmpty, txt};
    }""")
    # C5 每序列一个末点标签 + C6 标签不越界
    R['C56'] = pg.evaluate("""() => {
      STATE.chartCodes=['weight','alb','hb']; mountChart();
      const svg=document.querySelector('#chartHost svg');
      const vb=svg.getAttribute('viewBox').split(' ').map(Number);
      const texts=[...svg.querySelectorAll('text')].map(t=>{const b=t.getBBox();return {x:+b.x.toFixed(1),y:+b.y.toFixed(1),w:+b.width.toFixed(1),h:+b.height.toFixed(1),t:t.textContent}});
      const numeric=texts.filter(t=>/^\\d+(\\.\\d+)?$/.test(t.t.trim()));
      const out=texts.filter(t=> t.x<0 || t.y<0 || t.x+t.w>vb[2] || t.y+t.h>vb[3]);
      return {series:3, numericLabels:numeric.length, outOfBounds:out.length, texts:texts.length};
    }""")
    # C7 变化文案带单位
    R['C7'] = pg.evaluate("""() => {
      STATE.page='metrics'; STATE.tab='指标卡片'; render();
      const d=[...document.querySelectorAll('.mc-delta')].map(e=>e.textContent.trim());
      const withUnit=d.filter(t=> /(kg|g\\/L|μmol\\/L|mIU\\/L|mm|10⁹\\/L)/.test(t));
      const pct=d.filter(t=> /%/.test(t));
      return {total:d.length, withUnit:withUnit.length, pct:pct.length, sample:d.slice(0,3)};
    }""")
    # C8 时间窗联动
    R['C8'] = pg.evaluate("""() => {
      STATE.page='metrics'; STATE.tab='一图秀'; STATE.win='all'; render();
      const all={tick:(document.querySelector('#chartHost svg text')||{}).textContent,
                 dots:document.querySelectorAll('#chartHost circle').length};
      STATE.win='3m'; render();
      const m3={tick:(document.querySelector('#chartHost svg text')||{}).textContent,
                dots:document.querySelectorAll('#chartHost circle').length};
      STATE.win='all'; render();
      return {all,m3};
    }""")
    # C10 减少动效
    pg.emulate_media(reduced_motion='reduce'); pg.wait_for_timeout(100)
    R['C10'] = pg.evaluate("""() => {
      const p=document.querySelector('#chartHost path');
      if(!p) return {visible:false};
      const cs=getComputedStyle(p);
      return {visible:true, dash:cs.strokeDasharray, opacity:cs.opacity};
    }""")
    # C11/C12 翻转不位移 + 状态独立
    R['C11'] = pg.evaluate("""() => {
      STATE.page='metrics'; STATE.tab='指标卡片'; render();
      const c=document.querySelector('.metric-card');
      const b0=c.getBoundingClientRect();
      return {x:+b0.x.toFixed(2), y:+b0.y.toFixed(2), w:+b0.width.toFixed(2), h:+b0.height.toFixed(2),
              aria0:c.getAttribute('aria-pressed'), flipped0:c.dataset.flipped};
    }""")
    pg.click('.metric-card'); pg.wait_for_timeout(500)
    R['C11b'] = pg.evaluate("""() => {
      const c=document.querySelector('.metric-card');
      const b0=c.getBoundingClientRect();
      const all=[...document.querySelectorAll('.metric-card')].map(x=>x.getAttribute('aria-pressed'));
      return {x:+b0.x.toFixed(2), y:+b0.y.toFixed(2), w:+b0.width.toFixed(2), h:+b0.height.toFixed(2),
              aria1:c.getAttribute('aria-pressed'), flipped1:c.dataset.flipped, allPressed:all};
    }""")
    R['cardCount'] = pg.evaluate("() => document.querySelectorAll('.metric-card').length")
    b.close()
print(json.dumps(R, ensure_ascii=False, indent=1))
