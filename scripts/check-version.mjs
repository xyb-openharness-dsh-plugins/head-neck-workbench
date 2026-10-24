#!/usr/bin/env node
// 版本一致：package.json / 原型顶栏 chip / VERSION 三处必须同源。
import { readFileSync, existsSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const version = pkg.version;
const problems = [];

const html = readFileSync('prototypes/v0.1/index.html', 'utf8');
const chip = html.match(/class="vchip">v([\d.]+)/);
if (!chip) problems.push('原型顶栏找不到 vchip 版本号（P1 要求首屏可见）');
else if (chip[1] !== version) problems.push(`原型 vchip v${chip[1]} ≠ package.json ${version}`);

if (existsSync('VERSION')) {
  const v = readFileSync('VERSION', 'utf8').trim();
  if (v !== version) problems.push(`VERSION ${v} ≠ package.json ${version}`);
}

if (problems.length) {
  console.error('版本不一致：');
  for (const p of problems) console.error('  ✗ ' + p);
  process.exit(1);
}
console.log(`版本一致：${version}（package.json / 原型 vchip${existsSync('VERSION') ? ' / VERSION' : ''}）`);
