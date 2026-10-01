// docs/work/의 work item을 읽고 규칙을 검사합니다. 규칙의 기준은 docs/work/README.md입니다.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { loadAgents } from './agents.mjs';

export const LEVELS = ['에픽', '티켓', '하위 티켓'];
export const STATES = ['분류 대기', '준비', '진행', '검증', '완료', '보류/종료'];
export const KINDS = ['기능', '결함', '유지보수', '운영', '제품 결정'];
export const CLOSED = new Set(['완료', '보류/종료']);
const REQUIRED = ['단계', '상태', '종류', '우선순위', '작성일'];
const KNOWN = new Set([...REQUIRED, '역할', '상위', '선행']);
const PARENT_LEVEL = { '하위 티켓': '티켓', 티켓: '에픽' };

/**
 * @typedef {{ id: string, title: string | undefined, path: string, level: string | undefined,
 *   state: string | undefined, kind: string | undefined, priority: string | undefined,
 *   created: string | undefined, role: string | undefined, parent: string | undefined, after: string[] }} WorkItem
 */

/**
 * @param {{ root: string, workDir?: string, agentsDir?: string }} options
 * @returns {{ items: Map<string, WorkItem>, children: Map<string, WorkItem[]>, errors: string[] }}
 */
export function loadWorkItems({ root, workDir = join(root, 'docs/work'), agentsDir = join(root, '.omp/agents') }) {
  const agents = loadAgents(agentsDir);
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
      else if (!agents.has(role))
        fail(`.omp/agents에 없는 역할 "${role}". 허용 값: ${[...agents.keys()].sort().join(', ')}`);
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
    items.set(id, { id, title, path, level, state, kind, priority, created, role, parent, after });
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

  return { items, children, errors };
}

/** work item 작업 브랜치 접두. `work/NNNN-<slug>` 브랜치의 존재가 착수 점유입니다(docs/work/README.md). */
export const WORK_BRANCH_PREFIX = 'work/';

/**
 * `work/NNNN-*` 브랜치 이름(원격이면 `remotes/<remote>/` 접두 허용)에서 work item 번호를 꺼냅니다.
 * @param {string} branch
 * @returns {string | undefined}
 */
export function branchItemId(branch) {
  return /^(?:remotes\/[^/]+\/)?work\/(\d{4})-/.exec(branch)?.[1];
}

/**
 * 로컬·원격의 `work/NNNN-*` 브랜치를 읽어 점유된 work item 번호와 브랜치 이름을 돌려줍니다.
 * @param {string} root
 * @returns {Map<string, string[]>}
 */
export function readClaims(root) {
  const output = execFileSync('git', ['branch', '-a', '--list', `${WORK_BRANCH_PREFIX}*`, `*/${WORK_BRANCH_PREFIX}*`], {
    cwd: root,
    encoding: 'utf8',
  });
  const claims = new Map();
  for (const line of output.split('\n')) {
    const branch = line.slice(2).trim();
    const id = branchItemId(branch);
    if (id) claims.set(id, [...(claims.get(id) ?? []), branch]);
  }
  return claims;
}

const priorityRank = (priority) => Number(/^P(\d)/.exec(priority ?? '')?.[1] ?? 9);

/**
 * 착수 가능 여부를 계산해 우선순위(`(AI 제안)` 무시) → 번호 순으로 돌려줍니다. 제외 사유가 없으면 착수 가능입니다.
 * @param {{ items: Map<string, WorkItem>, children: Map<string, WorkItem[]> }} workItems
 * @param {Map<string, string[]>} claims readClaims의 결과
 * @returns {{ item: WorkItem, reasons: string[] }[]}
 */
export function rankWorkItems({ items, children }, claims) {
  const rows = [];
  for (const item of items.values()) {
    const reasons = [];
    if (item.level === '에픽') reasons.push('에픽 (하위 티켓으로 착수)');
    const kids = children.get(item.id) ?? [];
    if (kids.length > 0) reasons.push(`하위 항목 있음 (${kids.map((kid) => kid.id).join(', ')})`);
    if (item.state !== '준비') reasons.push(`상태 ${item.state ?? '없음'} (준비만 착수)`);
    const seen = new Set();
    for (let owner = item; owner && !seen.has(owner.id); owner = items.get(owner.parent)) {
      seen.add(owner.id);
      for (const ref of owner.after) {
        const state = items.get(ref)?.state;
        if (state === '완료') continue;
        const whose = owner === item ? '' : `상위 ${owner.id}의 `;
        reasons.push(`${whose}선행 ${ref} 미완료 (${state ?? '없음'})`);
      }
    }
    const branches = claims.get(item.id);
    if (branches) reasons.push(`점유 브랜치 ${branches.join(', ')}`);
    rows.push({ item, reasons });
  }
  return rows.sort(
    (a, b) => priorityRank(a.item.priority) - priorityRank(b.item.priority) || a.item.id.localeCompare(b.item.id),
  );
}
