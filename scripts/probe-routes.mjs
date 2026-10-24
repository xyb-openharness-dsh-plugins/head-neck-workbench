#!/usr/bin/env node
/**
 * 路由探针 —— 对**装机副本**（或任意解包目录）把 7 组路由真跑一遍。
 *
 * ## 为什么要有它
 * `curl` 装机副本的 `/api/...` 会一律得到 401（宿主有全局鉴权），所以
 * 「装进去了」和「装进去能干活」是两件事，前者已被 diff -r 证明，后者一直没证据。
 * 这个探针直接拿装机副本的 `createHandler` 起一个只监听 127.0.0.1 的临时服务，
 * 绕开宿主鉴权，把每组路由的成功路径和错误路径都走一遍。
 *
 * 注意：这证明的是「产物代码在真实 HTTP 下可用」，**不等于**宿主界面加载成功。
 *
 * 用法：
 *   node scripts/probe-routes.mjs [解包目录或装机目录]
 * 默认读装机副本。
 */
import { createServer } from 'node:http'
import { rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { homedir } from 'node:os'

const pkgDir = resolve(
  process.argv[2] ||
    resolve(homedir(), 'Library/Application Support/dsh-desktop/harness/profiles/web/node_modules/@xyb-community/head-neck-workbench'),
)
const { createHandler, API_PREFIX } = await import(resolve(pkgDir, 'dsh/server.js'))
const { openStore } = await import(resolve(pkgDir, 'dsh/store.js'))

const DB = '/tmp/hn-db-routes/workbench.db'
rmSync('/tmp/hn-db-routes', { recursive: true, force: true })

const store = openStore({ path: DB })
store.seedIfEmpty()

const handler = createHandler(store, { version: '0.1.0', uiPrefix: `${API_PREFIX}/ui` })
const server = createServer((req, res) => {
  handler(req, res).catch((err) => {
    res.writeHead(500, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: 'handler_threw', message: String(err && err.message) }))
  })
})
await new Promise((ok) => server.listen(0, '127.0.0.1', ok))
const base = `http://127.0.0.1:${server.address().port}${API_PREFIX}`

let failed = 0
const check = (cond, label, extra = '') => {
  console.log(`  ${cond ? '✓' : '✗'} ${label}${extra ? '  ' + extra : ''}`)
  if (!cond) failed++
}
const call = async (path, init) => {
  const res = await fetch(base + path, init)
  const text = await res.text()
  let body = null
  try { body = JSON.parse(text) } catch { body = text }
  return { status: res.status, body, headers: res.headers }
}

console.log(`目标产物：${pkgDir}\n临时服务：${base}\n`)

console.log('【① health】')
{
  const r = await call('/health')
  check(r.status === 200, 'GET /health → 200', `status=${r.status}`)
  check(r.body?.ok === true, 'ok:true')
  check(r.body?.version === '0.1.0', `version=${r.body?.version}`)
  check(Array.isArray(r.body?.capabilities) && r.body.capabilities.length >= 4, `capabilities=${JSON.stringify(r.body?.capabilities)}`)
}

console.log('【② bootstrap】')
let sid = null
{
  const r = await call('/bootstrap')
  check(r.status === 200, 'GET /bootstrap → 200')
  check(Object.keys(r.body?.tables || {}).length > 30, `tables 组数=${Object.keys(r.body?.tables || {}).length}`)
  check((r.body?.tables?.concerns || []).length > 0, `演示关切=${(r.body?.tables?.concerns || []).length}`)
  check(Array.isArray(r.body?.metrics) && r.body.metrics.length === 8, `指标=${r.body?.metrics?.length}`)
  sid = r.body?.activeSubjectId
  check(Boolean(sid), `activeSubjectId=${sid}`)
}

console.log('【③ subjects 写路径】')
{
  const created = await call('/subjects', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ display_name: '路由探针主体', primary_site: '口腔', sex: '男', birth_year: 1970 }),
  })
  check(created.status === 200 || created.status === 201, `POST /subjects → ${created.status}`)
  const newId = created.body?.id || created.body?.row?.id
  check(Boolean(newId), `新主体 id=${newId}`)
  if (newId) {
    const patched = await call(`/subjects/${newId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ primary_site: '口咽' }),
    })
    check(patched.status === 200, `PATCH /subjects/:id → ${patched.status}`)
    const after = await call('/bootstrap?subject=' + encodeURIComponent(newId))
    check(after.body?.subject?.primary_site === '口咽', `改后回读 primary_site=${after.body?.subject?.primary_site}`)
  }
}

console.log('【④ entities 增删改】')
{
  const post = await call('/entities/concerns', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ subject_id: sid, text: '路由探针关切', kind: '担心' }),
  })
  check(post.status === 200 || post.status === 201, `POST /entities/concerns → ${post.status}`)
  const id = post.body?.id || post.body?.row?.id
  check(Boolean(id), `关切 id=${id}`)

  const patch = await call(`/entities/concerns/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ addressed: 1 }),
  })
  check(patch.status === 200, `PATCH /entities/concerns/:id → ${patch.status}`)

  const boot = await call('/bootstrap')
  const row = (boot.body?.tables?.concerns || []).find((x) => x.id === id)
  check(row?.addressed === 1, `回读 addressed=${row?.addressed}`)

  const del = await call(`/entities/concerns/${id}`, { method: 'DELETE' })
  check(del.status === 200, `DELETE /entities/concerns/:id → ${del.status}`)
  const boot2 = await call('/bootstrap')
  check(!(boot2.body?.tables?.concerns || []).some((x) => x.id === id), '删除后回读确实没了')
}

console.log('【⑤ 错误路径（必须报错而不是静默成功）】')
{
  const bad = await call('/entities/concerns', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ subject_id: sid, text: '非法 kind', kind: 'private' }),
  })
  check(bad.status === 422, `非法 kind → ${bad.status}（应 422 而非 500）`)
  check(bad.body?.error === 'invalid', `错误体 error=${bad.body?.error}`)
  check(bad.body?.field === 'kind', `错误体能定位到字段 field=${bad.body?.field}`)

  const badTable = await call('/entities/not_a_table', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ subject_id: sid }),
  })
  check(badTable.status >= 400, `未知表 → ${badTable.status}（应 4xx）`)

  const missing = await call('/entities/concerns/no-such-id', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: '{}' })
  check(missing.status >= 400, `改不存在的行 → ${missing.status}（应 4xx）`)
}

console.log('【⑥ export】')
{
  const j = await call('/export?format=json')
  check(j.status === 200, `GET /export?format=json → ${j.status}`)
  check(typeof j.body === 'object' && j.body !== null, 'JSON 可解析')
  const m = await call('/export?format=md')
  check(m.status === 200, `GET /export?format=md → ${m.status}`)
  check(typeof m.body === 'string' && m.body.includes('演示'), 'Markdown 含演示标注')
}

console.log('【⑦ ui 静态资源】')
{
  const idx = await call('/ui/')
  check(idx.status === 200, `GET /ui/ → ${idx.status}`)
  check(typeof idx.body === 'string' && idx.body.includes('live.js'), 'index.html 引了 live.js')
  const navCount = (String(idx.body).match(/\{ id:'/g) || []).length
  check(navCount >= 10, `服务出的 HTML 里 NAV 一级项=${navCount}`)
  const live = await call('/ui/live.js')
  check(live.status === 200, `GET /ui/live.js → ${live.status}`)
  const redirect = await fetch(`http://127.0.0.1:${server.address().port}${API_PREFIX}/ui`, { redirect: 'manual' })
  check(redirect.status === 302, `/ui（无尾斜杠）→ ${redirect.status}（应 302）`)
}

console.log('【⑧ 前缀归一化】')
{
  // handler 收到不带前缀的 url 也应能工作（宿主可能已剥掉）
  const bare = await fetch(`http://127.0.0.1:${server.address().port}/health`)
  check(bare.status === 200, `不带前缀 GET /health → ${bare.status}`)
}

server.close()
store.db.close()
console.log(failed ? `\nFAIL —— ${failed} 项未过` : '\nPASS —— 7 组路由在产物上可用')
process.exit(failed ? 1 : 0)
