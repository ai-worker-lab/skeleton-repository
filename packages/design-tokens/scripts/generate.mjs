// 토큰 원본(src/tokens.json)에서 웹 CSS 변수, RN용 JS 객체·타입, 디자인 tokens.css를 만든다.
// 사용법: node scripts/generate.mjs [--check]
//   --check: 파일을 쓰지 않고 생성물이 원본과 일치하는지만 확인한다. 다르면 종료 코드 1.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(packageDir, '../..');
const sourcePath = join(packageDir, 'src/tokens.json');

/** CSS에서 px 단위를 붙이는 숫자 토큰 경로 접두사. 나머지 숫자(font.weight)는 단위 없이 쓴다. */
const PX_PREFIXES = ['space', 'corner', 'font.size'];
const KEY_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const COLOR_PATTERN = /^(#[0-9a-f]{6}|rgba\(\d{1,3}, \d{1,3}, \d{1,3}, (0|1|0?\.\d+)\))$/;
const REF_PATTERN = /^\{([a-z0-9.-]+)\}$/;

function fail(message) {
  console.error(`design-tokens: ${message}`);
  process.exit(1);
}

/** 중첩 객체를 [경로, 값] 목록으로 펼친다. 원본 순서를 유지한다. */
function flatten(node, path = [], out = []) {
  for (const [key, value] of Object.entries(node)) {
    if (!KEY_PATTERN.test(key)) fail(`키 "${[...path, key].join('.')}"는 소문자·숫자·하이픈만 쓸 수 있습니다.`);
    const next = [...path, key];
    if (value !== null && typeof value === 'object') flatten(value, next, out);
    else out.push([next, value]);
  }
  return out;
}

function resolveTokens(entries) {
  const byPath = new Map(entries.map(([path, value]) => [path.join('.'), value]));
  const resolved = new Map();
  const visit = (key, stack) => {
    if (resolved.has(key)) return resolved.get(key);
    if (!byPath.has(key)) fail(`참조 대상 "${key}"가 없습니다 (${stack.join(' → ')}).`);
    if (stack.includes(key)) fail(`순환 참조: ${[...stack, key].join(' → ')}`);
    const raw = byPath.get(key);
    const ref = typeof raw === 'string' ? REF_PATTERN.exec(raw) : null;
    const value = ref ? visit(ref[1], [...stack, key]) : raw;
    resolved.set(key, value);
    return value;
  };
  return entries.map(([path]) => {
    const key = path.join('.');
    const value = visit(key, []);
    if (path[0] === 'color' && (typeof value !== 'string' || !COLOR_PATTERN.test(value))) {
      fail(`색 토큰 "${key}" 값 "${value}"는 소문자 6자리 hex 또는 "rgba(r, g, b, a)" 형식이어야 합니다.`);
    }
    if (path[0] !== 'color' && typeof value === 'number' && !Number.isFinite(value))
      fail(`"${key}" 값이 유한한 숫자가 아닙니다.`);
    return [path, value];
  });
}

function cssValue(path, value) {
  if (typeof value !== 'number') return value;
  const key = path.join('.');
  return PX_PREFIXES.some((prefix) => key === prefix || key.startsWith(`${prefix}.`)) ? `${value}px` : String(value);
}

const camel = (key) => key.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const jsKey = (key) =>
  /^\d+$/.test(key) ? key : /^[a-zA-Z_$][\w$]*$/.test(camel(key)) ? camel(key) : JSON.stringify(camel(key));

function nest(entries) {
  const root = {};
  for (const [path, value] of entries) {
    let node = root;
    path.slice(0, -1).forEach((key) => (node = node[key] ??= {}));
    node[path.at(-1)] = value;
  }
  return root;
}

function renderJs(node, indent) {
  const pad = '  '.repeat(indent + 1);
  const lines = Object.entries(node).map(
    ([key, value]) =>
      `${pad}${jsKey(key)}: ${typeof value === 'object' ? renderJs(value, indent + 1) : JSON.stringify(value)},`,
  );
  return `{\n${lines.join('\n')}\n${'  '.repeat(indent)}}`;
}

function renderDts(node, indent) {
  const pad = '  '.repeat(indent + 1);
  const lines = Object.entries(node).map(
    ([key, value]) =>
      `${pad}readonly ${jsKey(key)}: ${typeof value === 'object' ? renderDts(value, indent + 1) : JSON.stringify(value)};`,
  );
  return `{\n${lines.join('\n')}\n${'  '.repeat(indent)}}`;
}

const HEADER =
  '@app-skeleton/design-tokens에서 생성한 파일. 직접 고치지 않는다. 원본: packages/design-tokens/src/tokens.json, 생성: pnpm tokens:generate';

function build() {
  let source;
  try {
    source = JSON.parse(readFileSync(sourcePath, 'utf8'));
  } catch (error) {
    fail(`원본을 읽을 수 없습니다: ${error.message}`);
  }
  const entries = resolveTokens(flatten(source));
  const css = `/* ${HEADER} */\n:root {\n${entries.map(([path, value]) => `  --ds-${path.join('-')}: ${cssValue(path, value)};`).join('\n')}\n}\n`;
  const tree = nest(entries);
  const groups = Object.keys(tree);
  const js = `// ${HEADER}\n${groups.map((group) => `export const ${jsKey(group)} = ${renderJs(tree[group], 0)};\n`).join('\n')}\nexport const tokens = { ${groups.map(jsKey).join(', ')} };\n`;
  const dts = `// ${HEADER}\n${groups.map((group) => `export declare const ${jsKey(group)}: ${renderDts(tree[group], 0)};\n`).join('\n')}\nexport declare const tokens: {\n${groups.map((group) => `  readonly ${jsKey(group)}: typeof ${jsKey(group)};`).join('\n')}\n};\nexport type Tokens = typeof tokens;\n`;
  return new Map([
    [join(packageDir, 'generated/tokens.css'), css],
    [join(packageDir, 'generated/index.js'), js],
    [join(packageDir, 'generated/index.d.ts'), dts],
    [join(repoRoot, 'design/shared/tokens.css'), css],
  ]);
}

const outputs = build();
if (process.argv.includes('--check')) {
  const stale = [...outputs]
    .filter(([file, content]) => !existsSync(file) || readFileSync(file, 'utf8') !== content)
    .map(([file]) => relative(repoRoot, file));
  if (stale.length) fail(`생성물이 원본과 다릅니다. \`pnpm tokens:generate\`를 실행하세요:\n  ${stale.join('\n  ')}`);
  console.log(`design-tokens: 생성물 ${outputs.size}개가 최신입니다.`);
} else {
  for (const [file, content] of outputs) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
    console.log(`design-tokens: ${relative(repoRoot, file)}`);
  }
}
