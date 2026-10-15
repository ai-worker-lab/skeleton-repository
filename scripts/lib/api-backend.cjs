// API 선택의 공통 진입점. CLI와 PM2가 같은 설정과 환경변수 우선순위를 사용합니다.
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const API_BACKENDS = ['nestjs', 'fastapi'];

function validateApiBackend(backend) {
  if (!API_BACKENDS.includes(backend)) {
    throw new Error(`API backend "${backend}"은 지원하지 않습니다. nestjs 또는 fastapi를 지정하세요.`);
  }
  return backend;
}

function readApiBackend(root, env = process.env) {
  if (env.API_BACKEND !== undefined) return validateApiBackend(env.API_BACKEND);
  let config;
  try {
    config = JSON.parse(readFileSync(join(root, 'api.config.json'), 'utf8'));
  } catch (error) {
    throw new Error(`api.config.json을 읽을 수 없습니다: ${error.message}`);
  }
  return validateApiBackend(config?.backend);
}

module.exports = { API_BACKENDS, readApiBackend, validateApiBackend };
