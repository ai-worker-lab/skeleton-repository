import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const source = join(dirname(fileURLToPath(import.meta.url)), '..');
// 초기화 도구는 새 서비스에서 한 번 실행한 뒤 삭제됩니다. API 선택 검사는 계속 유지합니다.
const initializationOnly = { skip: !existsSync(join(source, 'scripts/init-project.mjs')) };

function fixture(t, backend = 'nestjs') {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'api-selection-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (file, text) => {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), text);
  };
  for (const file of ['scripts/api.mjs', 'scripts/lib/api-backend.cjs']) {
    write(file, readFileSync(join(source, file)));
  }
  write('api.config.json', JSON.stringify({ backend }));
  const record = join(root, 'commands.jsonl');
  const bin = join(root, 'bin');
  mkdirSync(bin);
  const installCommand = (name) => {
    write(
      `bin/${name}`,
      `#!${process.execPath}
const fs = require('node:fs');
if (process.env.HOLD_PROCESS) {
  process.on('SIGTERM', () => { fs.writeFileSync(process.env.SIGNAL_RECORD, 'SIGTERM'); process.exit(0); });
  setInterval(() => {}, 1000);
}
fs.appendFileSync(process.env.COMMAND_RECORD, JSON.stringify({ command: ${JSON.stringify(name)}, args: process.argv.slice(2), cwd: process.cwd(), backend: process.env.API_BACKEND, database: process.env.DATABASE_URL }) + '\\n');
if (!process.env.HOLD_PROCESS) process.exit(Number(process.env.COMMAND_EXIT ?? 0));
`,
    );
    chmodSync(join(bin, name), 0o755);
  };
  const env = { ...process.env, PATH: bin, COMMAND_RECORD: record };
  delete env.API_BACKEND;
  const run = (action, extraEnv = {}, extraArgs = []) =>
    spawnSync(process.execPath, [join(root, 'scripts/api.mjs'), action, ...extraArgs], {
      cwd: root,
      env: { ...env, ...extraEnv },
      encoding: 'utf8',
    });
  const commands = () =>
    existsSync(record)
      ? readFileSync(record, 'utf8')
          .trim()
          .split('\n')
          .map((line) => JSON.parse(line))
      : [];
  return { root, write, installCommand, env, run, commands };
}

test('기본 NestJS는 uv가 없는 환경에서도 기존 API 명령을 실행한다', (t) => {
  const f = fixture(t);
  f.installCommand('pnpm');
  const result = f.run('build');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(f.commands()[0].args, ['--filter', '@app-skeleton/api', 'build']);
  assert.equal(f.commands()[0].backend, 'nestjs');
  assert.equal(f.commands()[0].cwd, f.root);
});

test('저장된 FastAPI 선택은 프로젝트 디렉터리와 잠긴 의존성으로 실행한다', (t) => {
  const f = fixture(t, 'fastapi');
  f.installCommand('uv');
  const result = f.run('typecheck');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(f.commands()[0].args, ['run', '--locked', '--directory', 'apps/api-python', 'mypy', 'src']);
});

test('일시적 API_BACKEND가 저장된 선택보다 우선하고 프로세스 설정을 보존한다', (t) => {
  const f = fixture(t);
  f.installCommand('uv');
  const result = f.run('dev', { API_BACKEND: 'fastapi', DATABASE_URL: 'postgresql://example/test' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(f.commands()[0].args.slice(-4), ['python', '-m', 'skeleton_api', '--reload']);
  assert.equal(f.commands()[0].database, 'postgresql://example/test');
  assert.equal(JSON.parse(readFileSync(join(f.root, 'api.config.json'), 'utf8')).backend, 'nestjs');
});

test('잘못된 선택과 명령은 자식 프로세스를 실행하기 전에 실패한다', (t) => {
  const f = fixture(t);
  f.installCommand('pnpm');
  for (const backend of ['', 'python', 'NESTJS']) {
    const result = f.run('build', { API_BACKEND: backend });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /nestjs 또는 fastapi/);
  }
  assert.equal(f.run('unknown').status, 2);
  assert.equal(f.run('build', {}, ['--if-fastapi']).status, 2);
  f.write('api.config.json', '{"backend":"invalid"}');
  assert.equal(f.run('build').status, 2);
  assert.deepEqual(f.commands(), []);
});

test('FastAPI 검사 실패는 같은 종료 코드를 반환하고 다음 검사를 실행하지 않는다', (t) => {
  const f = fixture(t, 'fastapi');
  f.installCommand('uv');
  const result = f.run('lint', { COMMAND_EXIT: '9' });
  assert.equal(result.status, 9);
  assert.equal(f.commands().length, 1);
  assert.deepEqual(f.commands()[0].args.slice(-3), ['ruff', 'check', '.']);
});

test('루트 서식 검사는 NestJS일 때 Python 도구를 요구하지 않는다', (t) => {
  const f = fixture(t);
  assert.equal(f.run('lint', {}, ['--if-fastapi']).status, 0);
  assert.deepEqual(f.commands(), []);
});

test('개발 서버 종료 신호를 자식 프로세스에 전달한다', { timeout: 5000 }, async (t) => {
  const f = fixture(t, 'fastapi');
  f.installCommand('uv');
  const signalFile = join(f.root, 'signal');
  const child = spawn(process.execPath, [join(f.root, 'scripts/api.mjs'), 'dev'], {
    cwd: f.root,
    env: { ...f.env, HOLD_PROCESS: '1', SIGNAL_RECORD: signalFile },
    stdio: 'ignore',
  });
  t.after(() => child.kill('SIGKILL'));
  const completed = new Promise((resolve) => child.once('close', resolve));
  const deadline = Date.now() + 2000;
  while (f.commands().length === 0 && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(f.commands().length, 1, '자식 프로세스가 시작되어야 합니다.');
  child.kill('SIGTERM');
  assert.equal(await completed, 0);
  assert.equal(readFileSync(signalFile, 'utf8'), 'SIGTERM');
});

function initializationFixture(t, backend) {
  const f = fixture(t, backend);
  for (const file of ['scripts/init-project.mjs', 'scripts/lib/instance.mjs', 'infra/local/.env.example']) {
    f.write(file, readFileSync(join(source, file)));
  }
  f.write('package.json', '{"name":"app-skeleton"}\n');
  f.write('README.md', '# app-skeleton\n');
  f.write('CHANGELOGS.md', '# 변경 기록\n\n## 2026-01-01\n\n- 템플릿\n');
  f.write('apps/api-python/pyproject.toml', '[project]\nname = "skeleton-api"\nversion = "0.1.0"\n');
  // 이름·포트처럼 보이는 잠금 파일 데이터도 템플릿 치환 대상이 되어서는 안 됩니다.
  f.write('apps/api-python/uv.lock', 'name = "skeleton-api"\nvalue = "app-skeleton 15432 app_skeleton"\n');
  execFileSync('git', ['init', '--quiet', f.root]);
  execFileSync('git', ['add', '.'], { cwd: f.root });
  f.write('apps/api-python/.env', 'DATABASE_URL=postgresql://app_skeleton@localhost:15432/app_skeleton\n');
  f.write('.local/instance.env', 'PORT_SLOT=0\n');
  f.initialize = (args = []) =>
    spawnSync(
      process.execPath,
      [join(f.root, 'scripts/init-project.mjs'), '--name', 'my-service', '--no-verify', ...args],
      {
        cwd: f.root,
        env: { ...process.env, API_BACKEND: 'invalid-shell-override' },
        encoding: 'utf8',
      },
    );
  return f;
}

test('초기화에서 FastAPI 선택을 저장하고 Python 잠금 파일과 패키지 이름을 보존한다', initializationOnly, (t) => {
  const f = initializationFixture(t, 'nestjs');
  const lock = readFileSync(join(f.root, 'apps/api-python/uv.lock'), 'utf8');
  const result = f.initialize(['--api', 'fastapi']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(readFileSync(join(f.root, 'api.config.json'), 'utf8')).backend, 'fastapi');
  assert.equal(JSON.parse(readFileSync(join(f.root, 'package.json'), 'utf8')).name, 'my-service');
  assert.equal(readFileSync(join(f.root, 'apps/api-python/uv.lock'), 'utf8'), lock);
  assert.match(readFileSync(join(f.root, 'apps/api-python/pyproject.toml'), 'utf8'), /name = "skeleton-api"/);
  assert.equal(existsSync(join(f.root, 'apps/api-python/.env')), false);
  assert.equal(existsSync(join(f.root, '.local/instance.env')), false);
  assert.equal(existsSync(join(f.root, 'scripts/init-project.mjs')), false);
});

test('초기화의 --api 생략은 추적된 선택을 유지하고 셸의 임시 선택을 무시한다', initializationOnly, (t) => {
  for (const backend of ['nestjs', 'fastapi']) {
    const f = initializationFixture(t, backend);
    const result = f.initialize();
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(readFileSync(join(f.root, 'api.config.json'), 'utf8')).backend, backend);
  }
});

test('잘못된 초기화 --api는 파일을 바꾸기 전에 실패한다', initializationOnly, (t) => {
  const f = initializationFixture(t, 'nestjs');
  const result = f.initialize(['--api', 'python']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /nestjs 또는 fastapi/);
  assert.equal(execFileSync('git', ['diff', '--exit-code'], { cwd: f.root, encoding: 'utf8' }), '');
  assert.equal(existsSync(join(f.root, 'scripts/init-project.mjs')), true);
  assert.equal(existsSync(join(f.root, 'apps/api-python/.env')), true);
});

test('PM2는 인스턴스에 저장된 과거 선택 대신 현재 API 설정을 읽는다', (t) => {
  const f = fixture(t, 'fastapi');
  copyFileSync(join(source, 'ecosystem.config.cjs'), join(f.root, 'ecosystem.config.cjs'));
  f.write('.local/instance.env', 'API_BACKEND=nestjs\nPORT=3000\nDATABASE_URL=postgresql://example/test\n');
  const result = spawnSync(
    process.execPath,
    ['-e', "console.log(JSON.stringify(require('./ecosystem.config.cjs').apps[0]))"],
    {
      cwd: f.root,
      env: f.env,
      encoding: 'utf8',
    },
  );
  assert.equal(result.status, 0, result.stderr);
  const api = JSON.parse(result.stdout);
  assert.equal(api.env.API_BACKEND, 'fastapi');
  assert.deepEqual(api.args, ['scripts/api.mjs', 'dev']);
  assert.equal(api.env.PORT, '3000');
});
