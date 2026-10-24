#!/usr/bin/env node
// 约束探针：逐条插非法值，确认 CHECK/UNIQUE/NOT NULL 真的拦得住。
// 只用内存库（:memory:），不写磁盘、不依赖 os.tmpdir()。
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sql = readFileSync(join(root, 'schema/draft/0001_initial.sql'), 'utf8');

function q(script) {
  // 每次都用全新内存库：schema + 语句
  return execFileSync('sqlite3', [':memory:'], {
    input: sql + '\n' + script,
    encoding: 'utf8',
  });
}
function run(script) {
  try { q(script); return { ok: true }; }
  catch (e) { return { ok: false, msg: String(e.stderr || e.message).trim() }; }
}
function mustFail(name, script, expect) {
  const r = run(script);
  if (r.ok) return { name, pass: false, why: '应当被拒绝，但插入成功' };
  if (expect && !r.msg.includes(expect)) return { name, pass: false, why: `报错不含「${expect}」：${r.msg}` };
  return { name, pass: true, why: r.msg.split('\n').pop() };
}
function mustPass(name, script) {
  const r = run(script);
  return r.ok ? { name, pass: true, why: '按预期接受' } : { name, pass: false, why: r.msg };
}
function mustEqual(name, script, expected) {
  try {
    const out = q(script).trim();
    return out === String(expected)
      ? { name, pass: true, why: `= ${out}` }
      : { name, pass: false, why: `期望 ${expected}，实际 ${out}` };
  } catch (e) { return { name, pass: false, why: String(e.stderr || e.message).trim() }; }
}

const S = `INSERT INTO subjects(id,display_name,primary_site,created_at) VALUES('s1','演示','喉','2026-10-25');\n`;
const results = [];

// —— 缺失态纪律 ——
results.push(mustFail('absence_state 拒绝自由文本', S + `
INSERT INTO observations(id,subject_id,metric_id,observed_on,absence_state)
VALUES('o1','s1','m1','2026-10-25','没做');`, 'CHECK'));
results.push(mustFail('observations 三项全空被拒', S + `
INSERT INTO metric_definitions(id,code,label,track) VALUES('m1','hb','血红蛋白','A');
INSERT INTO observations(id,subject_id,metric_id,observed_on) VALUES('o1','s1','m1','2026-10-25');`, 'CHECK'));
results.push(mustPass('absence_state=not_tested 可存（未检测≠阴性）', S + `
INSERT INTO metric_definitions(id,code,label,track) VALUES('m1','hb','血红蛋白','A');
INSERT INTO observations(id,subject_id,metric_id,observed_on,absence_state)
VALUES('o1','s1','m1','2026-10-25','not_tested');`));

// —— 私密是数据结构属性 ——
results.push(mustEqual('viewpoints.visibility 默认 private（fail-closed）', S + `
INSERT INTO viewpoints(id,subject_id,kind,text) VALUES('v1','s1','感受','怕');
SELECT visibility FROM viewpoints WHERE id='v1';`, 'private'));
results.push(mustFail('viewpoints.visibility 拒绝自由值', S + `
INSERT INTO viewpoints(id,subject_id,kind,text,visibility) VALUES('v1','s1','感受','怕','hidden');`, 'CHECK'));
results.push(mustEqual('symptom_entries.visibility 默认 shared', S + `
INSERT INTO symptom_entries(id,subject_id,recorded_on,track,symptom) VALUES('y1','s1','2026-10-25','B','堵管');
SELECT visibility FROM symptom_entries WHERE id='y1';`, 'shared'));
results.push(mustEqual('exports.includes_private 默认 0', S + `
INSERT INTO exports(id,subject_id,created_at) VALUES('e1','s1','2026-10-25');
SELECT includes_private FROM exports WHERE id='e1';`, '0'));

// —— 部位与轨道 ——
results.push(mustFail('primary_site 拒绝自由文本', `
INSERT INTO subjects(id,display_name,primary_site,created_at) VALUES('s1','演示','甲状腺','2026-10-25');`, 'CHECK'));
results.push(mustFail('metric_definitions.track 拒绝非法轨', S + `
INSERT INTO metric_definitions(id,code,label,track) VALUES('m1','hb','血红蛋白','E');`, 'CHECK'));
results.push(mustFail('symptom_entries.track 拒绝非法轨', S + `
INSERT INTO symptom_entries(id,subject_id,recorded_on,track,symptom) VALUES('y1','s1','2026-10-25','E','疼');`, 'CHECK'));

// —— B 轨（气道与发声） ——
results.push(mustFail('airway_status.kind 拒绝自由文本', S + `
INSERT INTO airway_status(id,subject_id,kind) VALUES('a1','s1','气切');`, 'CHECK'));
results.push(mustPass('airway_status.kind=永久气管造口 可存', S + `
INSERT INTO airway_status(id,subject_id,kind) VALUES('a1','s1','永久气管造口');`));
results.push(mustFail('voice_methods.method 拒绝自由文本', S + `
INSERT INTO voice_methods(id,subject_id,method) VALUES('w1','s1','假声');`, 'CHECK'));
results.push(mustFail('voice_prostheses.removal_reason 拒绝自由文本', S + `
INSERT INTO voice_prostheses(id,subject_id,removal_reason) VALUES('p1','s1','坏了');`, 'CHECK'));

// —— C 轨 ——
results.push(mustFail('feeding_routes.route 拒绝自由文本', S + `
INSERT INTO feeding_routes(id,subject_id,route) VALUES('f1','s1','鼻饲');`, 'CHECK'));
results.push(mustPass('aspiration_events 允许 coughed=0（沉默性误吸）', S + `
INSERT INTO aspiration_events(id,subject_id,occurred_on,coughed,silent_suspected) VALUES('x1','s1','2026-10-25',0,1);`));

// —— A 轨 ——
results.push(mustFail('surgery_events.procedure 拒绝自由文本', S + `
INSERT INTO surgery_events(id,subject_id,procedure) VALUES('g1','s1','切除');`, 'CHECK'));
results.push(mustFail('pathology_reports.margin_status 拒绝自由文本', S + `
INSERT INTO pathology_reports(id,subject_id,margin_status) VALUES('r1','s1','干净');`, 'CHECK'));
results.push(mustFail('adverse_events.grade_system 拒绝自由文本', S + `
INSERT INTO adverse_events(id,subject_id,symptom,grade_system) VALUES('ae1','s1','皮疹','轻中重');`, 'CHECK'));

// —— 唯一性 ——
results.push(mustFail('treatment_lines 同一患者线号唯一', S + `
INSERT INTO treatment_lines(id,subject_id,line_no) VALUES('l1','s1',1);
INSERT INTO treatment_lines(id,subject_id,line_no) VALUES('l2','s1',1);`, 'UNIQUE'));
results.push(mustFail('documents 同一患者同一 sha256 唯一', S + `
INSERT INTO documents(id,subject_id,sha256) VALUES('d1','s1','abc');
INSERT INTO documents(id,subject_id,sha256) VALUES('d2','s1','abc');`, 'UNIQUE'));

// —— 草稿状态 ——
results.push(mustEqual('candidate_fields.state 默认 pending', S + `
INSERT INTO documents(id,subject_id,sha256) VALUES('d1','s1','abc');
INSERT INTO candidate_fields(id,document_id,field_path) VALUES('c1','d1','pathology.margin');
SELECT state FROM candidate_fields WHERE id='c1';`, 'pending'));
results.push(mustFail('candidate_fields.state 拒绝自由值', S + `
INSERT INTO documents(id,subject_id,sha256) VALUES('d1','s1','abc');
INSERT INTO candidate_fields(id,document_id,field_path,state) VALUES('c1','d1','x','done');`, 'CHECK'));

// —— 布尔位纪律 ——
results.push(mustFail('is_current 只接受 0/1', S + `
INSERT INTO treatment_lines(id,subject_id,line_no,is_current) VALUES('l1','s1',1,2);`, 'CHECK'));

// 结构规模
const tables = q("SELECT count(*) FROM sqlite_master WHERE type='table';").trim();
const indexes = q("SELECT count(*) FROM sqlite_master WHERE type='index';").trim();
const checks = q("SELECT count(*) FROM sqlite_master WHERE sql LIKE '%CHECK%';").trim();

const pass = results.filter(r => r.pass).length;
for (const r of results) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.pass ? '' : '  ← ' + r.why}`);
}
console.log(`\n${pass}/${results.length} 通过`);
console.log(`结构规模：${tables} 张表 · ${indexes} 个索引（含 UNIQUE 自动索引）· ${checks} 张表带 CHECK`);
process.exit(pass === results.length ? 0 : 1);
