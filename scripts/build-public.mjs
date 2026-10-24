#!/usr/bin/env node
/**
 * 从原型生成 public/index.html。
 *
 * 为什么不手抄：public/index.html 是装机后真正被 iframe 加载的那份页面。
 * 手抄一次之后，原型改了、public 忘了改，表现是「本地预览是新的、装进去是旧的」，
 * 而且看代码完全看不出来——两份 86KB 的 HTML 没人会逐行 diff。
 *
 * 所以这里规定：public/index.html 是**生成物**，唯一来源是 prototypes/v0.1/index.html。
 * 生成规则只有一条：在 </body> 前插入 <script src="live.js"></script>，
 * 让 live.js 在原型渲染之后接管数据源。其余一个字节都不动（原型是 G2 确认的视觉合同）。
 *
 * 用法：
 *   node scripts/build-public.mjs          # 重新生成
 *   node scripts/build-public.mjs --check  # 只比对，不一致就红（进 npm run check）
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const PROTOTYPE = join(root, 'prototypes/v0.1/index.html')
const OUTPUT = join(root, 'public/index.html')
const OVERLAY = '  <script src="live.js"></script>\n'

const source = readFileSync(PROTOTYPE, 'utf8')
const marker = '</body>'
const at = source.lastIndexOf(marker)
if (at < 0) {
  console.error(`原型里找不到 ${marker}，无法确定插入位置：${PROTOTYPE}`)
  process.exit(1)
}
const generated = source.slice(0, at) + OVERLAY + source.slice(at)

const checkOnly = process.argv.includes('--check')

if (checkOnly) {
  let current = ''
  try {
    current = readFileSync(OUTPUT, 'utf8')
  } catch {
    console.error(`public/index.html 不存在：先跑 node scripts/build-public.mjs`)
    process.exit(1)
  }
  if (current === generated) {
    console.log(`public/index.html 与原型同步（${generated.length} 字节，仅多 live.js 一行）`)
  } else {
    console.error('public/index.html 与原型不一致：跑了 node scripts/build-public.mjs 之后原型又改过？')
    console.error('修法：node scripts/build-public.mjs')
    process.exit(1)
  }
} else {
  mkdirSync(join(root, 'public'), { recursive: true })
  writeFileSync(OUTPUT, generated)
  console.log(`已生成 public/index.html（${generated.length} 字节，来源 ${PROTOTYPE.replace(root + '/', '')}）`)
}
