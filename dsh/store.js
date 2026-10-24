/**
 * 本地优先存储层。
 *
 * 设计约束（来自 schema/migrations/0001_initial.sql 与 docs/SCHEMA.md）：
 *   1) 事实表按四条轨道分开，**不做跨轨折算**；本层不提供任何"总分"聚合。
 *   2) 所有写入都过 change_log，便于回溯"这条是谁在什么时候改的"。
 *   3) 写入列必须存在于表定义（PRAGMA 白名单），不做字符串拼 SQL 的自由发挥。
 *   4) 缺失态用 absence_state 表达，不把"未检测"写成 0 或空串。
 *
 * 为什么用 node:sqlite：DSH Desktop 的 Electron 运行时是 Node 24，内置 node:sqlite，
 * 不需要额外原生编译依赖（better-sqlite3 要为每个 Electron ABI 重编，装机最容易坏）。
 * 实测：ELECTRON_RUN_AS_NODE 下 `new DatabaseSync(':memory:')` 可用。
 */
import { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = join(HERE, '..', 'schema', 'migrations')

/** 有 subject_id 的表：读模型按主体一次性取回。顺序即界面分组的天然顺序。 */
export const SUBJECT_TABLES = Object.freeze([
  'subject_roles',
  'staging_assertions',
  'pathology_reports',
  'biomarker_results',
  'treatment_lines',
  'surgery_events',
  'radiotherapy_courses',
  'adverse_events',
  'responses',
  'airway_status',
  'tracheostoma_facts',
  'stoma_supplies',
  'stoma_logs',
  'airway_emergencies',
  'voice_methods',
  'voice_prostheses',
  'communication_aids',
  'function_self_reports',
  'feeding_routes',
  'aspiration_events',
  'nutrition_intake',
  'late_toxicity_observations',
  'dental_events',
  'trismus_measurements',
  'observations',
  'symptom_entries',
  'concerns',
  'followup_schedules',
  'followup_records',
  'tasks',
  'viewpoints',
  'caregiver_notes',
  'documents',
  'exports',
])

/** 子表 → 父表外键列。子表没有 subject_id，靠父表归属。 */
export const CHILD_TABLES = Object.freeze({
  pathology_findings: { parent: 'pathology_reports', fk: 'report_id' },
  neck_dissections: { parent: 'surgery_events', fk: 'surgery_id' },
  radiotherapy_sites: { parent: 'radiotherapy_courses', fk: 'course_id' },
  regimen_drugs: { parent: 'treatment_lines', fk: 'line_id' },
  cycles: { parent: 'treatment_lines', fk: 'line_id' },
  candidate_fields: { parent: 'documents', fk: 'document_id' },
})

/** 允许通过 API 写入的表。schema_migrations / demo_meta / change_log 不在其中。 */
export const WRITABLE_TABLES = Object.freeze([
  'subjects',
  'subject_roles',
  // 目录与来源是"参考数据"，设置页要能维护；它们不是业务事实，但仍需留痕
  'metric_definitions',
  'source_refs',
  ...SUBJECT_TABLES.filter((t) => t !== 'exports'),
  ...Object.keys(CHILD_TABLES),
])

/** 布尔在 SQLite 里是 0/1；undefined 会让 node:sqlite 抛错，统一归一化。 */
function bind(value) {
  if (value === undefined) return null
  if (typeof value === 'boolean') return value ? 1 : 0
  if (value instanceof Date) return value.toISOString()
  return value
}

function q(identifier) {
  if (!/^[a-z_][a-z0-9_]*$/.test(identifier)) throw new Error(`非法标识符：${identifier}`)
  return `"${identifier}"`
}

function nowIso() {
  return new Date().toISOString()
}

/** 数据库默认落在用户目录，卸载不删业务数据；可用环境变量改到指定位置。 */
export function resolveDbPath() {
  const override = process.env.HEADNECK_DB_PATH || process.env.HEAD_NECK_DB_PATH
  if (override) return override
  return join(homedir(), '.head-neck-workbench', 'workbench.db')
}

function applyMigrations(db, log = () => {}) {
  const hasLedger = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'")
    .get()
  const files = existsSync(MIGRATIONS_DIR)
    ? readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()
    : []
  if (!files.length) throw new Error(`找不到迁移文件：${MIGRATIONS_DIR}`)

  const applied = hasLedger
    ? new Set(db.prepare('SELECT version FROM schema_migrations').all().map((r) => r.version))
    : new Set()

  for (const file of files) {
    const version = file.replace(/\.sql$/, '')
    if (applied.has(version)) continue
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8')
    db.exec('BEGIN')
    try {
      db.exec(sql)
      // 0001 自己建了 schema_migrations；其余迁移直接记录
      db.prepare('INSERT OR IGNORE INTO schema_migrations (version, applied_at, note) VALUES (?, ?, ?)').run(
        version,
        nowIso(),
        'auto-applied on open',
      )
      db.exec('COMMIT')
      log(`迁移已应用：${version}`)
    } catch (error) {
      db.exec('ROLLBACK')
      throw new Error(`迁移 ${version} 失败：${error.message}`)
    }
  }
}

export class Store {
  constructor(db, { path } = {}) {
    this.db = db
    this.path = path || ':memory:'
    this._columns = new Map()
  }

  /* ---------------- 基础读取 ---------------- */

  all(sql, ...params) {
    return this.db.prepare(sql).all(...params.map(bind))
  }

  one(sql, ...params) {
    return this.db.prepare(sql).get(...params.map(bind)) || null
  }

  /** 表列白名单（含主键、非空、默认值信息），带缓存。 */
  columns(table) {
    if (this._columns.has(table)) return this._columns.get(table)
    // 别名不能叫 notnull（撞 SQL 关键字），用 nn
    const rows = this.all('SELECT name, type, "notnull" AS nn, dflt_value, pk FROM pragma_table_info(?)', table)
    if (!rows.length) throw new Error(`表不存在：${table}`)
    const map = new Map(rows.map((r) => [r.name, r]))
    this._columns.set(table, map)
    return map
  }

  /* ---------------- 写入（带留痕） ---------------- */

  /**
   * 插入一行。
   * @param {string} table 必须在 WRITABLE_TABLES 内
   * @param {object} data  只取表定义里存在的列，其余忽略（并回报 ignored）
   * @param {{subjectId?:string, actor?:string}} ctx
   */
  insert(table, data, ctx = {}) {
    this.#assertWritable(table)
    const cols = this.columns(table)
    const idCol = cols.has('id') ? 'id' : null
    const payload = {}

    for (const [key, raw] of Object.entries(data || {})) {
      if (key === 'id') continue
      if (!cols.has(key)) continue
      payload[key] = bind(raw)
    }

    if (idCol && !data?.id) payload.id = randomUUID()
    else if (idCol) payload.id = data.id

    // 非空且无默认值的列必须在 payload 里，否则给一条人能读懂的错误
    const missing = []
    for (const [name, meta] of cols) {
      if (name === 'id') continue
      if (!meta.nn) continue
      if (meta.dflt_value !== null) continue
      if (name in payload && payload[name] !== null) continue
      missing.push(name)
    }
    if (missing.length) {
      throw Object.assign(new Error(`缺少必填字段：${missing.join('、')}`), { status: 422, fields: missing })
    }

    const names = Object.keys(payload)
    const sql = `INSERT INTO ${q(table)} (${names.map(q).join(', ')}) VALUES (${names.map(() => '?').join(', ')})`
    this.db.prepare(sql).run(...names.map((n) => payload[n]))

    const entityId = idCol ? payload.id : null
    // 演示种子灌数据时 silent=true：留痕表只记真实用户操作，不记"我编了 120 行假数据"
    if (!ctx.silent) {
      this.#logChange({
        subjectId: ctx.subjectId ?? payload.subject_id ?? null,
        entity: table,
        entityId,
        action: 'insert',
        actor: ctx.actor || null,
        diff: JSON.stringify(payload),
      })
    }
    return idCol ? this.one(`SELECT * FROM ${q(table)} WHERE id = ?`, entityId) : payload
  }

  /** 局部更新。返回更新后的整行；行不存在返回 null。 */
  update(table, id, patch, ctx = {}) {
    this.#assertWritable(table)
    const cols = this.columns(table)
    const payload = {}
    for (const [key, raw] of Object.entries(patch || {})) {
      if (key === 'id') continue
      if (!cols.has(key)) continue
      payload[key] = bind(raw)
    }
    const names = Object.keys(payload)
    if (!names.length) return this.one(`SELECT * FROM ${q(table)} WHERE id = ?`, id)

    const before = this.one(`SELECT * FROM ${q(table)} WHERE id = ?`, id)
    if (!before) return null

    const sql = `UPDATE ${q(table)} SET ${names.map((n) => `${q(n)} = ?`).join(', ')} WHERE id = ?`
    this.db.prepare(sql).run(...names.map((n) => payload[n]), id)

    this.#logChange({
      subjectId: ctx.subjectId ?? before.subject_id ?? null,
      entity: table,
      entityId: id,
      action: 'update',
      actor: ctx.actor || null,
      diff: JSON.stringify({ from: Object.fromEntries(names.map((n) => [n, before[n]])), to: payload }),
    })
    return this.one(`SELECT * FROM ${q(table)} WHERE id = ?`, id)
  }

  remove(table, id, ctx = {}) {
    this.#assertWritable(table)
    const before = this.one(`SELECT * FROM ${q(table)} WHERE id = ?`, id)
    if (!before) return false
    this.db.prepare(`DELETE FROM ${q(table)} WHERE id = ?`).run(id)
    this.#logChange({
      subjectId: ctx.subjectId ?? before.subject_id ?? null,
      entity: table,
      entityId: id,
      action: 'delete',
      actor: ctx.actor || null,
      diff: JSON.stringify(before),
    })
    return true
  }

  #assertWritable(table) {
    if (!WRITABLE_TABLES.includes(table)) {
      throw Object.assign(new Error(`不允许写入的表：${table}`), { status: 403 })
    }
  }

  #logChange({ subjectId, entity, entityId, action, actor, diff }) {
    this.db
      .prepare(
        'INSERT INTO change_log (id, subject_id, entity, entity_id, action, actor, at, diff) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run(randomUUID(), subjectId || null, entity, entityId || null, action, actor || null, nowIso(), diff || null)
  }

  /* ---------------- 读模型 ---------------- */

  listSubjects() {
    return this.all(
      'SELECT id, display_name, birth_year, sex, primary_site, site_detail, created_at, updated_at FROM subjects ORDER BY created_at',
    )
  }

  isDemo() {
    const row = this.one("SELECT v FROM demo_meta WHERE k = 'is_demo'")
    return row?.v === '1'
  }

  /**
   * 单个主体的完整读模型。
   * 一次取回该主体在各轨的全部行 + 子表 + 指标目录 + 来源清单。
   * 本地单用户数据量小（百级行），一次取回比 34 个页签各打一次接口更省事、也更容易保持一致。
   */
  bootstrap(subjectId) {
    const subjects = this.listSubjects()
    const active = subjectId || subjects[0]?.id || null
    const model = {
      demo: this.isDemo(),
      subjects,
      activeSubjectId: active,
      subject: null,
      metrics: this.all('SELECT * FROM metric_definitions ORDER BY track, code'),
      sources: this.all('SELECT * FROM source_refs ORDER BY id'),
      tables: {},
      children: {},
    }
    if (!active) return model

    model.subject = this.one('SELECT * FROM subjects WHERE id = ?', active)
    for (const table of SUBJECT_TABLES) {
      model.tables[table] = this.all(`SELECT * FROM ${q(table)} WHERE subject_id = ?`, active)
    }
    for (const [child, { parent, fk }] of Object.entries(CHILD_TABLES)) {
      const parentIds = model.tables[parent]?.map((row) => row.id) || []
      model.children[child] = parentIds.length
        ? this.all(`SELECT * FROM ${q(child)} WHERE ${q(fk)} IN (${parentIds.map(() => '?').join(', ')})`, ...parentIds)
        : []
    }
    model.changeLog = this.all(
      'SELECT * FROM change_log WHERE subject_id = ? ORDER BY at DESC LIMIT 200',
      active,
    )
    return model
  }

  /* ---------------- 演示数据 ---------------- */

  /** 只在库为空时灌演示数据；重复调用不会重复灌。 */
  seedIfEmpty() {
    const count = this.one('SELECT COUNT(*) AS c FROM subjects')?.c || 0
    if (count > 0) return { seeded: false, subjects: count }
    const result = seedDemo(this)
    return { seeded: true, ...result }
  }

  close() {
    try {
      this.db.close()
    } catch {
      /* 已关闭 */
    }
  }
}

/** 打开（必要时创建）数据库并跑迁移。 */
export function openStore({ path, log } = {}) {
  const dbPath = path || resolveDbPath()
  if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true })
  const db = new DatabaseSync(dbPath)
  db.exec('PRAGMA foreign_keys = ON')
  if (dbPath !== ':memory:') db.exec('PRAGMA journal_mode = WAL')
  applyMigrations(db, log)
  return new Store(db, { path: dbPath })
}

/* ---------------- 演示种子（单独文件，便于将来整体替换） ---------------- */
import { seedDemo } from './seed-demo.js'
