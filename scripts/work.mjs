#!/usr/bin/env node
// docs/work/의 work item을 검사(--check)하거나, 착수 가능한 항목을 계산(--next [--json] [--all])하거나,
// 에픽 → 티켓 → 하위 티켓 트리와 진행률을 출력합니다. 규칙의 기준은 docs/work/README.md입니다.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWorkItems, rankWorkItems, readClaims } from './lib/work-items.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { items, children, errors } = loadWorkItems({
  root,
  workDir: process.env.WORK_DIR,
  agentsDir: process.env.AGENTS_DIR,
});

if (process.argv.includes('--check')) {
  if (errors.length > 0) {
    console.error(`work item 규칙 위반 ${errors.length}건:`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(`work item ${items.size}개가 규칙을 통과했습니다.`);
  process.exit(0);
}

if (process.argv.includes('--next')) {
  const all = process.argv.includes('--all');
  const rows = rankWorkItems({ items, children }, readClaims(root)).filter((row) => all || row.reasons.length === 0);
  if (errors.length > 0) console.error(`규칙 위반 ${errors.length}건이 있습니다. pnpm work:check로 확인하세요.\n`);
  if (process.argv.includes('--json')) {
    const json = rows.map(({ item, reasons }) => ({
      ...item,
      eligible: reasons.length === 0,
      reasons,
    }));
    console.log(JSON.stringify(json, null, 2));
    process.exit(0);
  }
  const line = ({ item, reasons }) => {
    const role = item.role ? `${item.role} · ` : '';
    const why = reasons.length > 0 ? `\n    - ${reasons.join('\n    - ')}` : '';
    return `  ${item.id} [${item.priority}] ${role}${item.title} (${item.path})${why}`;
  };
  const eligible = rows.filter((row) => row.reasons.length === 0);
  console.log('착수 가능 (우선순위 → 번호 순)');
  if (eligible.length === 0) console.log('  (없음)');
  for (const row of eligible) console.log(line(row));
  if (all) {
    const excluded = rows.filter((row) => row.reasons.length > 0);
    console.log('\n제외');
    if (excluded.length === 0) console.log('  (없음)');
    for (const row of excluded) console.log(line(row));
  } else if (eligible.length === 0) {
    console.log('\n제외 사유는 pnpm work:next --all로 확인합니다.');
  }
  process.exit(0);
}

const progress = (item) => {
  const counted = (children.get(item.id) ?? []).filter((child) => child.state !== '보류/종료');
  if (counted.length === 0) return '';
  return `  (하위 ${counted.filter((child) => child.state === '완료').length}/${counted.length} 완료)`;
};
const print = (item, depth) => {
  const role = item.role ? `${item.role} · ` : '';
  console.log(`${'  '.repeat(depth)}${item.id} [${item.state}] ${role}${item.title}${progress(item)}`);
  for (const child of children.get(item.id) ?? []) print(child, depth + 1);
};
const roots = [...items.values()].filter((item) => !item.parent || !items.has(item.parent));
const epics = roots.filter((item) => item.level === '에픽');
const standalone = roots.filter((item) => item.level !== '에픽');
console.log('에픽');
if (epics.length === 0) console.log('  (없음)');
for (const epic of epics) print(epic, 1);
console.log('\n독립 티켓');
if (standalone.length === 0) console.log('  (없음)');
for (const item of standalone) print(item, 1);
if (errors.length > 0) console.error(`\n규칙 위반 ${errors.length}건이 있습니다. pnpm work:check로 확인하세요.`);
