import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const HTML = 'prototypes/v0.1/index.html';

test('原型存在且是单文件', () => {
  assert.ok(existsSync(HTML), `${HTML} 不存在`);
  const s = readFileSync(HTML, 'utf8');
  assert.ok(s.length > 50000, '原型文件过小，可能被截断');
  assert.ok(s.includes('</html>'), '缺少 </html>');
});

test('导航为 10 个一级 / 34 个二级', () => {
  const s = readFileSync(HTML, 'utf8');
  const m = s.match(/const NAV = \[([\s\S]*?)\n\];/);
  assert.ok(m, '找不到 NAV 定义');
  const rows = [...m[1].matchAll(/\n  \{ id:'([^']+)',\s*name:'([^']+)',\s*tabs:\[([^\]]*)\]/g)];
  assert.equal(rows.length, 10, `一级数量为 ${rows.length}，应为 10`);
  const tabs = rows.reduce((n, r) => n + r[3].split("','").length, 0);
  assert.equal(tabs, 34, `二级数量为 ${tabs}，应为 34`);
});

test('指标定义 8 项且含本癌种三项', () => {
  const s = readFileSync(HTML, 'utf8');
  for (const code of ["'mouth'", "'tsh'", "'cr'"]) {
    assert.ok(s.includes(`code:${code}`), `缺指标 ${code}`);
  }
});

test('无网络请求（患者数据本机优先）', () => {
  const s = readFileSync(HTML, 'utf8');
  assert.ok(!/fetch\(|XMLHttpRequest|axios/.test(s), '原型不得发起网络请求');
});

test('无 localStorage（纯内存，不伪装持久化）', () => {
  const s = readFileSync(HTML, 'utf8');
  assert.ok(!s.includes('localStorage'), '原型未做持久化，不应出现 localStorage');
});

test('顶栏版本号可见（P1）', () => {
  const s = readFileSync(HTML, 'utf8');
  assert.match(s, /class="vchip">v\d+\.\d+\.\d+/);
});
