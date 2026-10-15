#!/usr/bin/env node
// 선택한 API의 설치·실행·검증을 같은 명령으로 제공합니다. 기준: api.config.json.
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import apiBackend from './lib/api-backend.cjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const usage = '사용법: pnpm api <sync|dev|start|build|lint|format|typecheck|test> (API_BACKEND=nestjs|fastapi)';
const [action, ...extra] = process.argv.slice(2);
// 루트 lint/format은 이미 전체 JavaScript·TypeScript를 처리하므로 Python 검사만 보탭니다.
const pythonOnly = extra.length === 1 && extra[0] === '--if-fastapi' && ['lint', 'format'].includes(action);
const uv = (...args) => ['uv', ['run', '--locked', '--directory', 'apps/api-python', ...args]];
const nest = (command) => ['pnpm', ['--filter', '@app-skeleton/api', command]];
const commands = {
  nestjs: {
    sync: [['pnpm', ['install', '--frozen-lockfile']]],
    dev: [nest('start:dev')],
    'start:dev': [nest('start:dev')],
    start: [[process.execPath, ['apps/api/dist/main.js']]],
    build: [nest('build')],
    lint: [
      ['pnpm', ['exec', 'eslint', 'apps/api']],
      ['pnpm', ['exec', 'prettier', '--check', 'apps/api']],
    ],
    format: [
      ['pnpm', ['exec', 'prettier', '--write', 'apps/api']],
      ['pnpm', ['exec', 'eslint', 'apps/api', '--fix']],
    ],
    typecheck: [nest('typecheck')],
    test: [nest('test')],
  },
  fastapi: {
    sync: [['uv', ['sync', '--locked', '--directory', 'apps/api-python']]],
    dev: [uv('python', '-m', 'skeleton_api', '--reload')],
    'start:dev': [uv('python', '-m', 'skeleton_api', '--reload')],
    start: [uv('python', '-m', 'skeleton_api')],
    build: [uv('python', '-m', 'compileall', '-q', 'src')],
    lint: [uv('ruff', 'check', '.'), uv('ruff', 'format', '--check', '.')],
    format: [uv('ruff', 'check', '--fix', '.'), uv('ruff', 'format', '.')],
    typecheck: [uv('mypy', 'src')],
    test: [uv('pytest')],
  },
};

let backend;
try {
  backend = apiBackend.readApiBackend(root);
  if ((extra.length > 0 && !pythonOnly) || !Object.hasOwn(commands[backend], action)) throw new Error(usage);
} catch (error) {
  console.error(`api: ${error.message}`);
  process.exit(2);
}

if (pythonOnly && backend !== 'fastapi') process.exit(0);

for (const [command, args] of commands[backend][action]) {
  const code = await new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: root,
      env: { ...process.env, API_BACKEND: backend },
      stdio: 'inherit',
    });
    const interrupt = () => child.kill('SIGINT');
    const terminate = () => child.kill('SIGTERM');
    process.on('SIGINT', interrupt);
    process.on('SIGTERM', terminate);
    child.once('error', (error) => {
      console.error(
        `api: ${command} 실행 실패: ${error.message}${command === 'uv' ? '. uv를 설치한 뒤 pnpm api sync를 실행하세요.' : ''}`,
      );
    });
    child.once('close', (status, signal) => {
      process.off('SIGINT', interrupt);
      process.off('SIGTERM', terminate);
      resolve(status ?? (signal === 'SIGINT' ? 130 : signal === 'SIGTERM' ? 143 : 1));
    });
  });
  if (code !== 0) process.exit(code);
}
