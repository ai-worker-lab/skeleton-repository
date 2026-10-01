#!/usr/bin/env node
// docs/work/의 work item을 검사(--check)하거나 에픽 → 티켓 → 하위 티켓 트리와 진행률을 출력합니다.
// 규칙의 기준은 docs/work/README.md입니다.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const workDir = process.env.WORK_DIR ?? join(root, 'docs/work');
const agentsDir = process.env.AGENTS_DIR ?? join(root, '.omp/agents');

const LEVELS = ['에픽', '티켓', '하위 티켓'];
const STATES = ['분류 대기', '준비', '진행', '검증', '완료', '보류/종료'];
const KINDS = ['기능', '결함', '유지보수', '운영', '제품 결정'];
const CLOSED = new Set(['완료', '보류/종료']);
const REQUIRED = ['단계', '상태', '종류', '우선순위', '작성일'];
const KNOWN = new Set([...REQUIRED, '역할', '상위', '선행']);
const PARENT_LEVEL = { '하위 티켓': '티켓', 티켓: '에픽' };

const agents = new Set(
  readdirSync(agentsDir)
    .filter((name) => name.endsWith('.md'))
    .map((name) => /^name:\s*(\S+)\s*$/m.exec(readFileSync(join(agentsDir, name), 'utf8'))?.[1])
    .filter(Boolean),
);

const errors = [];
const items = new Map();

for (const name of readdirSync(workDir)
  .filter((file) => file.endsWith('.md'))
  .sort()) {
  if (name === 'README.md' || name === 'TEMPLATE.md') continue;
  const path = relative(root, join(workDir, name));
  const fail = (message) => errors.push(`${path}: ${message}`);
  const id = /^(\d{4})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.exec(name)?.[1];
  if (!id) {
    fail('파일 이름은 NNNN-short-title.md 형식이어야 합니다');
    continue;
  }
  const lines = readFileSync(join(workDir, name), 'utf8').split('\n');
  const title = new RegExp(`^# ${id} (.+)$`).exec(lines[0] ?? '')?.[1];
  if (!title) fail(`첫 줄은 "# ${id} 제목"이어야 합니다`);
  if (items.has(id)) fail(`번호 ${id}가 ${items.get(id).path}와 중복됩니다`);

  const fields = {};
  for (const line of lines.slice(1)) {
    if (line.startsWith('## ')) break;
    const field = /^- ([^:]+):\s*(.*)$/.exec(line);
    if (!field) continue;
    const [, key, value] = field;
    if (!KNOWN.has(key)) fail(`알 수 없는 필드 "${key}"`);
    else if (key in fields) fail(`필드 "${key}"가 중복됩니다`);
    else fields[key] = value.trim();
  }
  for (const key of REQUIRED) if (!fields[key]) fail(`필수 필드 "${key}"가 없습니다`);

  const { 단계: level, 상태: state, 종류: kind, 우선순위: priority, 작성일: created, 역할: role } = fields;
  if (level && !LEVELS.includes(level)) fail(`허용되지 않은 단계 "${level}". 허용 값: ${LEVELS.join(', ')}`);
  if (state && !STATES.includes(state)) fail(`허용되지 않은 상태 "${state}". 허용 값: ${STATES.join(', ')}`);
  if (kind && !KINDS.includes(kind)) fail(`허용되지 않은 종류 "${kind}". 허용 값: ${KINDS.join(', ')}`);
  if (priority && !/^P[0-3](?: \(AI 제안\))?$/.test(priority))
    fail(`우선순위 형식 오류 "${priority}". 형식: P0~P3, 선택적으로 " (AI 제안)"`);
  if (created && !/^\d{4}-\d{2}-\d{2}$/.test(created)) fail(`작성일 형식 오류 "${created}". 형식: YYYY-MM-DD`);

  if (level === '에픽') {
    if (role !== undefined) fail('에픽에는 역할을 쓰지 않습니다');
    if (fields.상위 !== undefined) fail('에픽에는 상위가 없습니다');
  } else if (level) {
    if (!role) fail(`${level}에는 역할이 필요합니다`);
    else if (!agents.has(role)) fail(`.omp/agents에 없는 역할 "${role}". 허용 값: ${[...agents].sort().join(', ')}`);
    if (level === '하위 티켓' && !fields.상위) fail('하위 티켓에는 상위 티켓이 필요합니다');
  }

  const parseRef = (value) =>
    /^\d{4}$/.test(value) ? value : (fail(`"${value}"는 4자리 work item 번호가 아닙니다`), undefined);
  const parent = fields.상위 === undefined ? undefined : parseRef(fields.상위);
  const after =
    fields.선행 === undefined
      ? []
      : fields.선행
          .split(',')
          .map((value) => parseRef(value.trim()))
          .filter(Boolean);
  items.set(id, { id, title, path, level, state, role, parent, after });
}

for (const item of items.values()) {
  const fail = (message) => errors.push(`${item.path}: ${message}`);
  if (item.parent !== undefined) {
    const parent = items.get(item.parent);
    if (!parent) fail(`상위 ${item.parent}가 없습니다`);
    else if (item.parent === item.id) fail('자기 자신을 상위로 둘 수 없습니다');
    else if (PARENT_LEVEL[item.level] && parent.level !== PARENT_LEVEL[item.level]) {
      fail(`${item.level}의 상위는 ${PARENT_LEVEL[item.level]}만 가능합니다 (${item.parent}: ${parent.level})`);
    } else if (item.level === '하위 티켓' && parent.role !== item.role) {
      fail(`하위 티켓의 역할 "${item.role}"과 상위 티켓의 역할 "${parent.role}"이 다릅니다`);
    }
  }
  for (const ref of item.after) {
    if (ref === item.id) fail('자기 자신을 선행으로 둘 수 없습니다');
    else if (!items.has(ref)) fail(`선행 ${ref}가 없습니다`);
  }
}

// 선행 관계의 순환을 찾습니다. 상위 관계는 단계 규칙상 순환할 수 없습니다.
const visiting = new Set();
const done = new Set();
const reported = new Set();
const visit = (id, chain) => {
  if (done.has(id)) return;
  if (visiting.has(id)) {
    const cycle = [...chain.slice(chain.indexOf(id)), id];
    const key = [...cycle].sort().join();
    if (!reported.has(key)) {
      reported.add(key);
      errors.push(`${items.get(id).path}: 선행 관계가 순환합니다 (${cycle.join(' → ')})`);
    }
    return;
  }
  visiting.add(id);
  for (const ref of items.get(id)?.after ?? []) if (ref !== id && items.has(ref)) visit(ref, [...chain, id]);
  visiting.delete(id);
  done.add(id);
};
for (const id of items.keys()) visit(id, []);

const children = new Map();
for (const item of items.values()) {
  if (item.parent && items.has(item.parent)) children.set(item.parent, [...(children.get(item.parent) ?? []), item]);
}
for (const item of items.values()) {
  const open = (children.get(item.id) ?? []).filter((child) => !CLOSED.has(child.state));
  if (item.state === '완료' && open.length > 0) {
    errors.push(
      `${item.path}: 완료 상태이지만 끝나지 않은 하위 항목이 있습니다 (${open.map((child) => child.id).join(', ')})`,
    );
  }
}

if (process.argv.includes('--check')) {
  if (errors.length > 0) {
    console.error(`work item 규칙 위반 ${errors.length}건:`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(`work item ${items.size}개가 규칙을 통과했습니다.`);
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
