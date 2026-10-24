#!/usr/bin/env node
/**
 * 校验 lib/client.js 里的外壳常量与 lib/layout.js 一致。
 *
 * 为什么需要这个检查：customFrame 外壳的宽度、会话区间、窄屏阈值在两边都要用到。
 * lib/layout.js 是宿主读的唯一来源，lib/client.js 是客户端渲染用的字面量。
 * 两边各写一份、改一处忘一处，表现是「顶栏按钮说会话能拖，拖了没反应」这种
 * 只能靠肉眼发现的错。所以这里不做「生成」，只做「对账」：不一致就红。
 *
 * 用法：node scripts/check-client-constants.mjs
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { PANEL, AGENT_PANE, TOP_BAR_HEIGHT } from '../lib/layout.js'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const source = readFileSync(join(root, 'lib/client.js'), 'utf8')

/** 从 client.js 里取 `const NAME = <literal>` 的值 */
function literal(name) {
  const match = source.match(new RegExp(`const\\s+${name}\\s*=\\s*([^\\n]+)`))
  if (!match) return { ok: false, why: `client.js 里找不到常量 ${name}` }
  const raw = match[1].trim().replace(/;$/, '')
  if (/^['"]/.test(raw)) return { ok: true, value: raw.slice(1, -1) }
  if (/^(true|false)$/.test(raw)) return { ok: true, value: raw === 'true' }
  const num = Number(raw)
  if (Number.isFinite(num)) return { ok: true, value: num }
  return { ok: false, why: `${name} 不是可比较的字面量：${raw}` }
}

const checks = [
  ['BUSINESS_SIDE', PANEL.businessSide],
  ['BUSINESS_WIDTH', PANEL.businessWidth],
  ['CUSTOM_FRAME', PANEL.customFrame],
  ['NARROW_BELOW', PANEL.collapseBelow],
  // layout.js 用百分比整数（25/45/32），client.js 用比例小数（0.25/0.45/0.32）
  ['AGENT_MIN', AGENT_PANE.min / 100],
  ['AGENT_MAX', AGENT_PANE.max / 100],
  ['AGENT_DEFAULT', AGENT_PANE.default / 100],
]

let failed = 0
for (const [name, expected] of checks) {
  const got = literal(name)
  if (!got.ok) {
    failed += 1
    console.error(`FAIL ${name}: ${got.why}`)
    continue
  }
  // 浮点比较：0.32 这种值两边各自算出来可能有 1e-17 的差
  const same =
    typeof expected === 'number' && typeof got.value === 'number'
      ? Math.abs(expected - got.value) < 1e-9
      : expected === got.value
  if (same) {
    console.log(`ok   ${name} = ${got.value}（layout.js: ${expected}）`)
  } else {
    failed += 1
    console.error(`FAIL ${name}: client.js = ${got.value}，layout.js = ${expected}`)
  }
}

// TOP_BAR_HEIGHT 目前只有宿主侧读，外壳不写死高度（用 flex 自适应）。
// 这里只做存在性提示，不判失败——避免为了「一致」而把外壳逼成固定高度。
if (source.includes('TOP_BAR_HEIGHT')) {
  console.log(`note TOP_BAR_HEIGHT = ${TOP_BAR_HEIGHT}（外壳不写死高度，用 flex 自适应）`)
} else {
  console.log(`note TOP_BAR_HEIGHT = ${TOP_BAR_HEIGHT}（外壳未引用，符合预期：高度靠 flex）`)
}

if (failed) {
  console.error(`\n${failed} 项不一致：先改 lib/layout.js，再同步 lib/client.js`)
  process.exit(1)
}
console.log('\n全部一致')
