/**
 * DSH Desktop 宿主插件入口。
 *
 * 这里只做四件事，业务全在 server.js / store.js：
 *   1) 把数据目录定下来（Config.root，缺省 ~/.head-neck-workbench）；
 *   2) 起一个 Store（打开即应用迁移）；
 *   3) 用一个 prefix 路由把 /api/head-neck-workbench 整棵子树交给 createHandler，
 *      顺带把界面文件挂在 /api/head-neck-workbench/ui；
 *   4) 每个请求先过宿主的 connection.requestRejection —— 鉴权不通过就不进业务。
 *
 * 为什么是 prefix 而不是逐个 exact：家族里踩过「本地能开、装机 404」的坑，
 * 逐个注册只要漏一条就 404。prefix 一条覆盖，路由表只存在 server.js 一处。
 */
import Schema from '@deepseek-ai/schemastery'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { API_PREFIX, createHandler } from './server.js'
import { openStore, resolveDbPath } from './store.js'

export const name = 'head-neck-workbench-main'
export const inject = ['webServer', 'connection']

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

export const Config = Schema.object({
  root: Schema.string()
    .default('')
    .description('数据目录；留空用 ~/.head-neck-workbench。数据库文件是该目录下的 workbench.db'),
})

export function apply(ctx, config = {}) {
  if (!ctx.webServer?.register) throw new Error('Desktop webServer.register is unavailable')

  const root = config.root && config.root.trim() ? config.root.trim() : join(homedir(), '.head-neck-workbench')
  const dbPath = resolveDbPath() || join(root, 'workbench.db')

  let store = null
  const getStore = () => {
    if (!store) store = openStore({ path: dbPath, log: (m) => console.log('[head-neck-workbench]', m) })
    return store
  }

  const handler = createHandler(
    {
      isDemo: () => getStore().isDemo(),
      bootstrap: (id) => getStore().bootstrap(id),
      seedIfEmpty: () => getStore().seedIfEmpty(),
      insert: (table, data, meta) => getStore().insert(table, data, meta),
      update: (table, id, patch, meta) => getStore().update(table, id, patch, meta),
      remove: (table, id, meta) => getStore().remove(table, id, meta),
    },
    { version: manifest.version },
  )

  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: API_PREFIX,
    handler(req, res) {
      // 鉴权先于一切业务：宿主的会话鉴权没通过，连静态界面都不给
      if (typeof ctx.connection?.requestRejection === 'function') {
        const rejection = ctx.connection.requestRejection(req)
        if (rejection !== undefined) {
          res.writeHead(rejection, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
          return res.end(JSON.stringify({ error: 'authentication_required', message: '需要宿主会话鉴权' }))
        }
      }
      return handler(req, res)
    },
  }), 'head-neck-workbench api')

  ctx.effect(() => () => {
    if (store) {
      store.close()
      store = null
    }
  }, 'head-neck-workbench store')
}
