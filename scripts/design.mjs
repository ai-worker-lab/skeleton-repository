#!/usr/bin/env node
// design/ 산출물 검사와 OpenDesign 디자인 시스템 동기화. 기준 문서: design/docs/opendesign.md
// 사용법:
//   pnpm design:check [--require-lint]  색 리터럴·handoff.md 검사, OpenDesign이 실행 중이면 od lint
//   pnpm design:sync                    design/system 패키지를 로컬 OpenDesign 사용자 디자인 시스템으로 설치
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  findDaemonUrl,
  findOpenDesignCli,
  openDesignDataDir,
  openDesignWorkspace,
  runOpenDesign,
} from './lib/opendesign.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SYSTEM_DIR = 'design/system';
/** OpenDesign 디자인 시스템 패키지 최소 구성. manifest.json·tokens.css는 pnpm tokens:generate, DESIGN.md는 designer가 씁니다. */
const PACKAGE_FILES = ['manifest.json', 'DESIGN.md', 'tokens.css'];
/** design/ 바로 아래에서 기능 산출물 폴더가 아닌 것. */
const RESERVED = new Set(['shared', 'system', 'docs']);
/** 생성물이라 색 값을 담는 파일. */
const GENERATED = new Set(['design/shared/tokens.css', 'design/system/tokens.css']);
const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}(?![\w-])|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/g;
const LINT_THRESHOLD = 'p1';

const [command, ...rest] = process.argv.slice(2);
const usage = '사용법: pnpm design:check [--require-lint] | pnpm design:sync';

function designFiles() {
  const list = (...args) =>
    execFileSync('git', ['ls-files', ...args, '--', 'design'], { cwd: root, encoding: 'utf8' }).split('\n');
  return [...new Set([...list(), ...list('--others', '--exclude-standard')])]
    .filter((file) => file && existsSync(join(root, file)))
    .filter((file) => !file.startsWith('design/.') && !file.includes('/.od-skills/'))
    .sort();
}

/** CSS로 해석되는 구간만 돌려줍니다: .css 전체, HTML의 <style> 블록과 style 속성. [시작 위치, 내용] */
function cssRegions(file, text) {
  if (file.endsWith('.css')) return [[0, text]];
  const regions = [];
  for (const match of text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi))
    regions.push([match.index + match[0].indexOf(match[1]), match[1]]);
  for (const match of text.matchAll(/\sstyle\s*=\s*(["'])([\s\S]*?)\1/gi))
    regions.push([match.index + match[0].indexOf(match[2]), match[2]]);
  return regions;
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

function check() {
  const requireLint = rest.includes('--require-lint');
  const errors = [];
  const notes = [];
  const files = designFiles();
  const html = [];

  for (const file of files) {
    if (!/\.(html|css)$/.test(file) || GENERATED.has(file)) continue;
    const text = readFileSync(join(root, file), 'utf8');
    const found = cssRegions(file, text).flatMap(([offset, region]) =>
      [...region.matchAll(COLOR_LITERAL)].map((match) => `${lineOf(text, offset + match.index)}줄 ${match[0]}`),
    );
    if (found.length > 0) {
      const shown = found.length > 6 ? `${found.slice(0, 6).join(', ')} 외 ${found.length - 6}개` : found.join(', ');
      errors.push(
        `${file}: 색 리터럴 ${found.length}개(${shown}) — 해결: var(--ds-*) 토큰을 쓰고, 붙여 넣은 :root 블록은 <link rel="stylesheet" href="../system/tokens.css">로 바꾸세요. 새 색은 packages/design-tokens/src/tokens.json에 추가합니다(ADR 0001).`,
      );
    }
    const [, area] = file.split('/');
    if (file.endsWith('.html') && file.split('/').length > 2 && !RESERVED.has(area)) html.push(file);
  }

  for (const area of new Set(html.map((file) => file.split('/')[1]))) {
    if (!existsSync(join(root, 'design', area, 'handoff.md'))) {
      errors.push(
        `design/${area}/: handoff.md가 없습니다 — 해결: 구현 담당자가 읽을 인계 문서(OpenDesign 프로젝트·화면 상태·토큰·검증)를 design/docs/opendesign.md#인계-문서 형식으로 쓰세요.`,
      );
    }
  }

  // OpenDesign이 없거나 꺼져 있으면 CI·다른 PC를 위해 건너뛰고, --require-lint면 실패로 봅니다.
  const skip = (message) => (requireLint ? errors : notes).push(`od lint: ${message}`);
  const cli = findOpenDesignCli();
  if (html.length === 0) notes.push('od lint: 검사할 산출물 HTML이 없습니다.');
  else if (!cli) skip('건너뜀 — 로컬 OpenDesign이 없습니다(design/docs/opendesign.md#준비).');
  else {
    let linted = 0;
    for (const file of html) {
      const result = runOpenDesign(['lint', join(root, file), '--fail-on', LINT_THRESHOLD, '--json']);
      if (!result.reachable) {
        skip('건너뜀 — OpenDesign 데몬에 닿지 않습니다. Open Design 앱을 실행한 뒤 다시 실행하세요.');
        break;
      }
      let report;
      try {
        report = JSON.parse(result.stdout);
      } catch {
        errors.push(
          `${file}: od lint 결과를 읽지 못했습니다 — ${(result.stderr || result.stdout).trim().slice(0, 200)}`,
        );
        continue;
      }
      linted++;
      for (const { severity = '', id = '', message = '', fix = '' } of report.findings ?? []) {
        const line = `${file}: od lint ${severity} ${id} — ${message} 해결: ${fix}`;
        (['P0', 'P1'].includes(severity.toUpperCase()) ? errors : notes).push(line);
      }
    }
    if (linted > 0) notes.push(`od lint: 산출물 ${linted}개 검사(${LINT_THRESHOLD.toUpperCase()} 이상 실패)`);
  }

  for (const note of notes) console.log(note);
  if (errors.length > 0) {
    console.error(`\n디자인 산출물 검사 실패 ${errors.length}건:`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(`디자인 산출물 검사 통과: 파일 ${files.length}개, 산출물 HTML ${html.length}개`);
}

// 설치 방식(OpenDesign 데스크톱 0.24.1에서 확인):
// - `od design-systems import-local`은 폴더를 코드 프로젝트로 보고 DESIGN.md를 새로 추출해 우리 문서를 버리므로 쓰지 않습니다.
// - 처음에는 데몬 `POST /api/design-systems/install`(source: local)로 패키지를 그대로 설치하고 Workspace에 묶습니다.
//   Workspace에 묶이지 않은 사용자 디자인 시스템은 프로젝트에서 찾을 수 없습니다(DESIGN_SYSTEM_NOT_FOUND).
// - 이후에는 패키지 파일을 설치 폴더에 덮어씁니다. 목록은 요청마다 폴더를 다시 읽습니다.
// - 사용자 디자인 시스템 기본 상태는 draft이고 draft는 프로젝트에 지정할 수 없으므로 metadata.json에 published를 둡니다.
async function sync() {
  const manifest = JSON.parse(readFileSync(join(root, SYSTEM_DIR, 'manifest.json'), 'utf8'));
  const id = `user:${manifest.id}`;
  const fail = (message) => {
    console.error(`design:sync: ${message}`);
    process.exit(1);
  };
  const dataDir = openDesignDataDir();
  if (!findOpenDesignCli() || !dataDir)
    fail(
      '로컬 OpenDesign을 찾지 못했습니다. 설치·연결 방법은 design/docs/opendesign.md#준비를 보세요(OD_DATA_DIR로 데이터 폴더 지정).',
    );
  const daemonUrl = await findDaemonUrl();
  if (!daemonUrl)
    fail('OpenDesign 데몬을 찾지 못했습니다. Open Design 앱을 실행한 뒤 다시 실행하세요(OD_DAEMON_URL로 지정 가능).');

  const workspace = openDesignWorkspace();
  if (!workspace)
    fail(
      'OpenDesign Workspace를 찾지 못했습니다. 앱에서 프로젝트를 하나 만든 뒤 다시 실행하거나 OD_WORKSPACE_ID·OD_WORKSPACE_MEMBER_ID를 지정하세요.',
    );
  const workspaceHeaders = {
    'x-od-workspace-id': workspace.workspaceId,
    'x-od-workspace-member-id': workspace.memberId,
  };
  const target = join(dataDir, 'design-systems', manifest.id);
  const metadataPath = join(target, 'metadata.json');
  const metadata = existsSync(metadataPath) ? JSON.parse(readFileSync(metadataPath, 'utf8')) : {};
  const catalog = await (await fetch(`${daemonUrl}/api/design-systems`, { headers: workspaceHeaders })).json();
  if (!catalog.designSystems.some((system) => system.id === id)) {
    // 설치 폴더 이름이 디자인 시스템 id가 되므로 manifest.id 이름의 임시 폴더로 옮겨 설치합니다.
    const stage = join(mkdtempSync(join(tmpdir(), 'design-sync-')), manifest.id);
    mkdirSync(stage);
    for (const file of PACKAGE_FILES) copyFileSync(join(root, SYSTEM_DIR, file), join(stage, file));
    const response = await fetch(`${daemonUrl}/api/design-systems/install`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: daemonUrl, ...workspaceHeaders },
      body: JSON.stringify({ source: 'local', path: stage }),
    });
    rmSync(dirname(stage), { recursive: true, force: true });
    if (response.status === 409) {
      // 설치 폴더만 지워지고 Workspace 연결 기록이 남은 경우입니다. 연결을 그대로 쓰고 폴더를 다시 만듭니다.
      mkdirSync(target, { recursive: true });
      metadata.workspaceId = workspace.workspaceId;
      console.log(`design:sync: ${id}의 기존 Workspace 연결을 다시 씁니다.`);
    } else if (!response.ok) {
      fail(`설치에 실패했습니다(${response.status}): ${(await response.text()).slice(0, 300)}`);
    } else {
      Object.assign(metadata, JSON.parse(readFileSync(metadataPath, 'utf8')));
      console.log(`design:sync: ${id} 설치(Workspace ${workspace.workspaceId})`);
    }
  }

  if (!existsSync(target))
    fail(`설치 폴더 ${target}가 없습니다. OD_DATA_DIR이 실행 중인 OpenDesign의 데이터 폴더인지 확인하세요.`);
  for (const file of PACKAGE_FILES) copyFileSync(join(root, SYSTEM_DIR, file), join(target, file));
  writeFileSync(metadataPath, `${JSON.stringify({ ...metadata, status: 'published' }, null, 2)}\n`);

  // 프로젝트가 쓰는 것과 같은 Workspace 범위로 목록을 다시 읽어 지정 가능한지 확인합니다.
  const scoped = await (await fetch(`${daemonUrl}/api/design-systems`, { headers: workspaceHeaders })).json();
  const installed = scoped.designSystems.find((system) => system.id === id);
  if (installed?.status !== 'published')
    fail(`Workspace ${workspace.workspaceId}에서 ${id}를 published로 찾지 못했습니다(${installed?.status ?? '없음'}).`);
  console.log(
    `design:sync: ${SYSTEM_DIR} → ${id} (published, Workspace ${workspace.workspaceId}). 새 프로젝트에 지정하세요: create_project의 designSystem "${id}".`,
  );
}

if (command === 'check') check();
else if (command === 'sync') await sync();
else {
  console.error(usage);
  process.exit(2);
}
