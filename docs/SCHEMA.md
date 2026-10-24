# 头颈癌工作台 · 数据模型（草案）

> **状态：草案。G3 未签，不进 `schema/`、不写 `freeze-contract.md`。**
> SQL：`schema/draft/0001_initial.sql`｜探针：`scripts/check-schema-draft.mjs`（**24/24 通过**）
> 规模：**46 张表 · 63 个索引（含 UNIQUE 自动索引）· 35 张表带 CHECK**
> 依据：`docs/SCENARIOS.md`（10 一级 / 34 二级）、`docs/RESEARCH-2026-10-25.md` §5（四条轨道）、`docs/26-CANCER-FEATURE-LINES.md` §4.3

---

## 0. 五条设计纪律（写成 CHECK，不只写在文档里）

| # | 纪律 | 落地方式 |
| --- | --- | --- |
| 1 | **四条轨道永不相加** | A/B/C/D 各自成表；**全库没有任何"综合评分""总体分"字段**；`metric_definitions.track` 强制四值 + X（横切） |
| 2 | **缺失态必须显式** | `absence_state IN ('not_tested','not_detected','negative','failed','pending','vus','not_applicable')`；`observations` 有 `CHECK (value_num IS NOT NULL OR value_text IS NOT NULL OR absence_state IS NOT NULL)`——三项全空直接拒 |
| 3 | **私密是数据结构属性** | `viewpoints.visibility` / `caregiver_notes.visibility` **DEFAULT 'private'**（fail-closed）；`concerns` 同；`exports.includes_private` DEFAULT 0 |
| 4 | **部位驱动视图，不删表** | `subjects.primary_site` 强制枚举；鼻咽癌路径由读模型派生（DESIGN-07），表结构不变 |
| 5 | **手术史按线分存** | `treatment_lines(UNIQUE(subject_id,line_no))` + `surgery_events.line_id`；换线不覆盖旧数据 |

> **与 26 文档的一处有意偏离**：26 建议 `visibility` 默认 `'shared'`（为不破坏既有数据）。本项目是**新库、无历史数据**，故改 fail-closed（默认 `'private'`）。理由：私密内容一旦进摘要/导出就无法回收，新库没有兼容包袱时应当选更安全的一侧。

---

## 1. 46 张表（按域分组）

### 1.1 元信息（2）

| 表 | 作用 | 关键约束 |
| --- | --- | --- |
| `schema_migrations` | 迁移账本 | `version` 主键 |
| `demo_meta` | 演示标记（防把演示数据当真） | — |

### 1.2 主体与来源（3）

| 表 | 作用 | 关键约束 |
| --- | --- | --- |
| `subjects` | 患者主体 | `primary_site` 枚举九值；`site_detail` 存亚部位 |
| `subject_roles` | **「谁记的」与「记的是谁」** | `is_self` 0/1；DESIGN-08 要求家属代记必须能区分 |
| `source_refs` | 证据来源 | `evidence IN ('A','B','未核实')`——与 `docs/SOURCES.md` 同一分级 |

### 1.3 A 轨 · 肿瘤学状态（8）

| 表 | 作用 | 关键约束 |
| --- | --- | --- |
| `staging_assertions` | 分期（**多断言并列**，不覆盖） | `system` 枚举；不设"最新"标志，由查询取 `asserted_on` |
| `pathology_reports` | 病理报告 | `margin_status`/`lymphovascular`/`perineural` 均三态（含"未提及"）；`variant_raw` **未提及存 NULL 不写「无」** |
| `pathology_findings` | 报告逐项 | 指向 report |
| `biomarker_results` | HPV / p16 / PD-L1 CPS / TPS | `marker` 枚举；**CPS 与 TPS 分开存**（同一标本两把尺，不可互换） |
| `treatment_lines` | 治疗线 | `UNIQUE(subject_id,line_no)`；`is_current` + `supersedes_id` |
| `surgery_events` | 手术 | `procedure` 枚举十值；`larynx_preserved`/`voice_lost`/`permanent_stoma` 三个独立布尔（**不由术式名推断**） |
| `neck_dissections` | 颈清扫 | `spinal_accessory_preserved`（副神经，对应肩臂功能） |
| `radiotherapy_courses` / `radiotherapy_sites` | 放疗 | 技术/总剂量/分次；部位单独一行 |

### 1.4 A 轨 · 系统治疗（4）

| 表 | 作用 | 关键约束 |
| --- | --- | --- |
| `regimen_drugs` | 方案药物 | `dose_text` 存原文（如「按体表面积计算」）；`dose_source` 无出处则留空，**不编数字** |
| `cycles` | 周期 | `delayed` + `delay_reason` |
| `adverse_events` | 不良反应 | `is_suspected_irae`——患者只能记"疑似"，`judged_by` 留给医生 |
| `responses` | 疗效 | `result` 存医生原话；`basis` 记依据 |

### 1.5 B 轨 · 气道与造口（5）

| 表 | 作用 | 关键约束 |
| --- | --- | --- |
| `airway_status` | 气道类型 | `kind` 枚举（永久/临时/已拔管/无/未记录） |
| `tracheostoma_facts` | 造口日常（湿化/清洁/洗澡） | 自由文本，因 G4 无护理共识，只记录不指导 |
| `stoma_supplies` | 耗材与库存 | `retired_at` **软停用**，不删历史 |
| `stoma_logs` | 造口事件 | `event` 枚举含「堵塞」「脱出」 |
| `airway_emergencies` | **分钟级事件** | 单独成表：它不是"症状"，是气道事件；`occurred_at` 精确到时刻 |

### 1.6 B 轨 · 声音与沟通（4）

| 表 | 作用 | 关键约束 |
| --- | --- | --- |
| `voice_methods` | 发声方式 | `method` 枚举（食管语/电子喉/TEP/书写/手势/无）；`is_current` |
| `voice_prostheses` | 发音管 | `placed_on`/`removed_on`；`removal_reason` 枚举含「漏气」；**不存"预计还能用多久"**（只按 115 天文献均值派生展示） |
| `communication_aids` | 沟通辅具 | 急救卡属此类 |
| `function_self_reports` | 功能自述 | `domain` + `activity` + `ability` 三态；**不做量表分** |

### 1.7 C 轨 · 吞咽与营养（3）

| 表 | 作用 | 关键约束 |
| --- | --- | --- |
| `feeding_routes` | 进食方式 | `route` 枚举（口进/胃管/PEG/肠外/混合）；`is_current` |
| `aspiration_events` | 呛咳与误吸 | `coughed` 与 `silent_suspected` **两个独立字段**——`coughed=0` 不等于没误吸 |
| `nutrition_intake` | 进食情况 | `food_form` 五态 + `appetite` 四态 |

### 1.8 D 轨 · 放疗晚期毒性（3）

| 表 | 作用 | 关键约束 |
| --- | --- | --- |
| `late_toxicity_observations` | 迟发毒性 | `domain` 枚举八项；`severity_text` **原文照录不自创分级**；`years_after_rt` 由放疗结束日期派生 |
| `dental_events` | 牙科事件 | `rt_disclosed`——是否告知牙医放疗史（本癌种特有的风险沟通点） |
| `trismus_measurements` | 张口度 | `mouth_opening_mm` 客观可测 |

### 1.9 横切 · 指标（3）

| 表 | 作用 | 关键约束 |
| --- | --- | --- |
| `metric_definitions` | 指标目录 | `track` 四值 + X；`grade_system` 含 WHO（DESIGN-04）；`is_chartable` 区分可折线/只做节点 |
| `observations` | 观察记录 | 五项缺失态；`lab_name` + `method` 用于**拆可比组**（换机构或方法即断线） |
| `symptom_entries` | 症状 | `track` 强制归属四轨之一（不许"其他"逃逸） |

### 1.10 关切与随访（4）

| 表 | 作用 | 关键约束 |
| --- | --- | --- |
| `concerns` | **PCI 式关切清单** | `kind`（担心/要问的问题/生活困难）；`asked` + `answered_raw` + `addressed` 三件分开——问过≠答过≠被回应 |
| `followup_schedules` | 随访计划 | `interval_text` 存**来源原文**，不给通用间隔（G1）；带 `source_version` |
| `followup_records` | 随访记录 | `summary_raw` 照录 |
| `tasks` | 待办 | `kind` 五值 |

### 1.11 心理与家人（2）

| 表 | 作用 | 关键约束 |
| --- | --- | --- |
| `viewpoints` | 感受/担心/外形/性/家庭矛盾/病耻 | **`visibility` DEFAULT 'private'** |
| `caregiver_notes` | 照护者记录 | 同上；`recorded_by` 指 `subject_roles` |

### 1.12 资料与导出（3）

| 表 | 作用 | 关键约束 |
| --- | --- | --- |
| `documents` | 资料 | `relative_path` **只存相对路径**；`UNIQUE(subject_id,sha256)` 防重复导入 |
| `candidate_fields` | 解析候选 | `state` DEFAULT `'pending'`——**解析结果永远只是候选**，逐项确认才进事实层 |
| `exports` | 导出快照 | `includes_private` DEFAULT 0；`hash` 用于"已过时"判断 |

### 1.13 留痕（1）

| 表 | 作用 | 关键约束 |
| --- | --- | --- |
| `change_log` | 变更留痕 | `action` 五值含 `confirm`/`reject` |

---

## 2. 私密内容的三个出口（过滤写在一处）

| 出口 | 过滤规则 |
| --- | --- |
| 一图秀 / 指标趋势 | 只读 `observations`，不读 `viewpoints`/`caregiver_notes`——**结构上就接触不到** |
| 复诊摘要 | 查 `visibility='shared'` |
| 导出 | `exports.includes_private=0` 时同摘要规则；选 1 时才包含，且导出页显式警告 |

> 关键：一图秀与指标趋势**不引用**私密表，所以"忘了过滤"不会泄露。过滤函数只服务摘要与导出两个出口。

---

## 3. 部位驱动视图（DESIGN-07）

`subjects.primary_site = '鼻咽'` 时，读模型派生：

| 一级线 / 二级 | 派生行为 |
| --- | --- |
| 治疗与手术 › 手术与切除范围 | **隐藏**（`surgery_events` 仍可查，只是默认不显示） |
| 治疗与手术 › 放疗 | 置顶 |
| 气道与造口 / 声音与沟通 | 默认折叠，**不删除** |
| 长期与复诊 › 放疗后十年 | 加厚 |

实现位置：读模型（`readModel.js` 或等价物），**不改表结构**。切换部位后旧数据仍可访问——这是"不删页面"的具体含义。

---

## 4. 扩展策略边界

| 变化 | 处理 | 是否迁移 |
| --- | --- | --- |
| 新增一个普通检验指标（如白蛋白） | `metric_definitions` 插一行 + `observations` 记录 | **不迁移** |
| 新增一类检查（如 PET-CT 报告） | `documents.doc_kind` 加枚举值 + 可能需要新表 | 结构迁移 |
| 新增一个原发部位 | `subjects.primary_site` 加枚举值 + 读模型映射 | 结构迁移（CHECK 需重建表） |
| 新增一条功能线 | 新表 + 读模型 | 结构迁移 |
| 改页面布局/页签顺序 | 读模型 | **不迁移** |

**边界**：`primary_site` 与各 `*_kind` 枚举是 CHECK 约束，SQLite 改 CHECK 需建新表复制数据——这是**有意**的：部位是核心分类，改它应当触发一次正式迁移，而不是静默扩展。

---

## 5. 迁移账本与冻结流程

| 步骤 | 动作 |
| --- | --- |
| 1 | 草案在 `schema/draft/` 迭代，`check-schema-draft.mjs` 必须全绿 |
| 2 | G3 签认后，`0001_initial.sql` 移入 `schema/`，写 `schema/freeze-contract.md`（表数/索引数/探针数/hash） |
| 3 | 后续变更走 `0002_*.sql`，**只增不改**；破坏性变更需新表 + 数据搬迁 + 回滚脚本 |
| 4 | 每次迁移在 `schema_migrations` 记 `version`/`applied_at`/`note` |

**当前**：未签认，`schema/` 目录为空，无 `freeze-contract.md`。

---

## 6. 统一读模型口径

| 读模型 | 数据来源 | 口径 |
| --- | --- | --- |
| 看板四轨摘要 | A/B/C/D 各取最近一条 | **并列呈现，不合并、不排序、不给总分** |
| 指标卡 | `metric_definitions` + `observations` | 按 `lab_name + method` 拆可比组；`absence_state` 非空时正面显示缺失态而非 0 |
| 一图秀 | 同上 | 每指标按**全期** min/max 归一化；单点不连线 |
| 复诊摘要 | 五块拼接（我的病/治疗/气道/吞咽/关切） | 每块缺失时写"本次未记录"，不省略 |
| 关切清单 | `concerns` | `asked`/`answered_raw`/`addressed` 三列分列 |

---

## 7. 持久化选型

| 项 | 选择 | 理由 |
| --- | --- | --- |
| 主存储 | **SQLite（等级 A · 本地单机）** | 患者数据本机优先；单文件可备份 |
| 运行时 | `node:sqlite`（Node ≥ 22 内置） | 不引第三方依赖 |
| 偏好/界面状态 | `localStorage` | 只存 UI 偏好，不存业务事实 |
| 文档原件 | 用户确认的目录 + `relative_path` | 卸载不删除 |

---

## 8. 未决项

1. **`metric_definitions` 的初始指标清单未定**——需按 DESIGN-04 的 WHO 口径确定黏膜炎字段形态（数值？形态枚举？），M3 前定。
2. **`concerns.visibility` 默认 private 是否过严**——关切清单里有一部分（如"想问医生能不能拔牙"）本来就要带进诊室；可能需按 `kind` 分流。待 G3 讨论。
3. **`documents` 的根目录校验**——`relative_path` 的目录边界检查写在服务端还是导入时？M5 解析阶段定。
4. **性能未测量**——46 表在真实数据量下的查询表现未测，不做"性能良好"的表述。
