/**
 * 激活烟测的自我验证：既要能在正例上签「通过」，也要能在反例上签「不通过」。
 *
 * 只有单向绿灯的闸门等于没有闸门——0.1.0–0.1.2 就是这样装进去起不来的：
 * `check-host-contract` 当时也在跑，只是它的上限比宿主宽，给了"已检查"的错觉。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, cpSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SCRIPT = join(ROOT, 'scripts', 'smoke-activate.mjs')

function run(cwd) {
  try {
    const out = execFileSync('node', [SCRIPT, cwd], { encoding: 'utf8', cwd: ROOT, stdio: 'pipe' })
    return { code: 0, out }
  } catch (error) {
    return { code: error.status ?? 1, out: `${error.stdout || ''}${error.stderr || ''}` }
  }
}

test('当前仓库的插件能在桩环境里激活，描述符通过宿主 7 条校验', () => {
  const { code, out } = run(ROOT)
  assert.equal(code, 0, out)
  assert.match(out, /apply\(\) 走通/)
  assert.match(out, /businessWidth：0\.\d+/)
})

test('反向对照：businessWidth 改成 0.72（0.1.0–0.1.2 崩 Desktop 的值）必须判失败', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hn-act-'))
  for (const sub of ['lib', 'dsh', 'package.json']) cpSync(join(ROOT, sub), join(dir, sub), { recursive: true })
  const client = join(dir, 'lib', 'client.js')
  const src = readFileSync(client, 'utf8').replace(/const BUSINESS_WIDTH = 0\.\d+/, 'const BUSINESS_WIDTH = 0.72')
  writeFileSync(client, src)
  const { code, out } = run(dir)
  assert.equal(code, 1, `应当判失败，实际退出码 ${code}：${out}`)
  assert.match(out, /between 0\.25 and 0\.7/)
})
