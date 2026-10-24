/**
 * 路由表 —— 只有一个来源。
 *
 * 为什么单独一个文件：本地 dev-server（scripts/dev-server.mjs）与装进 Desktop 后的宿主
 * 用的是同一份 handler。家族里踩过「本地能开、装机 404」的坑，根因就是两套路由各写一遍。
 *
 * 约定：
 *   - 前缀 `/api/head-neck-workbench`。handler 收到的 url 可能带也可能不带前缀
 *     （取决于宿主是否已剥掉），这里统一归一化，不靠调用方保证。
 *   - 所有写操作走 Store 的列白名单，不拼自由 SQL。
 *   - 错误返回 { error, message, field? }，界面据此定位到具体输入框。
 */
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

export const API_PREFIX = '/api/head-neck-workbench'
const PUBLIC_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
}

function sendJson(res, status, body) {
  const text = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(text),
  })
  res.end(text)
}

function readBody(req, limit = 2 * 1024 * 1024) {
  return new Promise((ok, fail) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        fail(Object.assign(new Error('请求体过大'), { status: 413 }))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw) return ok({})
      try {
        ok(JSON.parse(raw))
      } catch {
        fail(Object.assign(new Error('请求体不是合法 JSON'), { status: 400 }))
      }
    })
    req.on('error', fail)
  })
}

/** 把 url 归一化成去掉前缀的 pathname。 */
function pathOf(url) {
  const raw = url || '/'
  const path = raw.split('?')[0]
  if (path.startsWith(API_PREFIX)) return path.slice(API_PREFIX.length) || '/'
  return path
}

function queryOf(url) {
  const qs = (url || '').split('?')[1] || ''
  return Object.fromEntries(new URLSearchParams(qs))
}

function serveStatic(res, relPath) {
  const target = normalize(join(PUBLIC_DIR, relPath))
  if (!target.startsWith(PUBLIC_DIR) || !existsSync(target) || !statSync(target).isFile()) return false
  res.writeHead(200, {
    'content-type': MIME[extname(target)] || 'application/octet-stream',
    'cache-control': 'no-cache',
  })
  createReadStream(target).pipe(res)
  return true
}

/* ---------------- 导出 ---------------- */

function exportMarkdown(store, subjectId) {
  const m = store.bootstrap(subjectId)
  const s = m.subject
  const t = m.tables
  const line = (v) => (v == null || v === '' ? '未记录' : String(v))
  const rows = (list, cols) =>
    list.length
      ? ['| ' + cols.map((c) => c[1]).join(' | ') + ' |', '| ' + cols.map(() => '---').join(' | ') + ' |']
          .concat(list.map((r) => '| ' + cols.map((c) => line(r[c[0]])).join(' | ') + ' |'))
          .join('\n')
      : '未记录'

  const parts = []
  parts.push(`# ${line(s.display_name)} · 头颈癌工作台摘要`)
  parts.push('')
  parts.push(`> 本摘要由本机数据生成于 ${new Date().toISOString().slice(0, 10)}。只抄录记录，不含任何判断或建议。`)
  if (m.demo) parts.push('> **演示数据**：内容为虚构示例，不是真实病例。')
  parts.push('')
  parts.push('## 基本信息')
  parts.push(`- 原发部位：${line(s.primary_site)}${s.site_detail ? `（${s.site_detail}）` : ''}`)
  parts.push(`- 出生年：${line(s.birth_year)}　性别：${line(s.sex)}`)
  parts.push('')

  const stg = t.staging_assertions[0]
  parts.push('## 分期')
  parts.push(
    stg
      ? `- ${line(stg.system)}　T${line(stg.t_stage)} N${line(stg.n_stage)} M${line(stg.m_stage)}　${line(stg.overall)}　（${line(stg.asserted_by)}，${line(stg.asserted_on)}）`
      : '- 未记录',
  )
  parts.push('')

  const p = t.pathology_reports[0]
  parts.push('## 病理')
  parts.push(
    p
      ? [
          `- 报告日期：${line(p.reported_on)}　标本：${line(p.specimen)}`,
          `- 组织学：${line(p.histology)}　分级：${line(p.grade)}`,
          `- 切缘：${line(p.margin_status)}　脉管：${line(p.lymphovascular)}　神经：${line(p.perineural)}`,
          `- 淋巴结：${line(p.nodes_positive)} / ${line(p.nodes_examined)}`,
          p.variant_raw ? `- 变异组织类型（原文）：${p.variant_raw}` : '',
        ]
          .filter(Boolean)
          .join('\n')
      : '- 未记录',
  )
  parts.push('')
  parts.push('## 分子检测')
  parts.push(
    rows(t.biomarker_results, [
      ['marker', '标志物'],
      ['result_text', '结果'],
      ['method', '方法'],
      ['specimen', '标本'],
      ['tested_on', '日期'],
    ]),
  )
  parts.push('')

  parts.push('## 治疗线')
  parts.push(rows(t.treatment_lines, [['line_no', '线'], ['intent', '目的'], ['started_on', '开始'], ['ended_on', '结束']]))
  parts.push('')
  parts.push('## 手术')
  parts.push(rows(t.surgery_events, [['performed_on', '日期'], ['procedure', '术式'], ['approach', '入路'], ['larynx_preserved', '保留喉']]))
  parts.push('')
  parts.push('## 放疗')
  parts.push(rows(t.radiotherapy_courses, [['started_on', '开始'], ['ended_on', '结束'], ['technique', '技术'], ['total_dose_gy', '总剂量 Gy'], ['fractions', '次数']]))
  parts.push('')

  parts.push('## 气道与造口')
  parts.push(rows(t.airway_status, [['kind', '类型'], ['established_on', '建立日期'], ['tube_type', '套管']]))
  parts.push('')
  parts.push('造口护理记录：')
  parts.push(rows(t.stoma_logs, [['logged_on', '日期'], ['event', '事件'], ['severity', '程度'], ['note', '备注']]))
  parts.push('')
  parts.push('气道急症：')
  parts.push(rows(t.airway_emergencies, [['occurred_at', '时间'], ['kind', '类型'], ['outcome', '结果'], ['went_to', '处理']]))
  parts.push('')

  parts.push('## 声音与沟通')
  parts.push(rows(t.voice_methods, [['method', '方式'], ['started_on', '开始'], ['ended_on', '结束']]))
  parts.push('')
  parts.push('发音管：')
  parts.push(rows(t.voice_prostheses, [['placed_on', '置入'], ['device_spec', '规格'], ['removed_on', '取出'], ['removal_reason', '原因']]))
  parts.push('')

  parts.push('## 吞咽与营养')
  parts.push(rows(t.feeding_routes, [['route', '进食途径'], ['started_on', '开始'], ['ended_on', '结束']]))
  parts.push('')
  parts.push('进食情况：')
  parts.push(rows(t.nutrition_intake, [['recorded_on', '日期'], ['food_form', '食物形态'], ['appetite', '食欲'], ['note', '备注']]))
  parts.push('')

  parts.push('## 放疗晚期毒性')
  parts.push(rows(t.late_toxicity_observations, [['domain', '方面'], ['observed_on', '日期'], ['severity_text', '原文描述'], ['years_after_rt', '放疗后年数']]))
  parts.push('')

  parts.push('## 指标记录')
  const metricLabel = new Map(m.metrics.map((x) => [x.id, `${x.label}${x.unit ? `（${x.unit}）` : ''}`]))
  parts.push(
    rows(
      t.observations
        .slice()
        .sort((a, b) => String(b.observed_on).localeCompare(String(a.observed_on)))
        .map((o) => ({ ...o, metric: metricLabel.get(o.metric_id) || o.metric_id })),
      [['observed_on', '日期'], ['metric', '指标'], ['value_num', '数值'], ['absence_state', '缺失态'], ['lab_name', '机构']],
    ),
  )
  parts.push('')

  parts.push('## 关切清单')
  parts.push(
    rows(t.concerns, [
      ['raised_on', '提出'],
      ['text', '内容'],
      ['kind', '类型'],
      ['asked', '问过'],
      ['answered_raw', '医生原话'],
    ]),
  )
  parts.push('')
  parts.push('## 随访')
  parts.push(rows(t.followup_schedules, [['item', '项目'], ['interval_text', '间隔原文'], ['next_due_on', '下次']]))
  parts.push('')
  parts.push('## 任务')
  parts.push(rows(t.tasks, [['title', '事项'], ['due_on', '截止'], ['done_at', '完成']]))
  parts.push('')
  parts.push('---')
  parts.push('说明：本文件只包含「共享」可见性的内容；标记为私密的记录默认不导出。')
  return parts.join('\n')
}

/* ---------------- handler ---------------- */

/**
 * 把 SQLite 的约束失败翻成「用户输入错误」。
 *
 * 为什么必须翻：CHECK / NOT NULL / UNIQUE 失败是**用户给了不合法的值**，
 * 不是服务内部出错。原样当 500 抛出去有两个坏处——前端只能显示一句
 * 「ERR_SQLITE_ERROR」，患者看不懂；而且 500 会把 SQLite 的表名与约束表达式
 * 写进日志和响应体，等于把库结构漏给前端。
 *
 * 字段名从错误串里反解：
 *   CHECK constraint failed: kind IN (...)        → kind
 *   CHECK constraint failed: <table>.<column> ... → column
 *   NOT NULL constraint failed: concerns.text     → text
 *   UNIQUE constraint failed: subjects.id         → id
 * 反解不出来就只给 422，不硬猜字段。
 */
function mapSqliteError(error) {
  const code = error && error.code
  const msg = String((error && error.message) || '')
  if (code !== 'ERR_SQLITE_ERROR' && !/^\w+ constraint failed/.test(msg)) return null

  const detail = msg.split(':').slice(1).join(':').trim()
  // 表名.列名 形式（NOT NULL / UNIQUE / FOREIGN KEY）
  const qualified = detail.match(/^[\w]+\.[\w]+/)
  if (qualified) {
    const column = qualified[0].split('.')[1]
    return { status: 422, body: { error: 'invalid', message: `这个值不合法：${column}`, field: column } }
  }
  // CHECK 表达式形式：取首个标识符当列名
  const ident = detail.match(/^([A-Za-z_][\w]*)/)
  if (ident) {
    const column = ident[1]
    return { status: 422, body: { error: 'invalid', message: `这个值不合法：${column}`, field: column } }
  }
  return { status: 422, body: { error: 'invalid', message: '这个值不合法' } }
}

export function createHandler(store, { version = '0.0.0', uiPrefix = `${API_PREFIX}/ui` } = {}) {
  return async function handler(req, res) {
    const path = pathOf(req.url)
    const query = queryOf(req.url)
    const method = req.method || 'GET'

    try {
      /* UI 静态资源：/ui、/ui/、/ui/xxx */
      // 必须带尾斜杠：index.html 里 live.js 是相对路径，
      // 停在 /ui 会让浏览器把它解析成 /api/head-neck-workbench/live.js → 404。
      if (path === '/ui' || path === '/') {
        res.writeHead(302, { location: `${API_PREFIX}/ui/`, 'cache-control': 'no-store' })
        return res.end()
      }
      if (path.startsWith('/ui/')) {
        const rel = path.slice('/ui/'.length) || 'index.html'
        if (serveStatic(res, rel)) return
        return sendJson(res, 404, { error: 'not_found', message: `找不到 ${rel}` })
      }

      if (path === '/favicon.ico') {
        res.writeHead(204, { 'cache-control': 'max-age=86400' })
        return res.end()
      }

      if (path === '/health') {
        return sendJson(res, 200, { ok: true, version, apiVersion: 'v1', capabilities: ['health', 'bootstrap', 'entities', 'export'], demo: store.isDemo() })
      }

      if (path === '/bootstrap' && method === 'GET') {
        return sendJson(res, 200, { ok: true, version, ...store.bootstrap(query.subject || null) })
      }

      if (path === '/seed' && method === 'POST') {
        const result = store.seedIfEmpty()
        return sendJson(res, 200, { ok: true, ...result })
      }

      if (path === '/export' && method === 'GET') {
        const format = query.format || 'md'
        if (format === 'json') {
          return sendJson(res, 200, { ok: true, exportedAt: new Date().toISOString(), model: store.bootstrap(query.subject || null) })
        }
        const md = exportMarkdown(store, query.subject || null)
        res.writeHead(200, { 'content-type': 'text/markdown; charset=utf-8', 'cache-control': 'no-store' })
        return res.end(md)
      }

      /* 主体 */
      if (path === '/subjects' && method === 'POST') {
        const body = await readBody(req)
        if (!body.display_name) return sendJson(res, 422, { error: 'invalid', message: '缺少姓名', field: 'display_name' })
        if (!body.primary_site) return sendJson(res, 422, { error: 'invalid', message: '缺少原发部位', field: 'primary_site' })
        const row = store.insert('subjects', { ...body, created_at: new Date().toISOString() }, { actor: body.actor })
        return sendJson(res, 201, { ok: true, row })
      }
      const subjectMatch = path.match(/^\/subjects\/([^/]+)$/)
      if (subjectMatch && (method === 'PATCH' || method === 'PUT')) {
        const body = await readBody(req)
        const row = store.update('subjects', decodeURIComponent(subjectMatch[1]), body, { actor: body.actor })
        if (!row) return sendJson(res, 404, { error: 'not_found', message: '主体不存在' })
        return sendJson(res, 200, { ok: true, row })
      }

      /* 通用实体：/entities/:table[/:id] */
      const entMatch = path.match(/^\/entities\/([a-z_]+)(?:\/([^/]+))?$/)
      if (entMatch) {
        const [, table, rawId] = entMatch
        const id = rawId ? decodeURIComponent(rawId) : null

        if (method === 'POST' && !id) {
          const body = await readBody(req)
          if (!body.subject_id && table !== 'subjects' && table !== 'metric_definitions' && table !== 'source_refs') {
            return sendJson(res, 422, { error: 'invalid', message: '缺少 subject_id', field: 'subject_id' })
          }
          const row = store.insert(table, body, { actor: body.actor, subjectId: body.subject_id })
          return sendJson(res, 201, { ok: true, row })
        }
        if ((method === 'PATCH' || method === 'PUT') && id) {
          const body = await readBody(req)
          const row = store.update(table, id, body, { actor: body.actor, subjectId: body.subject_id })
          if (!row) return sendJson(res, 404, { error: 'not_found', message: '记录不存在' })
          return sendJson(res, 200, { ok: true, row })
        }
        if (method === 'DELETE' && id) {
          const ok = store.remove(table, id)
          if (!ok) return sendJson(res, 404, { error: 'not_found', message: '记录不存在' })
          return sendJson(res, 200, { ok: true })
        }
        return sendJson(res, 405, { error: 'method_not_allowed', message: `${method} 不支持该路径` })
      }

      return sendJson(res, 404, { error: 'not_found', message: `没有这个接口：${path}` })
    } catch (error) {
      const mapped = mapSqliteError(error)
      if (mapped) return sendJson(res, mapped.status, mapped.body)

      const status = error.status || 500
      if (status >= 500) {
        // 500 不把内部堆栈发给前端，但要留在服务端日志里
        console.error('[head-neck-workbench]', error)
      }
      return sendJson(res, status, {
        error: error.code || 'internal',
        message: error.message || '服务内部错误',
        field: error.field || error.fields?.[0],
      })
    }
  }
}
