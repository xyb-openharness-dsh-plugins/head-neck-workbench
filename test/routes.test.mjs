import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { rmSync } from 'node:fs';
import { openStore } from '../dsh/store.js';
import { createHandler, API_PREFIX } from '../dsh/server.js';

/**
 * 路由契约测试 —— 锁住三类行为：
 * 1. 写路径能真正落库并能回读（增删改）
 * 2. **约束失败必须翻成 422 + field**，不能漏成 500（否则患者看到 ERR_SQLITE_ERROR）
 * 3. UI 静态资源与 /ui 尾斜杠重定向
 *
 * 用临时 DB，不碰用户数据。
 */
const DB = '/tmp/hn-test-routes/workbench.db';

async function withServer(fn) {
  rmSync('/tmp/hn-test-routes', { recursive: true, force: true });
  const store = openStore({ path: DB });
  store.seedIfEmpty();
  const handler = createHandler(store, { version: '0.1.0', uiPrefix: `${API_PREFIX}/ui` });
  const server = createServer((req, res) => {
    handler(req, res).catch((err) => {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'handler_threw', message: String(err?.message) }));
    });
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${server.address().port}${API_PREFIX}`;
  try {
    await fn({ base, store });
  } finally {
    server.close();
    store.db.close();
  }
}

test('health 报版本与能力', async () => {
  await withServer(async ({ base }) => {
    const r = await fetch(`${base}/health`);
    assert.equal(r.status, 200);
    const b = await r.json();
    assert.equal(b.ok, true);
    assert.equal(b.version, '0.1.0');
    assert.ok(b.capabilities.includes('entities'));
  });
});

test('entities 增改删能落库并回读', async () => {
  await withServer(async ({ base }) => {
    const sid = (await (await fetch(`${base}/bootstrap`)).json()).activeSubjectId;
    const post = await fetch(`${base}/entities/concerns`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subject_id: sid, text: '测试关切', kind: '担心' }),
    });
    assert.equal(post.status, 201);
    const { row } = await post.json();
    const id = row.id;
    assert.ok(id, '新建行必须带 id');

    const patch = await fetch(`${base}/entities/concerns/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ addressed: 1 }),
    });
    assert.equal(patch.status, 200);

    const boot = await (await fetch(`${base}/bootstrap`)).json();
    assert.equal(boot.tables.concerns.find((x) => x.id === id)?.addressed, 1);

    const del = await fetch(`${base}/entities/concerns/${id}`, { method: 'DELETE' });
    assert.equal(del.status, 200);
    const boot2 = await (await fetch(`${base}/bootstrap`)).json();
    assert.ok(!boot2.tables.concerns.some((x) => x.id === id), '删除后不应再出现');
  });
});

test('CHECK 约束失败翻成 422 + field，不是 500', async () => {
  await withServer(async ({ base }) => {
    const sid = (await (await fetch(`${base}/bootstrap`)).json()).activeSubjectId;
    const r = await fetch(`${base}/entities/concerns`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subject_id: sid, text: '非法 kind', kind: 'private' }),
    });
    assert.equal(r.status, 422, '约束失败必须是 422');
    const b = await r.json();
    assert.equal(b.error, 'invalid');
    assert.equal(b.field, 'kind', '要能定位到具体字段');
    assert.ok(!String(b.message).includes('constraint failed'), '不能把 SQLite 原文抛给前端');
  });
});

test('未知表 403、改不存在的行 404', async () => {
  await withServer(async ({ base }) => {
    const sid = (await (await fetch(`${base}/bootstrap`)).json()).activeSubjectId;
    const bad = await fetch(`${base}/entities/not_a_table`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subject_id: sid }),
    });
    assert.equal(bad.status, 403);
    const missing = await fetch(`${base}/entities/concerns/no-such-id`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    assert.equal(missing.status, 404);
  });
});

test('UI 静态资源可取，/ui 无尾斜杠重定向', async () => {
  await withServer(async ({ base }) => {
    const idx = await fetch(`${base}/ui/`);
    assert.equal(idx.status, 200);
    const html = await idx.text();
    assert.ok(html.includes('live.js'), 'index.html 必须引 live.js');
    const live = await fetch(`${base}/ui/live.js`);
    assert.equal(live.status, 200);
    const origin = new URL(base).origin;
    const redirect = await fetch(`${origin}${API_PREFIX}/ui`, { redirect: 'manual' });
    assert.equal(redirect.status, 302);
  });
});
