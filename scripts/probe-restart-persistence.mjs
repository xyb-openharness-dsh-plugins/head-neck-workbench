#!/usr/bin/env node
/**
 * 重启不丢数据探针 —— 对**打包产物**验，不是对源码树验。
 *
 * ## 为什么必须对产物验
 * 源码树里 `schema/migrations/` 永远在，本地怎么跑都建得出表。
 * 装进宿主才发现 `files` 白名单没带上它，或者 `cordis.patch.yml` 没注入 `config.root`
 * 导致每次重启回到内存库——这两种故障都不会在 `npm run check` 里显形。
 *
 * ## 判据（两轮，模拟一次重启）
 * 1. 首次开库建出表（漏发迁移会直接抛错或建 0 张）
 * 2. `seedIfEmpty()` 灌演示主体
 * 3. CHECK 约束真的拦得住非法值
 * 4. 写一条 → 关闭连接 → **同一 DB 路径重新开库** → 数据仍在
 *
 * 用法：
 *   tar -xzf release/*.tgz -C /tmp/hn-tgz-probe
 *   node scripts/probe-restart-persistence.mjs [解包目录]
 * 默认读 /tmp/hn-tgz-probe/package。
 */
import { rmSync } from 'node:fs'
import { resolve } from 'node:path'

const pkgDir = resolve(process.argv[2] || '/tmp/hn-tgz-probe/package')
const { openStore } = await import(resolve(pkgDir, 'dsh/store.js'))

const DB = '/tmp/hn-db-probe/workbench.db'
rmSync('/tmp/hn-db-probe', { recursive: true, force: true })

let failed = false
const ok = (cond, label, extra = '') => {
  console.log(`  ${cond ? '✓' : '✗'} ${label}${extra ? '  ' + extra : ''}`)
  if (!cond) failed = true
}

console.log('【第一轮】首次开库 + 种子 + 写一条关切')
const s1 = openStore({ path: DB })
const tables = s1.db.prepare("SELECT count(*) n FROM sqlite_master WHERE type='table'").get().n
ok(tables > 0, `建表 ${tables} 张（0 张 = 迁移没随包发出）`)

const seeded = s1.seedIfEmpty()
ok(Boolean(seeded.seeded), '演示种子写入', JSON.stringify(seeded).slice(0, 100))

const sid = seeded.subject
const before = (s1.bootstrap(sid)?.tables?.concerns || []).length

// CHECK 约束：故意用非法 kind，必须被拒
let constraintWorks = false
try {
  s1.insert('concerns', { subject_id: sid, text: '非法值探针', kind: 'private' })
} catch {
  constraintWorks = true
}
ok(constraintWorks, 'CHECK 约束拦住了非法 kind（写不进去才对）')

s1.insert('concerns', { subject_id: sid, text: '重启探针写入', kind: '担心' })
const afterWrite = (s1.bootstrap(sid)?.tables?.concerns || []).length
ok(afterWrite === before + 1, `写入后关切数 ${before} → ${afterWrite}`)
s1.db.close()

console.log('【第二轮】同一 DB 路径重新开库（模拟重启）')
const s2 = openStore({ path: DB })
const boot2 = s2.bootstrap(sid)
const after = (boot2?.tables?.concerns || []).length
const hit = (boot2?.tables?.concerns || []).some((x) => x.text === '重启探针写入')
ok(after === afterWrite, `重启后关切数 ${after}`)
ok(hit, '重启后仍能读到刚写的那条')
s2.db.close()

console.log(failed ? '\nFAIL —— 见上面 ✗ 项' : '\nPASS —— 重启不丢数据')
process.exit(failed ? 1 : 0)
