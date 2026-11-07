import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const source = dirname(fileURLToPath(import.meta.url));
const defaults = ['--name', 'new-service', '--repo', 'example/new-service', '--no-verify'];

function fixture(t, backend = 'nestjs') {
  const root = mkdtempSync(join(tmpdir(), 'template-init-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const put = (file, content) => {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), content);
  };
  put('package.json', JSON.stringify({ name: 'app-skeleton', private: true }));
  put('api.config.json', `${JSON.stringify({ backend }, null, 2)}\n`);
  put('README.md', '# app-skeleton\n\n<!-- template:start -->\n안내\n<!-- template:end -->\n');
  put('CHANGELOGS.md', '# 변경 기록\n\n## 2026-01-01\n\n- 템플릿 기록.\n');
  put(
    'infra/local/.env.example',
    'POSTGRES_DB=app_skeleton\nAPI_PORT=13000\nWEB_PORT=15173\nEXPO_PORT=18081\nPOSTGRES_PORT=15432\nVALKEY_PORT=16379\n',
  );
  put('pnpm-lock.yaml', 'name: "@app-skeleton/shared"\n');
  put('sample.json', '{"name":"@app-skeleton/api","timeout":13000,"repo":"ai-worker-lab/skeleton-repository"}\n');
  put('한글 "파일".txt', 'app-skeleton\n');
  put('.gitignore', '.local/\n.env\n.env.local\n');
  mkdirSync(join(root, 'scripts/lib'), { recursive: true });
  for (const file of ['init-project.mjs', 'init-project.test.mjs', 'lib/instance.mjs', 'lib/api-backend.cjs']) {
    copyFileSync(join(source, file), join(root, 'scripts', file));
  }
  const git = (...args) => {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  };
  git('init', '-b', 'main');
  git('add', '-A');
  const run = (args = defaults, env = {}) => {
    const result = spawnSync(process.execPath, ['scripts/init-project.mjs', ...args], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, ...env },
    });
    return { ...result, output: result.stdout + result.stderr };
  };
  return { root, put, git, run, read: (file) => readFileSync(join(root, file), 'utf8') };
}

function snapshot(root, relative = '') {
  return readdirSync(join(root, relative))
    .filter((name) => name !== '.git')
    .sort()
    .flatMap((name) => {
      const file = join(relative, name);
      const path = join(root, file);
      const stat = lstatSync(path);
      if (stat.isSymbolicLink()) return [[file, readlinkSync(path)]];
      if (stat.isDirectory()) return snapshot(root, file);
      return [[file, createHash('sha256').update(readFileSync(path)).digest('hex')]];
    });
}

test('도움말과 API 선택 미리보기는 파일을 바꾸지 않는다', (t) => {
  const f = fixture(t);
  const before = snapshot(f.root);
  for (const args of [['--help'], [...defaults, '--api', 'fastapi', '--dry-run']]) {
    const result = f.run(args);
    assert.equal(result.status, 0, result.output);
    assert.deepEqual(snapshot(f.root), before);
  }
});

test('FastAPI 선택을 저장하고 Python 잠금 파일·패키지 이름·보안 패치를 보존한다', (t) => {
  const f = fixture(t);
  const lock = 'name = "skeleton-api"\nvalue = "app-skeleton 15432 app_skeleton"\n';
  const patch = '--- a/index.js\n+++ b/index.js\n@@ -1 +1 @@\n-app-skeleton\n+app_skeleton\n';
  f.put('apps/api-python/pyproject.toml', '[project]\nname = "skeleton-api"\nversion = "0.1.0"\n');
  f.put('apps/api-python/uv.lock', lock);
  f.put('patches/example.patch', patch);
  f.git('add', '-A');
  const tool = f.read('scripts/init-project.mjs');
  const tests = f.read('scripts/init-project.test.mjs');

  const result = f.run([...defaults, '--api', 'fastapi'], { API_BACKEND: 'invalid-shell-override' });

  assert.equal(result.status, 0, result.output);
  assert.equal(JSON.parse(f.read('api.config.json')).backend, 'fastapi');
  assert.equal(f.read('apps/api-python/uv.lock'), lock);
  assert.match(f.read('apps/api-python/pyproject.toml'), /name = "skeleton-api"/);
  assert.equal(f.read('patches/example.patch'), patch);
  assert.equal(f.read('scripts/init-project.mjs'), tool);
  assert.equal(f.read('scripts/init-project.test.mjs'), tests);
});

for (const backend of ['nestjs', 'fastapi']) {
  test(`--api 생략은 저장된 ${backend} 선택을 유지하고 셸의 임시 선택을 무시한다`, (t) => {
    const f = fixture(t, backend);
    const result = f.run(defaults, { API_BACKEND: 'invalid-shell-override' });

    assert.equal(result.status, 0, result.output);
    assert.equal(JSON.parse(f.read('api.config.json')).backend, backend);
  });
}

test('잘못된 --api는 파일을 바꾸기 전에 실패한다', (t) => {
  const f = fixture(t);
  const before = snapshot(f.root);
  const result = f.run([...defaults, '--api', 'python']);

  assert.equal(result.status, 1);
  assert.match(result.output, /nestjs 또는 fastapi/);
  assert.deepEqual(snapshot(f.root), before);
});

test('이름·저장소와 포트 키만 바꾸고 반복 초기화는 거부한다', (t) => {
  const f = fixture(t);
  // 3000 + 12173 = 템플릿의 WEB_PORT. 전역 순차 치환이면 다시 치환되는 경계값이다.
  const result = f.run([...defaults, '--port-offset', '12173']);
  assert.equal(result.status, 0, result.output);
  assert.equal(JSON.parse(f.read('package.json')).name, 'new-service');
  assert.deepEqual(JSON.parse(f.read('sample.json')), {
    name: '@new-service/api',
    timeout: 13000,
    repo: 'example/new-service',
  });
  assert.equal(f.read('한글 "파일".txt'), 'new-service\n');
  assert.match(
    f.read('infra/local/.env.example'),
    /API_PORT=15173\nWEB_PORT=17346\nEXPO_PORT=20254\nPOSTGRES_PORT=17605\nVALKEY_PORT=18552/,
  );
  assert.match(f.read('infra/local/.env.example'), /POSTGRES_DB=new_service/);
  assert.doesNotMatch(f.read('README.md'), /template:start/);
  assert.ok(existsSync(join(f.root, 'scripts/init-project.mjs')));
  const initialized = snapshot(f.root);
  assert.notEqual(f.run().status, 0);
  assert.deepEqual(snapshot(f.root), initialized);
});

test('원격 저장소는 새 GitHub origin에서만 추론한다', (t) => {
  const f = fixture(t);
  f.git('remote', 'add', 'origin', 'git@github.com:my-org/my-project.git');
  const result = f.run(['--name', 'new-service', '--no-verify']);
  assert.equal(result.status, 0, result.output);
  assert.equal(JSON.parse(f.read('sample.json')).repo, 'my-org/my-project');
});

test('새 저장소 이름에 템플릿 문자열이 들어 있어도 입력값 그대로 유지한다', (t) => {
  const f = fixture(t);
  const result = f.run([...defaults, '--repo', 'another-org/app-skeleton']);
  assert.equal(result.status, 0, result.output);
  assert.equal(JSON.parse(f.read('sample.json')).repo, 'another-org/app-skeleton');
});

for (const remote of [null, 'https://github.com/ai-worker-lab/skeleton-repository.git']) {
  test(`저장소 소유자를 임의로 추정하지 않는다: ${remote ?? 'origin 없음'}`, (t) => {
    const f = fixture(t);
    if (remote) f.git('remote', 'add', 'origin', remote);
    const before = snapshot(f.root);
    const result = f.run(['--name', 'new-service', '--no-verify']);
    assert.notEqual(result.status, 0);
    assert.match(result.output, /--repo/);
    assert.deepEqual(snapshot(f.root), before);
  });
}

for (const args of [
  ['--name', '../invalid'],
  [...defaults, '--port-offset', '-1'],
  [...defaults, '--port-offset', '60000'],
  [...defaults, '--port-offset', '1e3'],
  [...defaults, '--repo', 'example/../bad'],
]) {
  test(`잘못된 인자는 무변경 실패: ${args.join(' ')}`, (t) => {
    const f = fixture(t);
    const before = snapshot(f.root);
    assert.notEqual(f.run(args).status, 0);
    assert.deepEqual(snapshot(f.root), before);
  });
}

test('알 수 없는 바이너리 확장자와 심볼릭 링크는 보존한다', (t) => {
  const f = fixture(t);
  const binary = Buffer.from([0xff, 0xfe, 0x61, 0x70, 0x70]);
  f.put('asset.custom', binary);
  f.put('asset.data', Buffer.from('app-skeleton\0binary'));
  f.put('.local/outside.txt', 'app-skeleton should stay\n');
  symlinkSync('.local/outside.txt', join(f.root, 'link.txt'));
  f.git('add', '-A');
  const result = f.run();
  assert.equal(result.status, 0, result.output);
  assert.deepEqual(readFileSync(join(f.root, 'asset.custom')), binary);
  assert.equal(f.read('asset.data'), 'app-skeleton\0binary');
  assert.equal(f.read('.local/outside.txt'), 'app-skeleton should stay\n');
  assert.equal(readlinkSync(join(f.root, 'link.txt')), '.local/outside.txt');
});

for (const file of ['apps/api/.env', 'apps/api-python/.env', 'apps/web/.env.local', '.local/instance.env']) {
  test(`기존 로컬 설정은 내용과 무관하게 보호한다: ${file}`, (t) => {
    const f = fixture(t);
    f.put(file, 'CUSTOM_VALUE=keep-app-skeleton-13000\n');
    const before = snapshot(f.root);
    const result = f.run();
    assert.notEqual(result.status, 0);
    assert.match(result.output, /로컬 설정/);
    assert.deepEqual(snapshot(f.root), before);
  });
}

test('누락된 추적 파일과 기존 수정은 적용 전 중단한다', (t) => {
  const f = fixture(t);
  rmSync(join(f.root, 'sample.json'));
  const before = snapshot(f.root);
  assert.notEqual(f.run().status, 0);
  assert.deepEqual(snapshot(f.root), before);
});

test('추적하지 않는 API 선택 파일은 덮어쓰지 않는다', (t) => {
  const f = fixture(t);
  f.git('rm', '--cached', 'api.config.json');
  const before = snapshot(f.root);

  const result = f.run([...defaults, '--api', 'fastapi']);

  assert.notEqual(result.status, 0);
  assert.match(result.output, /필수 템플릿 파일/);
  assert.deepEqual(snapshot(f.root), before);
});

test('이미 커밋된 프로젝트의 staged 변경을 보호한다', (t) => {
  const f = fixture(t);
  f.git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-m', 'fixture');
  f.put('sample.json', '{}\n');
  f.git('add', 'sample.json');
  const before = snapshot(f.root);
  assert.notEqual(f.run().status, 0);
  assert.deepEqual(snapshot(f.root), before);
});

for (const backend of ['nestjs', 'fastapi']) {
  test(`${backend} 검증 실패 뒤 저장된 API로 설치·서식·검증을 마무리한다`, (t) => {
    const f = fixture(t);
    f.put(
      '.local/bin/pnpm',
      '#!/bin/sh\nprintf "%s|%s\\n" "$API_BACKEND" "$*" >> "$INIT_TEST_LOG"\nexit "${INIT_TEST_EXIT:-0}"\n',
    );
    chmodSync(join(f.root, '.local/bin/pnpm'), 0o755);
    const env = {
      PATH: `${join(f.root, '.local/bin')}:${process.env.PATH}`,
      INIT_TEST_LOG: join(f.root, '.local/commands'),
      API_BACKEND: 'invalid-shell-override',
    };
    const result = f.run([...defaults.filter((arg) => arg !== '--no-verify'), '--api', backend], {
      ...env,
      INIT_TEST_EXIT: '3',
    });
    assert.notEqual(result.status, 0);
    assert.equal(JSON.parse(f.read('package.json')).name, 'new-service');
    assert.equal(JSON.parse(f.read('api.config.json')).backend, backend);
    assert.match(result.output, /--finish/);
    const readme = f.read('README.md');
    const retry = f.run(['--finish'], env);
    assert.equal(retry.status, 0, retry.output);
    assert.equal(f.read('README.md'), readme);
    const commands = [
      'install --frozen-lockfile',
      'install --frozen-lockfile',
      ...(backend === 'fastapi' ? ['api sync'] : []),
      'exec prettier --write .',
      ...(backend === 'fastapi' ? ['api format'] : []),
      'verify --fast',
      'build',
    ];
    assert.equal(f.read('.local/commands'), `${commands.map((command) => `${backend}|${command}`).join('\n')}\n`);
  });
}
