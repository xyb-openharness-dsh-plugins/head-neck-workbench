-- ============================================================
-- 头颈癌工作台 · 0001_initial
-- 状态：已冻结（G3 由用户 m05978「G2确认，继续完成开发到M9」授权进入实施）
-- 纪律（不可让步）：
--   1) 四条轨道（A 肿瘤学 / B 气道与发声 / C 吞咽与营养 / D 放疗晚期毒性）各自独立成表，
--      不存在任何把四轨折算成一个分数的字段；
--   2) 缺失态一律显式存 absence_state，「未检测」不等于「阴性」，不写 0、不写空串；
--   3) 私密是数据结构属性（visibility 列），不是界面开关；
--   4) 部位（primary_site）驱动读模型显隐，不是删表；
--   5) 手术史按治疗线分存（is_current + supersedes_id），换线不覆盖旧数据。
-- 迁移规则：只增不改。任何列/表变更走 0002_*.sql，禁止编辑本文件。
-- ============================================================

PRAGMA foreign_keys = ON;

-- ---------- 0. 元信息 ----------
CREATE TABLE schema_migrations (
  version     TEXT PRIMARY KEY,
  applied_at  TEXT NOT NULL,
  note        TEXT
);

CREATE TABLE demo_meta (
  k TEXT PRIMARY KEY,
  v TEXT
);

-- ---------- 1. 主体与来源 ----------
CREATE TABLE subjects (
  id            TEXT PRIMARY KEY,
  display_name  TEXT NOT NULL,
  birth_year    INTEGER,
  sex           TEXT CHECK (sex IN ('男','女','未填')),
  primary_site  TEXT NOT NULL CHECK (primary_site IN
                  ('喉','下咽','口腔','口咽','鼻咽','唾液腺','鼻窦','其他','未定')),
  -- DESIGN-07：鼻咽癌走独立路径，由本字段派生读模型显隐
  site_detail   TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT
);

-- 「谁记的」与「记的是谁」是两个独立字段（DESIGN-08）
CREATE TABLE subject_roles (
  id          TEXT PRIMARY KEY,
  subject_id  TEXT NOT NULL REFERENCES subjects(id),
  actor_name  TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('本人','家属','照护者','医护','其他')),
  is_self     INTEGER NOT NULL DEFAULT 1 CHECK (is_self IN (0,1)),
  created_at  TEXT NOT NULL
);

CREATE TABLE source_refs (
  id           TEXT PRIMARY KEY,
  kind         TEXT NOT NULL CHECK (kind IN ('指南','共识','文献','院内方案','患者自述','设备读数','未核实')),
  title        TEXT NOT NULL,
  publisher    TEXT,
  version      TEXT,
  url          TEXT,
  accessed_on  TEXT,
  evidence     TEXT CHECK (evidence IN ('A','B','未核实')),
  note         TEXT
);

-- ---------- 2. 疾病本体（A 轨） ----------
CREATE TABLE staging_assertions (
  id           TEXT PRIMARY KEY,
  subject_id   TEXT NOT NULL REFERENCES subjects(id),
  system       TEXT NOT NULL CHECK (system IN ('AJCC第8版','AJCC第7版','院内','未注明')),
  t_stage      TEXT, n_stage TEXT, m_stage TEXT, overall TEXT,
  asserted_by  TEXT,
  asserted_on  TEXT,
  source_id    TEXT REFERENCES source_refs(id),
  note         TEXT
);

CREATE TABLE pathology_reports (
  id              TEXT PRIMARY KEY,
  subject_id      TEXT NOT NULL REFERENCES subjects(id),
  reported_on     TEXT,
  specimen        TEXT,                       -- 活检 / 术中冰冻 / 根治标本
  histology       TEXT,
  grade           TEXT,
  margin_status   TEXT CHECK (margin_status IN ('阴性','阳性','近切缘','未提及')),
  lymphovascular TEXT CHECK (lymphovascular IN ('有','无','未提及')),
  perineural     TEXT CHECK (perineural IN ('有','无','未提及')),
  variant_raw     TEXT,                       -- 变异组织类型原文；未提及存 NULL 不写「无」
  nodes_positive  INTEGER,
  nodes_examined  INTEGER,
  raw_text        TEXT,                       -- 报告原文照录
  source_id       TEXT REFERENCES source_refs(id)
);

CREATE TABLE pathology_findings (
  id          TEXT PRIMARY KEY,
  report_id   TEXT NOT NULL REFERENCES pathology_reports(id),
  label       TEXT NOT NULL,
  value_text  TEXT,
  value_num   REAL,
  unit        TEXT,
  verbatim    TEXT
);

-- HPV/p16 与 PD-L1：同一份标本可有多个结论，各自带方法与标本类型
CREATE TABLE biomarker_results (
  id            TEXT PRIMARY KEY,
  subject_id    TEXT NOT NULL REFERENCES subjects(id),
  marker        TEXT NOT NULL CHECK (marker IN ('HPV','p16','PD-L1 CPS','PD-L1 TPS','其他')),
  result_text   TEXT,
  value_num     REAL,
  method        TEXT,                         -- 抗体克隆号 / 检测平台
  specimen      TEXT,                         -- 活检 / 手术标本 / 转移灶
  tested_on     TEXT,
  absence_state TEXT CHECK (absence_state IN
                  ('not_tested','not_detected','negative','failed','pending','vus','not_applicable')),
  source_id     TEXT REFERENCES source_refs(id),
  note          TEXT
);

-- ---------- 3. 手术（A 轨，按线分存） ----------
CREATE TABLE treatment_lines (
  id            TEXT PRIMARY KEY,
  subject_id    TEXT NOT NULL REFERENCES subjects(id),
  line_no       INTEGER NOT NULL,
  intent        TEXT CHECK (intent IN ('根治','辅助','新辅助','姑息','未注明')),
  started_on    TEXT,
  ended_on      TEXT,
  is_current    INTEGER NOT NULL DEFAULT 0 CHECK (is_current IN (0,1)),
  supersedes_id TEXT REFERENCES treatment_lines(id),
  note          TEXT,
  UNIQUE (subject_id, line_no)
);

CREATE TABLE surgery_events (
  id            TEXT PRIMARY KEY,
  subject_id    TEXT NOT NULL REFERENCES subjects(id),
  line_id       TEXT REFERENCES treatment_lines(id),
  performed_on  TEXT,
  procedure     TEXT NOT NULL CHECK (procedure IN
                  ('部分喉切除','全喉切除','咽全喉切除','口腔局部切除','下颌骨节段切除',
                   '颈清扫','皮瓣重建','气管造口','其他','未注明')),
  laterality    TEXT,
  approach      TEXT,                         -- 开放 / 经口内镜(TLM) / 机器人
  larynx_preserved INTEGER CHECK (larynx_preserved IN (0,1)),
  voice_lost    INTEGER CHECK (voice_lost IN (0,1)),
  permanent_stoma INTEGER CHECK (permanent_stoma IN (0,1)),
  note          TEXT
);

CREATE TABLE neck_dissections (
  id            TEXT PRIMARY KEY,
  surgery_id    TEXT NOT NULL REFERENCES surgery_events(id),
  side          TEXT CHECK (side IN ('左','右','双侧')),
  levels        TEXT,                         -- I-VI 组合
  spinal_accessory_preserved INTEGER CHECK (spinal_accessory_preserved IN (0,1)),
  note          TEXT
);

-- ---------- 4. 放疗（A 轨） ----------
CREATE TABLE radiotherapy_courses (
  id            TEXT PRIMARY KEY,
  subject_id    TEXT NOT NULL REFERENCES subjects(id),
  line_id       TEXT REFERENCES treatment_lines(id),
  intent        TEXT CHECK (intent IN ('根治','术后辅助','姑息','未注明')),
  technique     TEXT,                         -- IMRT / 3D-CRT / 质子 / 未注明
  started_on    TEXT,
  ended_on      TEXT,
  total_dose_gy REAL,
  fractions     INTEGER,
  note          TEXT
);

CREATE TABLE radiotherapy_sites (
  id          TEXT PRIMARY KEY,
  course_id   TEXT NOT NULL REFERENCES radiotherapy_courses(id),
  site_name   TEXT NOT NULL,
  dose_gy     REAL
);

-- ---------- 5. 系统治疗与不良反应（A 轨） ----------
CREATE TABLE regimen_drugs (
  id          TEXT PRIMARY KEY,
  line_id     TEXT NOT NULL REFERENCES treatment_lines(id),
  drug_name   TEXT NOT NULL,
  class       TEXT CHECK (class IN ('铂类','氟尿嘧啶','紫杉类','靶向','免疫检查点','其他')),
  dose_text   TEXT,                           -- 「按体表面积计算」等；无出处不编数字
  dose_source TEXT,
  note        TEXT
);

CREATE TABLE cycles (
  id          TEXT PRIMARY KEY,
  line_id     TEXT NOT NULL REFERENCES treatment_lines(id),
  cycle_no    INTEGER,
  given_on    TEXT,
  delayed     INTEGER CHECK (delayed IN (0,1)),
  delay_reason TEXT
);

CREATE TABLE adverse_events (
  id            TEXT PRIMARY KEY,
  subject_id    TEXT NOT NULL REFERENCES subjects(id),
  line_id       TEXT REFERENCES treatment_lines(id),
  occurred_on   TEXT,
  symptom       TEXT NOT NULL,
  grade_system  TEXT CHECK (grade_system IN ('CTCAE v5.0','WHO','RTOG','未分级')),
  grade         INTEGER,
  is_suspected_irae INTEGER CHECK (is_suspected_irae IN (0,1)),
  -- 患者只能记「疑似」，判定属医生
  judged_by     TEXT,
  note          TEXT
);

CREATE TABLE responses (
  id            TEXT PRIMARY KEY,
  subject_id    TEXT NOT NULL REFERENCES subjects(id),
  line_id       TEXT REFERENCES treatment_lines(id),
  assessed_on   TEXT,
  basis         TEXT,                         -- 影像 / 内镜 / 病理
  result        TEXT,                         -- 医生原话照录
  judged_by     TEXT
);

-- ---------- 6. 气道与造口（B 轨） ----------
CREATE TABLE airway_status (
  id            TEXT PRIMARY KEY,
  subject_id    TEXT NOT NULL REFERENCES subjects(id),
  kind          TEXT NOT NULL CHECK (kind IN
                  ('永久气管造口','临时气管造口','已拔管','无','未记录')),
  established_on TEXT,
  closed_on     TEXT,
  tube_type     TEXT,
  note          TEXT
);

CREATE TABLE tracheostoma_facts (
  id            TEXT PRIMARY KEY,
  subject_id    TEXT NOT NULL REFERENCES subjects(id),
  humidity_device TEXT,                       -- 湿化方式（人工鼻/HME/雾化）
  cleaning_routine TEXT,
  shower_cover  TEXT,
  note          TEXT
);

CREATE TABLE stoma_supplies (
  id          TEXT PRIMARY KEY,
  subject_id  TEXT NOT NULL REFERENCES subjects(id),
  item_name   TEXT NOT NULL,
  spec        TEXT,
  quantity    INTEGER,
  reorder_at  INTEGER,
  retired_at  TEXT                            -- 软停用，不删除历史
);

CREATE TABLE stoma_logs (
  id          TEXT PRIMARY KEY,
  subject_id  TEXT NOT NULL REFERENCES subjects(id),
  logged_on   TEXT NOT NULL,
  event       TEXT CHECK (event IN ('清洁','更换','渗漏','出血','堵塞','脱出','其他')),
  severity    TEXT CHECK (severity IN ('轻微','中等','严重','未填')),
  note        TEXT,
  recorded_by TEXT REFERENCES subject_roles(id)
);

-- 分钟级事件单独一张表：它不是「症状」，是气道事件
CREATE TABLE airway_emergencies (
  id            TEXT PRIMARY KEY,
  subject_id    TEXT NOT NULL REFERENCES subjects(id),
  occurred_at   TEXT NOT NULL,
  kind          TEXT NOT NULL CHECK (kind IN
                  ('堵管','脱管','出血','呼吸困难','窒息','其他')),
  outcome       TEXT,
  went_to       TEXT,                         -- 急诊 / 自行处理 / 未处理
  note          TEXT
);

-- ---------- 7. 声音与沟通（B 轨） ----------
CREATE TABLE voice_methods (
  id            TEXT PRIMARY KEY,
  subject_id    TEXT NOT NULL REFERENCES subjects(id),
  method        TEXT NOT NULL CHECK (method IN
                  ('食管语','电子喉','TEP发音管','书写','手势','其他','无')),
  started_on    TEXT,
  ended_on      TEXT,
  is_current    INTEGER NOT NULL DEFAULT 0 CHECK (is_current IN (0,1)),
  note          TEXT
);

CREATE TABLE voice_prostheses (
  id            TEXT PRIMARY KEY,
  subject_id    TEXT NOT NULL REFERENCES subjects(id),
  placed_on     TEXT,
  device_spec   TEXT,
  removed_on    TEXT,
  removal_reason TEXT CHECK (removal_reason IN ('漏气','感染','移位','定期更换','其他','未记录')),
  note          TEXT
);

CREATE TABLE communication_aids (
  id          TEXT PRIMARY KEY,
  subject_id  TEXT NOT NULL REFERENCES subjects(id),
  aid_type    TEXT,                           -- 写字板 / 手机打字 / 急救卡 / 其他
  note        TEXT
);

-- 自述功能：只记「能做到什么动作」，不做量表分
CREATE TABLE function_self_reports (
  id            TEXT PRIMARY KEY,
  subject_id    TEXT NOT NULL REFERENCES subjects(id),
  domain        TEXT NOT NULL CHECK (domain IN ('发声','吞咽','肩臂','张口','其他')),
  activity      TEXT NOT NULL,                -- 打电话 / 梳头 / 吃干饭 …
  ability       TEXT CHECK (ability IN ('能做到','部分能做到','做不到','未填')),
  reported_on   TEXT,
  recorded_by   TEXT REFERENCES subject_roles(id)
);

-- ---------- 8. 吞咽与营养（C 轨） ----------
CREATE TABLE feeding_routes (
  id            TEXT PRIMARY KEY,
  subject_id    TEXT NOT NULL REFERENCES subjects(id),
  route         TEXT NOT NULL CHECK (route IN ('口进','胃管','PEG','肠外','混合','未记录')),
  started_on    TEXT,
  ended_on      TEXT,
  is_current    INTEGER NOT NULL DEFAULT 0 CHECK (is_current IN (0,1))
);

CREATE TABLE aspiration_events (
  id            TEXT PRIMARY KEY,
  subject_id    TEXT NOT NULL REFERENCES subjects(id),
  occurred_on   TEXT,
  food_form     TEXT,                         -- 水 / 稀粥 / 干饭 …
  coughed       INTEGER CHECK (coughed IN (0,1)),
  -- coughed=0 不等于没误吸（沉默性误吸），单独记
  silent_suspected INTEGER CHECK (silent_suspected IN (0,1)),
  fever_after   INTEGER CHECK (fever_after IN (0,1)),
  note          TEXT
);

CREATE TABLE nutrition_intake (
  id            TEXT PRIMARY KEY,
  subject_id    TEXT NOT NULL REFERENCES subjects(id),
  recorded_on   TEXT,
  food_form     TEXT CHECK (food_form IN ('普通','软食','半流质','流质','未进食','未填')),
  appetite      TEXT CHECK (appetite IN ('好','一般','差','未填')),
  note          TEXT
);

-- ---------- 9. 放疗晚期毒性（D 轨） ----------
CREATE TABLE late_toxicity_observations (
  id            TEXT PRIMARY KEY,
  subject_id    TEXT NOT NULL REFERENCES subjects(id),
  domain        TEXT NOT NULL CHECK (domain IN
                  ('口干','龋齿','放射性骨坏死','牙关紧闭','吞咽困难','颈动脉狭窄','甲状腺功能减退','其他')),
  observed_on   TEXT,
  severity_text TEXT,                         -- 原文照录，不自创分级
  years_after_rt REAL,                        -- 由放疗结束日期派生，冗余存以便查询
  note          TEXT
);

CREATE TABLE dental_events (
  id            TEXT PRIMARY KEY,
  subject_id    TEXT NOT NULL REFERENCES subjects(id),
  occurred_on   TEXT,
  event         TEXT CHECK (event IN ('拔牙','补牙','根管','洁牙','疼痛','其他')),
  rt_disclosed  INTEGER CHECK (rt_disclosed IN (0,1)),  -- 是否告知牙医放疗史
  note          TEXT
);

CREATE TABLE trismus_measurements (
  id            TEXT PRIMARY KEY,
  subject_id    TEXT NOT NULL REFERENCES subjects(id),
  measured_on   TEXT,
  mouth_opening_mm REAL,
  note          TEXT
);

-- ---------- 10. 指标目录与观察（横切，四轨共用） ----------
CREATE TABLE metric_definitions (
  id            TEXT PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,
  label         TEXT NOT NULL,
  unit          TEXT,
  track         TEXT NOT NULL CHECK (track IN ('A','B','C','D','X')),
  grade_system  TEXT CHECK (grade_system IN ('CTCAE v5.0','WHO','RTOG','无')),
  is_chartable  INTEGER NOT NULL DEFAULT 1 CHECK (is_chartable IN (0,1)),
  version       TEXT,
  note          TEXT
);

CREATE TABLE observations (
  id            TEXT PRIMARY KEY,
  subject_id    TEXT NOT NULL REFERENCES subjects(id),
  metric_id     TEXT NOT NULL REFERENCES metric_definitions(id),
  observed_on   TEXT NOT NULL,
  value_num     REAL,
  value_text    TEXT,
  unit          TEXT,
  absence_state TEXT CHECK (absence_state IN
                  ('not_tested','not_detected','negative','failed','pending','vus','not_applicable')),
  lab_name      TEXT,                         -- 机构
  method        TEXT,                         -- 方法（换方法即断可比组）
  ref_low       REAL,
  ref_high      REAL,
  source_id     TEXT REFERENCES source_refs(id),
  recorded_by   TEXT REFERENCES subject_roles(id),
  -- 三项全空即无信息，禁止
  CHECK (value_num IS NOT NULL OR value_text IS NOT NULL OR absence_state IS NOT NULL)
);

CREATE TABLE symptom_entries (
  id            TEXT PRIMARY KEY,
  subject_id    TEXT NOT NULL REFERENCES subjects(id),
  recorded_on   TEXT NOT NULL,
  track         TEXT NOT NULL CHECK (track IN ('A','B','C','D')),
  symptom       TEXT NOT NULL,
  intensity     TEXT CHECK (intensity IN ('轻','中','重','未填')),
  note          TEXT,
  visibility    TEXT NOT NULL DEFAULT 'shared' CHECK (visibility IN ('shared','private'))
);

-- ---------- 11. 关切清单与随访 ----------
-- PCI 式：不只记「要问什么」，还记「担心什么、有没有被回应」
CREATE TABLE concerns (
  id            TEXT PRIMARY KEY,
  subject_id    TEXT NOT NULL REFERENCES subjects(id),
  raised_on     TEXT,
  text          TEXT NOT NULL,
  kind          TEXT CHECK (kind IN ('担心','要问的问题','生活困难','其他')),
  asked         INTEGER CHECK (asked IN (0,1)),
  answered_raw  TEXT,                         -- 医生怎么答（原文）
  addressed     INTEGER CHECK (addressed IN (0,1)),
  visibility    TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('shared','private')),
  recorded_by   TEXT REFERENCES subject_roles(id)
);

CREATE TABLE followup_schedules (
  id            TEXT PRIMARY KEY,
  subject_id    TEXT NOT NULL REFERENCES subjects(id),
  item          TEXT NOT NULL,                -- 影像 / 内镜 / 甲功 …
  interval_text TEXT,                         -- 只存来源原文，不给通用间隔
  next_due_on   TEXT,
  source_id     TEXT REFERENCES source_refs(id),
  source_version TEXT,
  note          TEXT
);

CREATE TABLE followup_records (
  id            TEXT PRIMARY KEY,
  subject_id    TEXT NOT NULL REFERENCES subjects(id),
  visited_on    TEXT,
  department    TEXT,
  summary_raw   TEXT,
  note          TEXT
);

CREATE TABLE tasks (
  id          TEXT PRIMARY KEY,
  subject_id  TEXT NOT NULL REFERENCES subjects(id),
  title       TEXT NOT NULL,
  due_on      TEXT,
  done_at     TEXT,
  kind        TEXT CHECK (kind IN ('复诊','检查','耗材','记录','其他'))
);

-- ---------- 12. 心理与家人（私密默认） ----------
CREATE TABLE viewpoints (
  id          TEXT PRIMARY KEY,
  subject_id  TEXT NOT NULL REFERENCES subjects(id),
  kind        TEXT NOT NULL CHECK (kind IN
                ('感受','担心','外形','性','家庭矛盾','病耻','其他')),
  text        TEXT NOT NULL,
  recorded_on TEXT,
  -- 新项目无历史数据，fail-closed：默认私密
  visibility  TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('shared','private')),
  recorded_by TEXT REFERENCES subject_roles(id)
);

CREATE TABLE caregiver_notes (
  id          TEXT PRIMARY KEY,
  subject_id  TEXT NOT NULL REFERENCES subjects(id),
  note        TEXT NOT NULL,
  recorded_on TEXT,
  recorded_by TEXT REFERENCES subject_roles(id),
  visibility  TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('shared','private'))
);

-- ---------- 13. 资料与草稿 ----------
CREATE TABLE documents (
  id            TEXT PRIMARY KEY,
  subject_id    TEXT NOT NULL REFERENCES subjects(id),
  title         TEXT,
  doc_kind      TEXT CHECK (doc_kind IN ('病理报告','影像报告','出院小结','化验单','门诊病历','其他')),
  relative_path TEXT,                         -- 只存相对路径，根目录由用户确认
  sha256        TEXT,
  imported_on   TEXT,
  parsed_state  TEXT CHECK (parsed_state IN ('未解析','解析中','已解析','解析失败')),
  UNIQUE (subject_id, sha256)
);

-- 解析结果永远只是候选，逐项确认才进事实层
CREATE TABLE candidate_fields (
  id            TEXT PRIMARY KEY,
  document_id   TEXT NOT NULL REFERENCES documents(id),
  field_path    TEXT NOT NULL,
  value_text    TEXT,
  unit          TEXT,
  confidence    TEXT,
  state         TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','accepted','rejected','edited')),
  decided_on    TEXT,
  decided_by    TEXT REFERENCES subject_roles(id)
);

CREATE TABLE exports (
  id          TEXT PRIMARY KEY,
  subject_id  TEXT NOT NULL REFERENCES subjects(id),
  created_at  TEXT NOT NULL,
  scope       TEXT,                           -- 哪些一级线 / 时间窗
  format      TEXT CHECK (format IN ('print','pdf','md','json')),
  hash        TEXT,
  includes_private INTEGER NOT NULL DEFAULT 0 CHECK (includes_private IN (0,1))
);

-- ---------- 14. 变更留痕 ----------
CREATE TABLE change_log (
  id          TEXT PRIMARY KEY,
  subject_id  TEXT REFERENCES subjects(id),
  entity      TEXT NOT NULL,
  entity_id   TEXT,
  action      TEXT NOT NULL CHECK (action IN ('insert','update','delete','confirm','reject')),
  actor       TEXT,
  at          TEXT NOT NULL,
  diff        TEXT
);

-- ---------- 索引 ----------
CREATE INDEX idx_obs_subject_metric_date ON observations(subject_id, metric_id, observed_on);
CREATE INDEX idx_obs_absence             ON observations(subject_id, absence_state);
CREATE INDEX idx_path_subject            ON pathology_reports(subject_id, reported_on);
CREATE INDEX idx_biomarker_subject       ON biomarker_results(subject_id, marker);
CREATE INDEX idx_surgery_subject         ON surgery_events(subject_id, performed_on);
CREATE INDEX idx_rt_subject              ON radiotherapy_courses(subject_id, started_on);
CREATE INDEX idx_airway_subject          ON airway_status(subject_id);
CREATE INDEX idx_stomalog_subject        ON stoma_logs(subject_id, logged_on);
CREATE INDEX idx_voice_subject           ON voice_prostheses(subject_id, placed_on);
CREATE INDEX idx_aspiration_subject      ON aspiration_events(subject_id, occurred_on);
CREATE INDEX idx_late_tox_subject        ON late_toxicity_observations(subject_id, domain);
CREATE INDEX idx_concerns_subject        ON concerns(subject_id, raised_on);
CREATE INDEX idx_viewpoints_visibility   ON viewpoints(subject_id, visibility);
CREATE INDEX idx_candidate_state         ON candidate_fields(document_id, state);
