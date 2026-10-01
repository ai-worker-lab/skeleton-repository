#!/usr/bin/env node
// 템플릿 자리표시자(이름·저장소·포트)를 새 서비스 값으로 바꾸고 검사를 실행합니다. 한 번만 실행합니다.
// 사용법: node scripts/init-project.mjs --name my-service [--repo owner/name] [--port-offset 0] [--no-verify]
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const self = 'scripts/init-project.mjs';
const PLACEHOLDER = { name: 'app-skeleton', snake: 'app_skeleton', repo: 'ai-worker-lab/skeleton-repository' };
// 템플릿 포트 → 기본 포트. 새 포트는 기본 포트 + --port-offset입니다.
const PORTS = { 13000: 3000, 15173: 5173, 18081: 8081, 15432: 5432, 16379: 6379 };
const BINARY = /\.(woff2?|png|jpe?g|gif|ico|webp)$/i;

function fail(message) {
  console.error(`init-project: ${message}`);
  process.exit(1);
}

const { values } = parseArgs({
  options: {
    name: { type: 'string' },
    repo: { type: 'string' },
    'port-offset': { type: 'string', default: '0' },
    'no-verify': { type: 'boolean', default: false },
  },
});
const name = values.name ?? fail('--name이 필요합니다. 예: --name my-service');
if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name) || name.length > 40) {
  fail(`이름 "${name}"은 소문자로 시작하는 kebab-case(최대 40자)여야 합니다.`);
}
if (name === PLACEHOLDER.name) fail('템플릿 이름과 다른 이름을 지정하세요.');
const repo = values.repo ?? `ai-worker-lab/${name}`;
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) fail(`--repo "${repo}"는 owner/name 형식이어야 합니다.`);
const offset = Number(values['port-offset']);
if (!Number.isInteger(offset) || offset < 0 || Math.max(...Object.values(PORTS)) + offset > 65535) {
  fail('--port-offset은 0 이상의 정수이고 모든 포트가 65535 이하여야 합니다.');
}

const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (packageJson.name !== PLACEHOLDER.name) fail(`이미 초기화된 저장소입니다(package.json name: ${packageJson.name}).`);

const snake = name.replaceAll('-', '_');
let tracked;
try {
  tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
} catch {
  fail('git 저장소가 아닙니다. 복사한 폴더라면 먼저 `git init && git add -A`로 파일을 추적시킨 뒤 다시 실행하세요.');
}
const files = tracked.split('\n').filter((file) => file && file !== self && !BINARY.test(file));

let changed = 0;
for (const file of files) {
  const path = join(root, file);
  const original = readFileSync(path, 'utf8');
  let text = original;
  if (file === 'pnpm-lock.yaml') {
    text = text.replaceAll(`@${PLACEHOLDER.name}/`, `@${name}/`);
  } else {
    text = text
      .replaceAll(PLACEHOLDER.repo, repo)
      .replaceAll(PLACEHOLDER.name, name)
      .replaceAll(PLACEHOLDER.snake, snake);
    for (const [from, base] of Object.entries(PORTS)) {
      text = text.replace(new RegExp(`(?<!\\d)${from}(?!\\d)`, 'g'), String(base + offset));
    }
  }
  if (file === 'README.md') {
    text = text.replace(
      /<!-- template:start -->[\s\S]*?<!-- template:end -->\n/,
      '서비스 소개를 적습니다. 무엇을 누구에게 제공하는지, 현재 상태(컨셉·MVP 등)를 한두 문단으로 씁니다.\n',
    );
  }
  if (text !== original) {
    writeFileSync(path, text);
    changed++;
  }
}

const today = new Date().toLocaleDateString('sv-SE');
const changelogPath = join(root, 'CHANGELOGS.md');
const changelog = readFileSync(changelogPath, 'utf8');
const firstSection = changelog.indexOf('\n## ');
const entry = `- \`${PLACEHOLDER.repo}\` 템플릿에서 \`${name}\`로 초기화: 패키지 범위 \`@${name}/*\`, 저장소 \`${repo}\`, 로컬 포트 API ${3000 + offset}·웹 ${5173 + offset}·Expo ${8081 + offset}·PostgreSQL ${5432 + offset}·Valkey ${6379 + offset}.\n`;
// 오늘 날짜 제목이 이미 맨 위에 있으면 그 아래에 넣고, 없으면 새 날짜 제목을 만듭니다(날짜 제목 중복 금지, docs:check).
const todayHeading = `\n## ${today}\n`;
const afterHeading = firstSection + todayHeading.length;
const updated = changelog.startsWith(todayHeading, firstSection)
  ? `${changelog.slice(0, afterHeading)}\n${entry}${changelog.slice(afterHeading).replace(/^\n/, '')}`
  : `${changelog.slice(0, firstSection)}\n\n## ${today}\n\n${entry}${changelog.slice(firstSection)}`;
writeFileSync(changelogPath, updated.replace(/\n{3,}/g, '\n\n'));

console.log(`init-project: ${changed}개 파일을 바꿨습니다. 이름 ${name}, 저장소 ${repo}, 포트 오프셋 ${offset}.`);
// 템플릿 이름·포트로 만든 인스턴스 설정과 로컬 설정 파일은 낡았으므로 지웁니다. 다음 make·pnpm instance가 새 값으로 다시 만듭니다.
rmSync(join(root, '.local/instance.env'), { force: true });
const templateValue = new RegExp(
  [PLACEHOLDER.name, PLACEHOLDER.snake, ...Object.keys(PORTS)]
    .map((value) => `(?<![\\w-])${value}(?![\\w-])`)
    .join('|'),
);
for (const local of ['infra/local/.env', 'apps/api/.env', 'apps/web/.env.local', 'apps/app/.env']) {
  const path = join(root, local);
  if (existsSync(path) && templateValue.test(readFileSync(path, 'utf8'))) {
    rmSync(path);
    console.log(`init-project: 템플릿 값이 든 ${local}을 지웠습니다. make up이 새 값으로 다시 만듭니다.`);
  }
}

if (!values['no-verify']) {
  const run = (args) => {
    console.log(`\n$ pnpm ${args.join(' ')}`);
    execFileSync('pnpm', args, { cwd: root, stdio: 'inherit' });
  };
  try {
    run(['install']);
    for (const args of [['verify', '--fast'], ['build']]) run(args);
  } catch {
    fail(
      '검사가 실패했습니다. 출력을 확인해 고친 뒤 같은 명령을 직접 실행하세요. 초기화 스크립트는 지우지 않았습니다.',
    );
  }
}

rmSync(join(root, self));
console.log(`
init-project: 완료했습니다. ${self}를 지웠습니다. 다음 순서로 시작하세요.
  1. README 첫 부분에 서비스 소개를 적고 변경을 커밋합니다.
  2. make up && pnpm verify && pnpm smoke   # 로컬 인스턴스 기동과 전체 검증
  3. docs/work/TEMPLATE.md로 첫 work item을 만들고 pnpm work:next로 확인합니다.`);
