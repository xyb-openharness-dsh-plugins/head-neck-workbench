#!/usr/bin/env node
/**
 * 从原型生成 public/index.html，并同步原型依赖的 primer 三件套。
 *
 * 为什么不手抄：public/index.html 是装机后真正被 iframe 加载的那份页面。
 * 手抄一次之后，原型改了、public 忘了改，表现是「本地预览是新的、装进去是旧的」，
 * 而且看代码完全看不出来——两份 86KB 的 HTML 没人会逐行 diff。
 *
 * 所以这里规定：public/ 里的页面与 primer 三件套都是**生成物**，
 * 唯一来源是 prototypes/v0.1/。生成规则：
 *   1. index.html：在 </body> 前插入 <script src="live.js"></script>，
 *      让 live.js 在原型渲染之后接管数据源；其余一个字节都不动（原型是 G2 确认的视觉合同）。
 *   2. primer.css / primer-data.js / primer.js：逐字节复制。
 *      三者是原型里 <link>/<script> 的相对引用；只生成 index.html 不复制它们，
 *      装机后业务区会因 404 丢掉「?」入口（36 号 §3.2）。
 *
 * 用法：
 *   node scripts/build-public.mjs          # 重新生成
 *   node scripts/build-public.mjs --check  # 只比对，不一致就红（进 npm run check）
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const PROTOTYPE_DIR = join(root, 'prototypes/v0.1')
const PROTOTYPE = join(PROTOTYPE_DIR, 'index.html')
const OUTPUT = join(root, 'public/index.html')
const OVERLAY = '  <script src="live.js"></script>\n'
/* 原型页面里以相对路径引用的依赖：public/ 必须同名存在 */
const COPIES = ['primer.css', 'primer-data.js', 'primer.js']

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
  const problems = []
  let current = ''
  try {
    current = readFileSync(OUTPUT, 'utf8')
  } catch {
    problems.push('public/index.html 不存在')
  }
  if (current && current !== generated) problems.push('public/index.html 与原型不一致')
  for (const name of COPIES) {
    try {
      if (readFileSync(join(root, 'public', name), 'utf8') !== readFileSync(join(PROTOTYPE_DIR, name), 'utf8')) {
        problems.push(`public/${name} 与原型不一致`)
      }
    } catch {
      problems.push(`public/${name} 缺失`)
    }
  }
  if (problems.length) {
    console.error('public/ 与原型不同源：')
    for (const p of problems) console.error('  ✗ ' + p)
    console.error('修法：node scripts/build-public.mjs')
    process.exit(1)
  }
  console.log(`public/ 与原型同步（index.html ${generated.length} 字节，仅多 live.js 一行；primer 三件套逐字节一致）`)
} else {
  mkdirSync(join(root, 'public'), { recursive: true })
  writeFileSync(OUTPUT, generated)
  for (const name of COPIES) {
    writeFileSync(join(root, 'public', name), readFileSync(join(PROTOTYPE_DIR, name)))
  }
  console.log(`已生成 public/index.html（${generated.length} 字节，来源 ${PROTOTYPE.replace(root + '/', '')}）`)
  console.log(`已同步 public/：${COPIES.join('、')}`)
}
