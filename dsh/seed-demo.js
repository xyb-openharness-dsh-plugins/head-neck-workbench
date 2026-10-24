/**
 * 演示数据种子。
 *
 * 为什么需要：工作台的价值在"患者自己的时间线上有没有东西可看"。空库打开时，
 * 34 个页签全是空态，开发者与家属都无法判断布局、分组、图表是否成立。
 *
 * 纪律：
 *   - 全部标记 is_demo=1，界面顶部必须显示"演示数据"横幅，不能与真实数据混淆；
 *   - 病例是**喉癌全喉切除术后**（用户裁定喉/下咽/口腔三者等厚，取喉癌做主线，
 *     因为它同时触发气道、发声、吞咽三条轨，能验证最多页签）；
 *   - 数字都是编的，但**关系是真的**：放疗后甲减、顺铂后肌酐上升、张口度下降、
 *     体重下降、发音管定期更换 —— 这些是本癌种真实的时间结构，不是随机数；
 *   - 不写任何"建议/应该/预后"字样，只记事实与原文。
 */

export function seedDemo(store) {
  const put = (table, data) => store.insert(table, data, { silent: true })

  /* ---------- 参考数据：指标目录 ---------- */
  const metrics = [
    ['m-weight', 'weight', '体重', 'kg', 'C', '无', 1, '营养轨核心；体重下降早于白蛋白'],
    ['m-alb', 'alb', '白蛋白', 'g/L', 'C', 'CTCAE v5.0', 1, '营养与炎症的综合指标'],
    ['m-hb', 'hb', '血红蛋白', 'g/L', 'X', 'CTCAE v5.0', 1, '贫血；放化疗后常见'],
    ['m-cr', 'cr', '肌酐', 'μmol/L', 'X', 'CTCAE v5.0', 1, '顺铂肾毒性；与 eGFR 一起看'],
    ['m-anc', 'anc', '中性粒细胞', '×10⁹/L', 'X', 'CTCAE v5.0', 1, '同步放化疗后骨髓抑制'],
    ['m-tsh', 'tsh', '促甲状腺素', 'mIU/L', 'D', '无', 1, '放疗野含甲状腺 → 放疗后甲减，需长期查'],
    ['m-mouth', 'mouth', '张口度', 'mm', 'D', 'CTCAE v5.0', 1, '放疗后张口受限；用尺量，不靠感觉'],
    ['m-mucositis', 'mucositis', '口腔黏膜炎', '', 'A', 'CTCAE v5.0', 0, '分级项，不画折线'],
  ]
  for (const [id, code, label, unit, track, grade, chartable, note] of metrics) {
    put('metric_definitions', {
      id, code, label, unit, track, grade_system: grade, is_chartable: chartable, version: 'v1', note,
    })
  }

  /* ---------- 参考数据：来源 ---------- */
  const sources = [
    ['src-nccn', '指南', 'NCCN 头颈癌指南（患者版要点）', 'NCCN', '2026.1', '未核实'],
    ['src-ctcae', '共识', 'CTCAE v5.0 不良事件通用术语标准', 'NCI', '5.0', 'A'],
    ['src-rtog', '共识', 'RTOG 晚期放射毒性分级', 'RTOG', '未注明', '未核实'],
  ]
  for (const [id, kind, title, publisher, version, evidence] of sources) {
    put('source_refs', { id, kind, title, publisher, version, evidence, accessed_on: '2026-10-20' })
  }

  /* ---------- 主体 ---------- */
  const SUBJECT = 'sub-demo-1'
  put('subjects', {
    id: SUBJECT,
    display_name: '演示病例（喉癌 · 全喉切除术后）',
    birth_year: 1962,
    sex: '男',
    primary_site: '喉',
    site_detail: '声门上型',
    created_at: '2024-03-01T09:00:00.000Z',
  })

  const R_SELF = 'role-self'
  const R_DAUGHTER = 'role-daughter'
  put('subject_roles', { id: R_SELF, subject_id: SUBJECT, actor_name: '本人', role: '本人', is_self: 1, created_at: '2024-03-01T09:00:00.000Z' })
  put('subject_roles', { id: R_DAUGHTER, subject_id: SUBJECT, actor_name: '女儿', role: '家属', is_self: 0, created_at: '2024-03-01T09:05:00.000Z' })

  /* ---------- A 轨：分期 / 病理 / 分子 ---------- */
  put('staging_assertions', {
    id: 'stg-1', subject_id: SUBJECT, system: 'AJCC第8版',
    t_stage: 'T3', n_stage: 'N2', m_stage: 'M0', overall: 'IVA',
    asserted_by: '主刀医生（门诊口头）', asserted_on: '2024-03-18', source_id: 'src-nccn',
    note: '患者记得是「四期」，家属拍下的出院小结写 IVA',
  })
  put('pathology_reports', {
    id: 'path-1', subject_id: SUBJECT, reported_on: '2024-03-20', specimen: '根治标本',
    histology: '鳞状细胞癌', grade: '中分化', margin_status: '阴性',
    lymphovascular: '有', perineural: '无', variant_raw: null,
    nodes_positive: 2, nodes_examined: 34, source_id: 'src-nccn',
    raw_text: '（原文照录）喉声门上区中分化鳞状细胞癌，侵犯甲状软骨，切缘阴性，淋巴结 2/34 阳性。',
  })
  put('pathology_findings', { id: 'pf-1', report_id: 'path-1', label: '侵犯范围', value_text: '甲状软骨', verbatim: '侵犯甲状软骨' })
  put('pathology_findings', { id: 'pf-2', report_id: 'path-1', label: '淋巴结阳性数', value_num: 2, unit: '枚', verbatim: '2/34' })

  put('biomarker_results', { id: 'bm-hpv', subject_id: SUBJECT, marker: 'HPV', result_text: '阴性', absence_state: 'not_detected', method: 'PCR', specimen: '手术标本', tested_on: '2024-03-22', source_id: 'src-nccn' })
  put('biomarker_results', { id: 'bm-p16', subject_id: SUBJECT, marker: 'p16', result_text: '阴性', absence_state: 'not_detected', method: 'IHC', specimen: '手术标本', tested_on: '2024-03-22', source_id: 'src-nccn' })
  put('biomarker_results', { id: 'bm-cps', subject_id: SUBJECT, marker: 'PD-L1 CPS', result_text: 'CPS 80', value_num: 80, method: '22C3', specimen: '手术标本', tested_on: '2024-03-22', source_id: 'src-nccn', note: 'CPS 可以大于 100，不是百分比' })

  /* ---------- A 轨：治疗线 ---------- */
  put('treatment_lines', { id: 'line-1', subject_id: SUBJECT, line_no: 1, intent: '根治', started_on: '2024-03-25', ended_on: '2024-04-10', is_current: 0 })
  put('treatment_lines', { id: 'line-2', subject_id: SUBJECT, line_no: 2, intent: '辅助', started_on: '2024-05-06', ended_on: '2024-07-15', is_current: 1, supersedes_id: 'line-1' })

  put('surgery_events', {
    id: 'surg-1', subject_id: SUBJECT, line_id: 'line-1', performed_on: '2024-03-25',
    procedure: '全喉切除', laterality: '—', approach: '开放',
    larynx_preserved: 0, voice_lost: 1, permanent_stoma: 1,
    note: '同时行双侧颈清扫；术前讨论过保喉方案，因甲状软骨受侵改为全喉',
  })
  put('neck_dissections', { id: 'nd-1', surgery_id: 'surg-1', side: '双侧', levels: 'II–IV', spinal_accessory_preserved: 0, note: '右侧副神经未保留 → 右肩抬举无力' })

  put('radiotherapy_courses', {
    id: 'rt-1', subject_id: SUBJECT, line_id: 'line-2', intent: '术后辅助',
    technique: 'IMRT', started_on: '2024-05-06', ended_on: '2024-06-18',
    total_dose_gy: 60, fractions: 30,
  })
  put('radiotherapy_sites', { id: 'rts-1', course_id: 'rt-1', site_name: '瘤床', dose_gy: 60 })
  put('radiotherapy_sites', { id: 'rts-2', course_id: 'rt-1', site_name: '双侧颈部淋巴引流区', dose_gy: 54 })
  put('radiotherapy_sites', { id: 'rts-3', course_id: 'rt-1', site_name: '下颈部/甲状腺区', dose_gy: 54 })

  put('regimen_drugs', { id: 'drug-1', line_id: 'line-2', drug_name: '顺铂', class: '铂类', dose_text: '同步放化疗，每三周一次', dose_source: '出院小结原文' })
  for (let i = 1; i <= 3; i += 1) {
    put('cycles', { id: `cyc-${i}`, line_id: 'line-2', cycle_no: i, given_on: `2024-0${4 + i}-08`, delayed: i === 3 ? 1 : 0, delay_reason: i === 3 ? '中性粒细胞低，推迟一周' : null })
  }

  put('adverse_events', { id: 'ae-1', subject_id: SUBJECT, line_id: 'line-2', occurred_on: '2024-06-02', symptom: '口腔黏膜炎', grade_system: 'CTCAE v5.0', grade: 3, note: '无法进食固体，靠营养液' })
  put('adverse_events', { id: 'ae-2', subject_id: SUBJECT, line_id: 'line-2', occurred_on: '2024-06-10', symptom: '恶心', grade_system: 'CTCAE v5.0', grade: 2 })
  put('responses', { id: 'resp-1', subject_id: SUBJECT, line_id: 'line-2', assessed_on: '2026-04-18', basis: '影像', result: '（医生原话）未见复发征象', judged_by: '放疗科门诊' })

  /* ---------- B 轨：气道与造口 ---------- */
  put('airway_status', { id: 'air-1', subject_id: SUBJECT, kind: '永久气管造口', established_on: '2024-03-25', tube_type: '全喉切除后造口，无需套管', note: '造口即气道，不是"临时套管"' })
  put('tracheostoma_facts', { id: 'tsf-1', subject_id: SUBJECT, humidity_device: '人工鼻（HME）', cleaning_routine: '每日温水清洗造口周围皮肤，每周更换底盘', shower_cover: '洗澡用专用造口防护罩' })
  put('stoma_supplies', { id: 'sup-1', subject_id: SUBJECT, item_name: '造口底盘', spec: '55mm', quantity: 12, reorder_at: 4 })
  put('stoma_supplies', { id: 'sup-2', subject_id: SUBJECT, item_name: '人工鼻 HME', spec: '标准型', quantity: 20, reorder_at: 8 })
  put('stoma_logs', { id: 'sl-1', subject_id: SUBJECT, logged_on: '2026-09-20', event: '更换', severity: '轻微', note: '底盘边缘翘起，提前更换', recorded_by: R_SELF })
  put('stoma_logs', { id: 'sl-2', subject_id: SUBJECT, logged_on: '2026-10-02', event: '渗漏', severity: '中等', note: '夜间渗漏弄湿衣领，换了大一号底盘', recorded_by: R_DAUGHTER })
  put('airway_emergencies', { id: 'ae-air-1', subject_id: SUBJECT, occurred_at: '2025-01-11T03:20:00.000Z', kind: '堵管', outcome: '自行取出干痂后缓解', went_to: '自行处理', note: '凌晨突然吸不上气，咳出一块硬痂' })

  /* ---------- B 轨：声音 ---------- */
  put('voice_methods', { id: 'vm-1', subject_id: SUBJECT, method: 'TEP发音管', started_on: '2024-09-12', is_current: 1 })
  put('voice_methods', { id: 'vm-2', subject_id: SUBJECT, method: '书写', started_on: '2024-03-26', ended_on: '2024-09-11', is_current: 0, note: '术后到装管之间靠写字板' })
  put('voice_prostheses', { id: 'vp-1', subject_id: SUBJECT, placed_on: '2024-09-12', device_spec: '16Fr', removed_on: '2025-06-18', removal_reason: '定期更换' })
  put('voice_prostheses', { id: 'vp-2', subject_id: SUBJECT, placed_on: '2025-06-18', device_spec: '16Fr', removed_on: '2026-07-02', removal_reason: '漏气' })
  put('voice_prostheses', { id: 'vp-3', subject_id: SUBJECT, placed_on: '2026-07-02', device_spec: '16Fr', note: '目前在用' })
  put('communication_aids', { id: 'ca-1', subject_id: SUBJECT, aid_type: '手机打字', note: '嘈杂环境用' })
  put('communication_aids', { id: 'ca-2', subject_id: SUBJECT, aid_type: '急救卡', note: '写有"全喉切除、经造口呼吸、不可经口插管"' })

  put('function_self_reports', { id: 'fsr-1', subject_id: SUBJECT, domain: '发声', activity: '打电话', ability: '部分能做到', reported_on: '2026-09-22', recorded_by: R_SELF })
  put('function_self_reports', { id: 'fsr-2', subject_id: SUBJECT, domain: '吞咽', activity: '吃干饭', ability: '做不到', reported_on: '2026-09-22', recorded_by: R_SELF })
  put('function_self_reports', { id: 'fsr-3', subject_id: SUBJECT, domain: '肩臂', activity: '梳头', ability: '部分能做到', reported_on: '2026-09-22', recorded_by: R_SELF })
  put('function_self_reports', { id: 'fsr-4', subject_id: SUBJECT, domain: '张口', activity: '吃苹果', ability: '做不到', reported_on: '2026-09-22', recorded_by: R_SELF })

  /* ---------- C 轨：吞咽与营养 ---------- */
  put('feeding_routes', { id: 'fr-1', subject_id: SUBJECT, route: '口进', started_on: '2024-07-20', is_current: 1 })
  put('feeding_routes', { id: 'fr-2', subject_id: SUBJECT, route: '胃管', started_on: '2024-03-25', ended_on: '2024-07-19', is_current: 0, note: '术后放疗期间靠鼻饲' })
  put('aspiration_events', { id: 'asp-1', subject_id: SUBJECT, occurred_on: '2026-08-14', food_form: '白开水', coughed: 0, silent_suspected: 1, fever_after: 0, note: '喝水后声音变"湿"，没咳，家属觉得像呛了' })
  put('nutrition_intake', { id: 'ni-1', subject_id: SUBJECT, recorded_on: '2026-09-22', food_form: '软食', appetite: '一般', note: '干饭咽不下，需要汤泡' })

  /* ---------- D 轨：放疗晚期毒性 ---------- */
  put('late_toxicity_observations', { id: 'lt-1', subject_id: SUBJECT, domain: '口干', observed_on: '2026-04-18', severity_text: '（原文）中度口干，需随身带水', years_after_rt: 1.8 })
  put('late_toxicity_observations', { id: 'lt-2', subject_id: SUBJECT, domain: '牙关紧闭', observed_on: '2026-04-18', severity_text: '张口约两指', years_after_rt: 1.8 })
  put('late_toxicity_observations', { id: 'lt-3', subject_id: SUBJECT, domain: '甲状腺功能减退', observed_on: '2026-07-10', severity_text: 'TSH 升高，内分泌科开药', years_after_rt: 2.1 })
  put('dental_events', { id: 'de-1', subject_id: SUBJECT, occurred_on: '2026-05-06', event: '洁牙', rt_disclosed: 1, note: '已告知牙医放疗史，先做了评估' })
  put('trismus_measurements', { id: 'tm-1', subject_id: SUBJECT, measured_on: '2025-10-14', mouth_opening_mm: 31 })
  put('trismus_measurements', { id: 'tm-2', subject_id: SUBJECT, measured_on: '2026-04-18', mouth_opening_mm: 27 })
  put('trismus_measurements', { id: 'tm-3', subject_id: SUBJECT, measured_on: '2026-09-22', mouth_opening_mm: 25 })

  /* ---------- 指标观察（横切） ---------- */
  const dates = ['2025-01-15', '2025-04-10', '2025-07-08', '2025-10-14', '2026-01-20', '2026-04-15', '2026-07-10', '2026-09-22']
  const series = {
    'm-weight': { unit: 'kg', values: [68.0, 66.5, 64.8, 63.2, 62.0, 60.5, 59.4, 58.8], lab: '本院营养门诊' },
    'm-alb': { unit: 'g/L', values: [42, 40, 39, 38, 37, 36, 36, 35], lab: '本院检验科' },
    'm-hb': { unit: 'g/L', values: [138, 132, 128, 124, 121, 119, 118, 117], lab: '本院检验科' },
    'm-cr': { unit: 'μmol/L', values: [78, 82, 88, 91, 94, 96, 97, 98], lab: '本院检验科' },
    'm-anc': { unit: '×10⁹/L', values: [4.2, 3.6, 3.1, 2.9, 2.7, 2.6, 2.5, 2.4], lab: '本院检验科' },
    'm-tsh': { unit: 'mIU/L', values: [2.1, 2.4, 2.9, 3.6, 4.8, 5.9, 6.8, 6.9], lab: '本院检验科' },
    'm-mouth': { unit: 'mm', values: [32, 31, 30, 31, 29, 27, 26, 25], lab: '放疗科门诊' },
  }
  let obsSeq = 0
  for (const [metricId, spec] of Object.entries(series)) {
    spec.values.forEach((value, index) => {
      obsSeq += 1
      put('observations', {
        id: `obs-${obsSeq}`,
        subject_id: SUBJECT,
        metric_id: metricId,
        observed_on: dates[index],
        value_num: value,
        unit: spec.unit,
        lab_name: spec.lab,
        method: metricId === 'm-mouth' ? '张口尺测' : '静脉血',
        source_id: null,
        recorded_by: R_SELF,
      })
    })
  }

  /* ---------- 症状与感受 ---------- */
  put('symptom_entries', { id: 'sym-1', subject_id: SUBJECT, recorded_on: '2026-09-22', track: 'C', symptom: '吃干饭咽不下', intensity: '中', note: '要汤泡', visibility: 'shared' })
  put('symptom_entries', { id: 'sym-2', subject_id: SUBJECT, recorded_on: '2026-09-22', track: 'D', symptom: '口干', intensity: '中', visibility: 'shared' })
  put('symptom_entries', { id: 'sym-3', subject_id: SUBJECT, recorded_on: '2026-10-02', track: 'B', symptom: '说话久了漏气', intensity: '轻', visibility: 'shared' })

  /* ---------- 关切清单 / 随访 / 任务 ---------- */
  put('concerns', { id: 'cn-1', subject_id: SUBJECT, raised_on: '2026-09-20', text: '发音管多久换一次，漏气了自己能不能判断', kind: '要问的问题', asked: 0, visibility: 'shared', recorded_by: R_SELF })
  put('concerns', { id: 'cn-2', subject_id: SUBJECT, raised_on: '2026-09-20', text: '担心哪天夜里又堵管，家里没人会处理', kind: '担心', asked: 0, visibility: 'private', recorded_by: R_SELF })
  put('concerns', { id: 'cn-3', subject_id: SUBJECT, raised_on: '2026-10-01', text: '洗澡时造口进水怎么办', kind: '要问的问题', asked: 1, answered_raw: '（护士原话）用防护罩，别对着水冲', addressed: 1, visibility: 'shared', recorded_by: R_DAUGHTER })

  put('followup_schedules', { id: 'fs-1', subject_id: SUBJECT, item: '颈部+胸部影像', interval_text: '（出院小结原文）前两年每 3–6 个月', next_due_on: '2026-11-20', source_id: 'src-nccn', source_version: '2026.1' })
  put('followup_schedules', { id: 'fs-2', subject_id: SUBJECT, item: '喉镜/造口检查', interval_text: '（出院小结原文）每次复诊', next_due_on: '2026-11-20', source_id: 'src-nccn', source_version: '2026.1' })
  put('followup_schedules', { id: 'fs-3', subject_id: SUBJECT, item: '甲状腺功能', interval_text: '（内分泌科原文）每 6 个月', next_due_on: '2027-01-10', source_id: null })
  put('followup_records', { id: 'fr-rec-1', subject_id: SUBJECT, visited_on: '2026-04-18', department: '放疗科', summary_raw: '（原文）未见复发，口干明显，张口两指，建议口腔科评估' })
  put('followup_records', { id: 'fr-rec-2', subject_id: SUBJECT, visited_on: '2026-09-22', department: '耳鼻喉科', summary_raw: '（原文）造口通畅，发音管在位，建议年底复查影像' })

  put('tasks', { id: 'task-1', subject_id: SUBJECT, title: '预约 11 月影像复查', due_on: '2026-11-20', kind: '复诊' })
  put('tasks', { id: 'task-2', subject_id: SUBJECT, title: '补造口底盘（剩 3 片）', due_on: '2026-10-28', kind: '耗材' })
  put('tasks', { id: 'task-3', subject_id: SUBJECT, title: '记录一周饮水量', due_on: '2026-10-30', done_at: '2026-10-24T10:00:00.000Z', kind: '记录' })

  /* ---------- 心理与家人（默认私密） ---------- */
  put('viewpoints', { id: 'vpv-1', subject_id: SUBJECT, kind: '感受', text: '别人听不清就懒得说了，反正说了也要重复三遍', recorded_on: '2026-09-25', visibility: 'private', recorded_by: R_SELF })
  put('viewpoints', { id: 'vpv-2', subject_id: SUBJECT, kind: '外形', text: '夏天不敢穿圆领，怕别人看到造口', recorded_on: '2026-09-25', visibility: 'private', recorded_by: R_SELF })
  put('caregiver_notes', { id: 'cgn-1', subject_id: SUBJECT, note: '他最近夜里总起来喝水，白天没精神', recorded_on: '2026-10-02', recorded_by: R_DAUGHTER, visibility: 'private' })

  /* ---------- 资料 ---------- */
  put('documents', { id: 'doc-1', subject_id: SUBJECT, title: '术后病理报告', doc_kind: '病理报告', relative_path: '演示/病理报告_20240320.pdf', sha256: 'demo-sha-0001', imported_on: '2024-04-02', parsed_state: '已解析' })
  put('candidate_fields', { id: 'cf-1', document_id: 'doc-1', field_path: 'pathology.histology', value_text: '鳞状细胞癌', confidence: '高', state: 'accepted', decided_on: '2024-04-02', decided_by: R_SELF })
  put('candidate_fields', { id: 'cf-2', document_id: 'doc-1', field_path: 'pathology.nodes_positive', value_text: '2', confidence: '中', state: 'pending' })

  /* ---------- 演示标记 ---------- */
  store.db.prepare('INSERT OR REPLACE INTO demo_meta (k, v) VALUES (?, ?)').run('is_demo', '1')
  store.db.prepare('INSERT OR REPLACE INTO demo_meta (k, v) VALUES (?, ?)').run('seeded_at', new Date().toISOString())

  return { subject: SUBJECT, metrics: metrics.length, observations: obsSeq }
}
