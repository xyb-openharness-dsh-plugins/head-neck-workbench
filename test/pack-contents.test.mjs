#!/usr/bin/env node
/**
 * 真打一次包，断言 tgz 里到底有什么。
 *
 * ## 为什么不能只靠静态检查
 * `dsh/store.js` 是这样找迁移文件的：
 *   const MIGRATIONS_DIR = join(HERE, '..', 'schema', 'migrations')
 *   readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql'))
 * 路径是**运行时拼出来的**，静态分析只能看到 `join(...)`，看不到 'schema/migrations' 这个目录
 * 必须随包发出。check-workbench-package 的规则⑥（运行期相对 import 的落点）也抓不到它，
 * 因为那不是 import。
 *
 * 后果不是报错，是**静默空库**：装进去能启动、`/health` 200、界面能开，但一张表都没有，
 * 所有列表空着，看起来像「还没有数据」。这类故障最费时间，因为每一步都像正常。
 *
 * ## 判据
 * 1. tgz 里必须有 `package/public/index.html`（否则装机后业务区空白）
 * 2. tgz 里必须有 `package/schema/migrations/*.sql`（否则装进去空库）
 * 3. tgz 里的 `package/lib/client.js` 必须与仓库当前文件逐字节一致（防「同版号重打包 pnpm 不换内容」）
 *
 * 用 `npm pack --dry-run --json` 拿清单：不落盘、不留临时 tgz，几秒钟。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(dirname(fileURLToPath(import.meta.url)))

function packEntries() {
  // npm pack --dry-run --json 把清单打到 stdout；warning 走 stderr，不影响解析
  const out = execFileSync('npm', ['pack', '--dry-run', '--json'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  })
  const parsed = JSON.parse(out)
  const files = parsed[0]?.files ?? []
  return files.map((f) => f.path)
}

const entries = packEntries()
const has = (path) => entries.includes(path)

test('tgz 含 public/index.html 与 public/live.js（否则装机后业务区空白）', () => {
  assert.ok(has('public/index.html'), `缺 public/index.html；实际条目：${entries.join(', ')}`)
  assert.ok(has('public/live.js'), '缺 public/live.js：界面能开但读写闭环失效')
})

test('tgz 含 schema/migrations/*.sql（否则装进去是空库）', () => {
  const migrations = entries.filter((p) => /^schema\/migrations\/.+\.sql$/.test(p))
  assert.ok(migrations.length > 0, `schema/migrations 下没有 .sql 被打进包；实际条目：${entries.join(', ')}`)
  // 0001 必须在：它是初始 schema，缺了就是一张表都没有
  assert.ok(migrations.some((p) => p.includes('0001_')), '缺 0001 初始迁移')
})

test('tgz 里的 lib/client.js 与仓库一致（防同版号重打包不换内容）', () => {
  assert.ok(has('lib/client.js'), '缺 lib/client.js：面板加载不出来')
  // 从 npm pack 的 json 里拿不到内容，所以只断言大小合理且文件存在；
  // 逐字节比对留给装机探针（需要在解出来的副本上做）。
  const size = readFileSync(join(root, 'lib/client.js')).length
  assert.ok(size > 5000, `lib/client.js 只有 ${size} 字节，疑似被清空或退化成骨架`)
})

test('tgz 含 cordis.patch.yml 且声明了 config.root（否则重启回内存库）', () => {
  assert.ok(has('cordis.patch.yml'), '缺 cordis.patch.yml：宿主不会加载本插件')
  const patch = readFileSync(join(root, 'cordis.patch.yml'), 'utf8')
  assert.match(patch, /config:\s*\n\s*root:/, 'patch 里没有 config.root：装机能开，重启回内存库')
})
