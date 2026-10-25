/**
 * 「界面加载核验」脚本自身的测试。
 *
 * 为什么要测一个核验脚本：它是 M6 唯一能自证「宿主侧加载了」的通道，
 * 而它判错的两种方式都真实发生过——把旧日志当新证据（0.1.2 时代的
 * `did not activate` 不带时间戳，会一直留在文件里）、以及对着一个
 * 不会加载工作台的 profile 报绿灯。**闸门自己也要有反例。**
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const SCRIPT = join(ROOT, 'scripts/verify-desktop-load.mjs')
const PKG = '@xyb-community/head-neck-workbench'

/** 造一个假 harness 目录 + 假日志，返回 { harness, log, profile } */
function fixture({ running, logLines, dataDir, bundles, installed = true }) {
  const base = mkdtempSync(join(tmpdir(), 'hn-load-'))
  const harness = join(base, 'harness')
  const profile = join(harness, 'profiles/web')
  const installedDir = join(profile, 'node_modules', ...PKG.split('/'))
  mkdirSync(installedDir, { recursive: true })
  writeFileSync(join(installedDir, 'package.json'), JSON.stringify({ name: PKG, version: '9.9.9' }))
  writeFileSync(join(profile, 'package.json'), JSON.stringify({ dsh: { profile: { bundles } } }))
  if (dataDir) mkdirSync(join(harness, 'head-neck-workbench'), { recursive: true })
  mkdirSync(join(harness, '.xdpool'), { recursive: true })
  writeFileSync(join(harness, '.xdpool/startup.log'), '2026-10-25T00:47:00.000Z boot\n')
  if (!installed) throw new Error('unused')
  const log = join(base, 'harness.log')
  writeFileSync(log, logLines.join('\n') + '\n')
  return { harness, log, base }
}

const run = (harness, log) => spawnSync(process.execPath, [SCRIPT], {
  encoding: 'utf8',
  env: { ...process.env, HN_HARNESS: harness, HN_LOG: log },
})

const SIBLINGS = ['@xyb-community/bladder-workbench', '@xyb-community/melanoma-workbench', PKG]

test('未运行：harness 已退出 → 退出码 2，不冒充「激活失败」', () => {
  const { harness, log } = fixture({
    bundles: SIBLINGS,
    logLines: ['[2026-10-25T00:05:32.375Z] +1ms [node] Harness process exited (exit code 0)'],
  })
  const r = run(harness, log)
  assert.equal(r.status, 2, r.stdout + r.stderr)
  assert.match(r.stdout, /没在运行/)
})

test('旧日志不算数：退出前的 did not activate 不能报激活失败', () => {
  const { harness, log } = fixture({
    bundles: SIBLINGS,
    logLines: [
      '[renderer] @xyb-community/head-neck-workbench: failed',
      '[renderer] web boot: 1 entry did not activate',
      '[2026-10-25T00:05:32.375Z] +1ms [node] Harness process exited (exit code 0)',
    ],
  })
  const r = run(harness, log)
  assert.equal(r.status, 2, r.stdout + r.stderr)
  assert.doesNotMatch(r.stdout, /激活失败/)
})

test('本次段里的 did not activate → 退出码 1', () => {
  const { harness, log } = fixture({
    bundles: SIBLINGS,
    logLines: [
      '[2026-10-25T00:05:32.375Z] +1ms [node] Harness process exited (exit code 0)',
      '[2026-10-25T09:00:00.000Z] +800ms [renderer] web boot: 1 entry did not activate',
      '[renderer] @xyb-community/head-neck-workbench: failed',
    ],
  })
  const r = run(harness, log)
  assert.equal(r.status, 1, r.stdout + r.stderr)
  assert.match(r.stdout, /本次运行/)
})

test('装错 profile：一个兄弟工作台都没有 → 退出码 2 且点名装错', () => {
  const { harness, log } = fixture({
    bundles: ['@deepseek-ai/dsh-base'],
    logLines: [
      '[2026-10-25T00:05:32.375Z] +1ms [node] Harness process exited (exit code 0)',
      '[2026-10-25T09:00:00.000Z] +800ms [web] ready',
    ],
  })
  const r = run(harness, log)
  assert.equal(r.status, 2, r.stdout + r.stderr)
  assert.match(r.stdout, /装错了 profile/)
})

test('已加载：数据目录生成 → 退出码 0', () => {
  const { harness, log } = fixture({
    bundles: SIBLINGS,
    dataDir: true,
    logLines: [
      '[2026-10-25T00:05:32.375Z] +1ms [node] Harness process exited (exit code 0)',
      '[2026-10-25T09:00:00.000Z] +800ms [web] ready',
    ],
  })
  const r = run(harness, log)
  assert.equal(r.status, 0, r.stdout + r.stderr)
  assert.match(r.stdout, /已加载/)
})
