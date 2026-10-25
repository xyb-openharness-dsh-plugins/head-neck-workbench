#!/usr/bin/env node
/**
 * 宿主注册契约自查（本地闸门）。
 *
 * 为什么需要它：`desktopWorkbenches.register()` 在**渲染进程**里校验描述符，
 * 不合格就 throw → 插件 apply 失败 → 宿主只报一句
 *   `web boot: 1 entry did not activate` + `<包名>: failed`
 * 不告诉你哪条不合格。而失败发生在**装进 Desktop 之后**，本地怎么跑都看不出问题。
 * 2026-10-25 就是这样：businessWidth 写了脚手架默认的 0.72，宿主硬上限是 0.7，
 * 装进去后 DSH Desktop 直接起不来，靠 plugin-recovery 自动卸载才恢复。
 *
 * 这里把宿主那几条校验原地复刻（见 dsh-desktop-workbenches/client.js 的 register()），
 * 让它变成 `npm run check` 的一部分。规则若在宿主侧变化，要回来同步这份。
 */
import { readFileSync } from 'node:fs'
import { PANEL, AGENT_PANE } from '../lib/layout.js'

const CLIENT = 'lib/client.js'
const src = readFileSync(CLIENT, 'utf8')
const problems = []
const notes = []

/** 取 `const NAME = <literal>` 的字面量（字符串/数字/布尔） */
function literal(name) {
  const m = src.match(new RegExp(`const ${name}\\s*=\\s*(['"]?)([\\w./:@-]+)\\1\\s*(?://.*)?$`, 'm'))
  return m ? m[2] : undefined
}

// ---- 1. register() 必须真的被调用，且第二个参数是组件 ----
if (!/desktopWorkbenches\s*\.\s*register\s*\(/.test(src)) problems.push('client.js 里没有调用 desktopWorkbenches.register()')

// ---- 2. title / panelTitle 非空（宿主校验 `!descriptor.title` → Invalid workbench registration）----
const meta = src.match(/const metadata = \{([\s\S]*?)\n\s*\}/)
if (!meta) problems.push('找不到 metadata 描述符')
else {
  for (const key of ['title', 'panelTitle']) {
    if (!new RegExp(`${key}\\s*:\\s*['"\`][^'"\`]+`).test(meta[1])) problems.push(`metadata.${key} 为空（宿主会拒绝注册）`)
  }
}

// ---- 3. repository 必须是 GitHub URL（宿主 repositoryIdentity 的正则）----
const repo = literal('REPOSITORY') ?? (src.match(/repository\s*:\s*['"]([^'"]+)['"]/)?.[1])
if (repo) {
  if (!/^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+?(?:\.git)?\/?$/i.test(repo)) {
    problems.push(`repository 不是合法 GitHub URL：${repo}`)
  }
} else notes.push('client.js 里没写 repository（宿主允许省略，但市场识别会退化）')

// ---- 4. customFrame 必须是 boolean ----
const cf = src.match(/const CUSTOM_FRAME\s*=\s*(true|false)/)
if (!cf) problems.push('CUSTOM_FRAME 不是 true/false 字面量（宿主：Invalid custom frame flag）')

// ---- 5. businessSide ∈ {left,right} ----
const side = literal('BUSINESS_SIDE') ?? PANEL.businessSide
if (!['left', 'right'].includes(side)) problems.push(`businessSide 必须是 left/right，当前 ${side}`)

// ---- 6. businessWidth ∈ [0.25, 0.7] —— 就是这条让 Desktop 起不来的 ----
const widthLiteral = src.match(/const BUSINESS_WIDTH\s*=\s*([\d.]+)/)
const width = widthLiteral ? Number(widthLiteral[1]) : PANEL.businessWidth
if (!Number.isFinite(width)) problems.push('businessWidth 不是有限数')
else if (width < 0.25 || width > 0.7) {
  problems.push(
    `businessWidth=${width} 超出宿主硬区间 [0.25, 0.7]\n` +
    `    宿主原文：Workbench business width must be between 0.25 and 0.7\n` +
    `    这条不合格会让插件 apply 抛错 → Desktop 报 "1 entry did not activate" 并可能起不来`,
  )
}
// 业务区 + 会话区不应超过整宽
const agentDefault = Number(src.match(/const AGENT_DEFAULT\s*=\s*([\d.]+)/)?.[1] ?? AGENT_PANE.default / 100)
if (Number.isFinite(agentDefault) && width + agentDefault > 1.0000001) {
  problems.push(`businessWidth(${width}) + 会话默认占比(${agentDefault}) = ${(width + agentDefault).toFixed(2)} > 1，两者会互相挤压`)
}

// ---- 7. headerLayout 若出现，只能是 default/compact ----
const hl = src.match(/headerLayout\s*:\s*['"]([^'"]+)['"]/)?.[1]
if (hl && !['default', 'compact'].includes(hl)) problems.push(`headerLayout 只能是 default/compact，当前 ${hl}`)

// ---- 输出 ----
console.log(`宿主注册契约自查（${CLIENT} + lib/layout.js）`)
console.log(`  title/panelTitle · repository · customFrame · businessSide=${side} · businessWidth=${width}`)
for (const n of notes) console.log(`  · ${n}`)
if (problems.length) {
  console.error(`\n✗ ${problems.length} 条不合格——这份包装进 Desktop 后会激活失败：`)
  for (const p of problems) console.error(`  - ${p}`)
  process.exit(1)
}
console.log(`\n✓ 全部符合宿主 register() 校验（${7 - notes.length}/7 条可判项通过）`)
