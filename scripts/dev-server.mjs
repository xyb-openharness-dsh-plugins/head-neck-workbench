/**
 * 本地开发服务器 —— 只为在没有 Desktop 宿主的机器上跑通「读 → 写 → 回读」。
 *
 * 它和装机后走的是同一个 createHandler / 同一份 store.js，唯一差别是：
 * 这里没有宿主的 connection.requestRejection，所以不加鉴权。
 * 因此它只监听 127.0.0.1，且**不能**当作装机验证的证据。
 *
 * 用法：node scripts/dev-server.mjs [--port 5178] [--db /tmp/x.db]
 */
import { createServer } from 'node:http'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { API_PREFIX, createHandler } from '../dsh/server.js'
import { openStore, resolveDbPath } from '../dsh/store.js'

const args = process.argv.slice(2)
const argOf = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}

const port = Number(argOf('port', process.env.PORT || 5178))
const dbPath = argOf('db', resolveDbPath() || join(mkdtempSync(join(tmpdir(), 'hn-')), 'workbench.db'))

const store = openStore({ path: dbPath, log: (m) => console.log('[store]', m) })
const handler = createHandler(
  {
    isDemo: () => store.isDemo(),
    bootstrap: (id) => store.bootstrap(id),
    seedIfEmpty: () => store.seedIfEmpty(),
    insert: (t, d, m) => store.insert(t, d, m),
    update: (t, i, p, m) => store.update(t, i, p, m),
    remove: (t, i, m) => store.remove(t, i, m),
  },
  { version: '0.1.0-dev' },
)

const server = createServer((req, res) => {
  handler(req, res)
})

server.listen(port, '127.0.0.1', () => {
  console.log(`dev server: http://127.0.0.1:${port}${API_PREFIX}/ui`)
  console.log(`db: ${dbPath}`)
})
