#!/usr/bin/env node
// 文案红线：患者侧界面不得出现诊断/处置/疗效承诺类表述。
// 依据 AGENTS.md「不做诊断与处置」与组织四条不可让步。
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const BANNED = [
  ['建议治疗', '不得给治疗建议'],
  ['建议手术', '不得给手术建议'],
  ['建议化疗', '不得给用药建议'],
  ['建议放疗', '不得给放疗建议'],
  ['可能复发', '不得预测复发'],
  ['会复发', '不得预测复发'],
  ['可以停药', '不得给停药指令'],
  ['无需就医', '不得阻止就医'],
  ['不用就医', '不得阻止就医'],
  ['治愈率', '不得给疗效数字承诺'],
  ['生存期', '不得给预后数字'],
  ['一定能治好', '不得承诺疗效'],
];

const SCAN = [
  ['prototypes', ['.html', '.js', '.css']],
  ['docs', ['.md']],
];

// 文档里讨论「哪些话不能说」是允许的：命中行含这些标记则豁免
const EXEMPT = ['不得', '禁止', '红线', '禁词', '不能写', '不写', '不许', 'BANNED'];

const hits = [];
let scanned = 0;

function walk(dir, exts) {
  let out = [];
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const e of entries) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) out = out.concat(walk(p, exts));
    else if (exts.includes(extname(p))) out.push(p);
  }
  return out;
}

for (const [root, exts] of SCAN) {
  for (const file of walk(root, exts)) {
    const text = readFileSync(file, 'utf8');
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      for (const [word, why] of BANNED) {
        if (!line.includes(word)) continue;
        if (EXEMPT.some((x) => line.includes(x))) continue;
        hits.push(`${file}:${i + 1} 「${word}」(${why})`);
      }
    });
    scanned++;
  }
}

if (hits.length) {
  console.error('文案红线违规：');
  for (const h of hits) console.error('  ✗ ' + h);
  process.exit(1);
}
console.log(`文案红线：扫描 ${scanned} 个文件，0 违规`);
