#!/usr/bin/env node
// 새 복사본의 프로젝트 식별자를 초기화합니다. 계약: scripts/init-project.test.mjs.
import { isUtf8 } from 'node:buffer';
import { execFileSync, spawnSync } from 'node:child_process';
import { lstatSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { readBasePorts, BASE_PORTS_FILE } from './lib/instance.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PLACEHOLDER = { name: 'app-skeleton', snake: 'app_skeleton', repo: 'ai-worker-lab/skeleton-repository' };
const BASE_PORTS = { API_PORT: 3000, WEB_PORT: 5173, EXPO_PORT: 8081, POSTGRES_PORT: 5432, VALKEY_PORT: 6379 };
// 초기화 도구와 계약 테스트는 원본 식별자를 유지해야 새 복사본 테스트와 오류 안내가 동작합니다.
const TOOL_FILES = new Set(['scripts/init-project.mjs', 'scripts/init-project.test.mjs']);
const LOCAL_FILES = [
  '.local/instance.env',
  'infra/local/.env',
  'apps/api/.env',
  'apps/web/.env.local',
  'apps/app/.env',
];
const USAGE = `사용법:
  node scripts/init-project.mjs --name my-service --repo owner/my-service [--port-offset 0] [--dry-run] [--no-verify]
  node scripts/init-project.mjs --finish

NestJS·Next.js·Expo 전체 구성을 유지합니다. 새 복사본에서 make up 전에 실행하세요.
--repo         새 GitHub origin이 있으면 생략 가능. 템플릿 origin/원격 없음은 명시 필수.
--port-offset  API 3000·웹 5173·Expo 8081·PostgreSQL 5432·Valkey 6379에 더할 정수.
--dry-run      변경 파일·프로젝트 식별자·포트만 표시(파일/설치 변경 없음).
--no-verify    초기화만 적용. 설치·검증은 완료되지 않은 상태입니다.
--finish  초기화 후 설치·서식 정규화·빠른 검증·빌드를 실행(식별자 재치환 없음).
--help         도움말.`;

function git(...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function verify() {
  for (const args of [
    ['install', '--frozen-lockfile'],
    ['exec', 'prettier', '--write', '.'],
    ['verify', '--fast'],
    ['build'],
  ]) {
    console.log(`\n$ pnpm ${args.join(' ')}`);
    const result = spawnSync('pnpm', args, { cwd: root, stdio: 'inherit' });
    if (result.status !== 0) {
      throw new Error(
        '검사가 실패했습니다. 원인을 고친 뒤 `node scripts/init-project.mjs --finish`로 초기화 마무리를 재실행하세요.',
      );
    }
  }
  console.log('init-project: 설치·서식·빠른 검증·빌드 통과. make up 후 pnpm verify와 pnpm smoke를 실행하세요.');
}

function inferRepo() {
  let remote = '';
  try {
    remote = git('remote', 'get-url', 'origin').trim();
  } catch {
    /* 명시 입력 안내 */
  }
  const match = /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([^/]+\/[^/]+?)\/?$/.exec(
    remote,
  );
  const repo = match?.[1].replace(/\.git$/, '');
  if (!repo || repo.toLowerCase() === PLACEHOLDER.repo.toLowerCase()) {
    throw new Error(
      '새 저장소를 --repo owner/name으로 지정하세요. 템플릿 origin이나 저장소 소유자를 추정하지 않습니다.',
    );
  }
  return repo;
}

function main() {
  const { values } = parseArgs({
    options: {
      name: { type: 'string' },
      repo: { type: 'string' },
      'port-offset': { type: 'string' },
      'no-verify': { type: 'boolean' },
      'dry-run': { type: 'boolean' },
      finish: { type: 'boolean' },
      help: { type: 'boolean' },
    },
  });
  if (values.help) {
    console.log(USAGE);
    return;
  }
  const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  if (values['finish']) {
    if (Object.keys(values).some((key) => key !== 'finish'))
      throw new Error('--finish는 다른 옵션과 함께 쓰지 않습니다.');
    if (packageJson.name === PLACEHOLDER.name)
      throw new Error('아직 초기화하지 않았습니다. --name과 --repo로 먼저 초기화하세요.');
    verify();
    return;
  }
  if (packageJson.name !== PLACEHOLDER.name)
    throw new Error('이미 초기화된 저장소입니다. 초기화 마무리는 --finish를 쓰세요.');
  const name = values.name;
  if (!name || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name) || name.length > 40 || name === PLACEHOLDER.name) {
    throw new Error('--name은 템플릿 이름과 다른 소문자 kebab-case(최대 40자)여야 합니다.');
  }
  const repo = values.repo ?? inferRepo();
  if (
    !/^[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(repo) ||
    repo.toLowerCase() === PLACEHOLDER.repo.toLowerCase()
  ) {
    throw new Error('--repo는 템플릿과 다른 owner/name 형식이어야 합니다.');
  }
  const offsetText = values['port-offset'] ?? '0';
  const offset = Number(offsetText);
  if (
    !/^\d+$/.test(offsetText) ||
    !Number.isSafeInteger(offset) ||
    Math.max(...Object.values(BASE_PORTS)) + offset > 65535
  ) {
    throw new Error('--port-offset은 0 이상의 십진 정수이며 모든 포트가 65535 이하여야 합니다.');
  }
  let tracked;
  try {
    if (git('rev-parse', '--show-prefix').trim()) throw new Error('다른 저장소 내부');
    tracked = git('ls-files', '--stage', '-z').split('\0').filter(Boolean);
  } catch {
    throw new Error('독립된 git 저장소가 필요합니다. 새 복사본에서 git init -b main && git add -A 후 실행하세요.');
  }
  const required = ['package.json', 'README.md', 'CHANGELOGS.md', BASE_PORTS_FILE];
  const entries = tracked.map((entry) => {
    const [, mode, stage, file] = /^(\d+) [a-f0-9]+ (\d+)\t([\s\S]+)$/.exec(entry) ?? [];
    if (!file || stage !== '0') throw new Error('추적 파일의 충돌을 먼저 해결하세요.');
    return { mode, file };
  });
  if (required.some((file) => !entries.some((entry) => entry.file === file && entry.mode === '100644'))) {
    throw new Error('필수 템플릿 파일이 추적되지 않았습니다. 새 복사본에서 git add -A 후 실행하세요.');
  }
  // 최초 git add로 만든 복사본은 HEAD가 없으므로 staged 추가를 허용합니다.
  const hasHead = spawnSync('git', ['rev-parse', '--verify', 'HEAD'], { cwd: root, stdio: 'ignore' }).status === 0;
  if (git('diff', '--name-only').trim() || (hasHead && git('diff', '--cached', '--name-only').trim())) {
    throw new Error('기존 추적 파일 수정이 있습니다. 변경을 보존하고 깨끗한 복사본에서 초기화하세요.');
  }
  const local = LOCAL_FILES.filter((file) => {
    try {
      lstatSync(join(root, file));
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') return false;
      throw error;
    }
  });
  if (local.length)
    throw new Error(
      `기존 로컬 설정이 있습니다: ${local.join(', ')}. 서비스를 중지하고 별도 보관하거나 새 복사본에서 실행하세요. 자동 삭제하지 않습니다.`,
    );
  readBasePorts(root); // 원본 키 누락·잘못된 값은 적용 전에 발견합니다.
  const ports = Object.fromEntries(Object.entries(BASE_PORTS).map(([key, port]) => [key, port + offset]));
  const snake = name.replaceAll('-', '_');
  const changes = new Map();
  for (const { mode, file } of entries) {
    if (TOOL_FILES.has(file) || !['100644', '100755'].includes(mode)) continue;
    const path = join(root, file);
    if (!lstatSync(path).isFile()) throw new Error(`추적 파일 형식이 바뀌었습니다: ${file}`);
    const buffer = readFileSync(path);
    if (!isUtf8(buffer) || buffer.includes(0)) continue;
    const original = buffer.toString('utf8');
    let text = original;
    if (file === 'pnpm-lock.yaml') {
      text = text.replaceAll(`@${PLACEHOLDER.name}/`, `@${name}/`);
    } else {
      const replacements = { [PLACEHOLDER.repo]: repo, [PLACEHOLDER.name]: name, [PLACEHOLDER.snake]: snake };
      text = text.replace(
        /ai-worker-lab\/skeleton-repository|app-skeleton|app_skeleton/g,
        (value) => replacements[value],
      );
    }
    // 포트의 유일한 원본만 키 단위로 수정합니다. CI/컨테이너 내부 포트·무관한 숫자는 그대로 둡니다.
    if (file === BASE_PORTS_FILE) {
      text = text.replace(
        /^(API_PORT|WEB_PORT|EXPO_PORT|POSTGRES_PORT|VALKEY_PORT)=.*$/gm,
        (_, key) => `${key}=${ports[key]}`,
      );
    }
    if (file === 'README.md') {
      if (!/<!-- template:start -->[\s\S]*?<!-- template:end -->/.test(text))
        throw new Error('README.md의 템플릿 안내 블록이 없습니다. 원본에서 복구하세요.');
      text = text.replace(
        /<!-- template:start -->[\s\S]*?<!-- template:end -->/,
        '서비스 소개를 적습니다. 대상 사용자·제공 가치·현재 단계를 설명하고 첫 제품 요구 문서로 연결합니다.',
      );
    }
    if (text !== original) changes.set(file, text);
  }
  const today = new Date().toLocaleDateString('sv-SE');
  const changelog = changes.get('CHANGELOGS.md') ?? readFileSync(join(root, 'CHANGELOGS.md'), 'utf8');
  const entry = `- \`${PLACEHOLDER.repo}\`에서 \`${name}\` 초기화. 저장소 \`${repo}\`, 포트 오프셋 ${offset}. 근거: \`scripts/init-project.mjs\`.\n`;
  const heading = `## ${today}\n`;
  const firstSection = changelog.indexOf('\n## ');
  const position = firstSection < 0 ? changelog.trimEnd().length : firstSection;
  const sameDay = changelog.slice(position + 1).startsWith(heading);
  const updated = sameDay
    ? `${changelog.slice(0, position + 1 + heading.length)}\n${entry}${changelog.slice(position + 1 + heading.length)}`
    : `${changelog.slice(0, position)}\n\n${heading}\n${entry}${changelog.slice(position)}`;
  changes.set('CHANGELOGS.md', updated.replace(/\n{3,}/g, '\n\n'));
  console.log(`init-project: ${name}, 저장소 ${repo}, 포트 오프셋 ${offset}.`);
  console.log(
    Object.entries(ports)
      .map(([key, port]) => `${key}=${port}`)
      .join('\n'),
  );
  console.log(`변경 예정 ${changes.size}개 파일:\n${[...changes.keys()].map((file) => `  ${file}`).join('\n')}`);
  if (values['dry-run']) {
    console.log('init-project: 미리보기만 실행했습니다. 파일을 바꾸지 않았습니다.');
    return;
  }
  for (const [file, text] of changes) writeFileSync(join(root, file), text);
  console.log('init-project: 초기화 적용 완료. origin 주소는 변경하지 않았습니다. 새 프로젝트 원격 주소를 확인하세요.');
  if (values['no-verify'])
    console.log(
      '검증 미실행: node scripts/init-project.mjs --finish 후 make up && pnpm verify && pnpm smoke를 실행하세요.',
    );
  else verify();
}

try {
  main();
} catch (error) {
  console.error(`init-project: ${error.message}`);
  process.exitCode = 1;
}
