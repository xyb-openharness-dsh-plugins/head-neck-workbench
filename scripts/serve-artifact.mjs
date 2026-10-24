#!/usr/bin/env node
/**
 * 把**装机副本**（或任意解包目录）的 UI + API 挂到一个本地端口上，供真浏览器验收。
 *
 * 与 scripts/dev-server.mjs 的区别：dev-server 服务的是**源码树**，
 * 这个服务的是**装进 Desktop 的那一份产物**——用来证明"装进去的那份能点开"，
 * 而不是"源码树能点开"。
 *
 * 只监听 127.0.0.1，仅用于本机验收，**不能当装机证据**。
 *
 * 用法：
 *   node scripts/serve-artifact.mjs [--port 5188] [--db /tmp/x.db] [包目录]
 */
import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { homedir } from 'node:os'

const argv = process.argv.slice(2)
const opt = (name, dflt) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 ? argv[i + 1] : dflt
}
// 位置参数 = 包目录（可省略）。跳过 --flag 及其取值。
const positional = []
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) { i++; continue }
  positional.push(argv[i])
}
const pkgDir = resolve(
  positional[0] ||
    resolve(homedir(), 'Library/Application Support/dsh-desktop/harness/profiles/web/node_modules/@xyb-community/head-neck-workbench'),
)
const port = Number(opt('port', 5188))
const db = opt('db', '/tmp/hn-artifact.db')

const { createHandler, API_PREFIX } = await import(resolve(pkgDir, 'dsh/server.js'))
const { openStore } = await import(resolve(pkgDir, 'dsh/store.js'))

const store = openStore({ path: db })
const seeded = store.seedIfEmpty()
const handler = createHandler(store, { version: '0.1.0', uiPrefix: `${API_PREFIX}/ui` })

const server = createServer((req, res) => {
  handler(req, res).catch((err) => {
    res.writeHead(500, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: 'handler_threw', message: String(err?.message) }))
  })
})
server.listen(port, '127.0.0.1', () => {
  console.log(`产物服务：http://127.0.0.1:${port}${API_PREFIX}/ui/`)
  console.log(`包目录：${pkgDir}`)
  console.log(`数据库：${db}${seeded.seeded ? '（已灌演示数据）' : '（已有数据）'}`)
})
