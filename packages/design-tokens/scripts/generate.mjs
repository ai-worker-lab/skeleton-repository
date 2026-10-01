// 토큰 원본(src/tokens.json)에서 웹 CSS 변수, RN용 JS 객체·타입, 디자인 tokens.css,
// OpenDesign 디자인 시스템 패키지(design/system/의 tokens.css·manifest.json)를 만든다.
// 사용법: node scripts/generate.mjs [--check]
//   --check: 파일을 쓰지 않고 생성물이 원본과 일치하는지만 확인한다. 다르면 종료 코드 1.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(packageDir, '../..');
const sourcePath = join(packageDir, 'src/tokens.json');
const openDesignPath = join(packageDir, 'src/opendesign.json');

/** CSS에서 px 단위를 붙이는 숫자 토큰 경로 접두사. 나머지 숫자(font.weight)는 단위 없이 쓴다. */
const PX_PREFIXES = ['space', 'corner', 'font.size'];
const KEY_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const COLOR_PATTERN = /^(#[0-9a-f]{6}|rgba\(\d{1,3}, \d{1,3}, \d{1,3}, (0|1|0?\.\d+)\))$/;
const REF_PATTERN = /^\{([a-z0-9.-]+)\}$/;
/** OpenDesign 리터럴 값에 색을 직접 쓰지 못하게 한다. 색은 tokens.json을 참조한다. */
const COLOR_LITERAL = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i;
/**
 * OpenDesign 디자인 시스템 tokens.css가 선언해야 하는 공통 슬롯(A1·A2·B).
 * 기준: https://github.com/nexu-io/open-design/blob/main/packages/contracts/src/design-systems/token-schema.ts
 * 빠지면 OpenDesign 산출물의 var()가 비어 규칙이 사라지므로 생성 단계에서 막는다.
 */
const OPENDESIGN_SLOTS = [
  '--bg',
  '--surface',
  '--surface-warm',
  '--fg',
  '--fg-2',
  '--muted',
  '--meta',
  '--border',
  '--border-soft',
  '--accent',
  '--accent-on',
  '--accent-hover',
  '--accent-active',
  '--success',
  '--warn',
  '--danger',
  '--font-display',
  '--font-body',
  '--font-mono',
  '--text-xs',
  '--text-sm',
  '--text-base',
  '--text-lg',
  '--text-xl',
  '--text-2xl',
  '--text-3xl',
  '--text-4xl',
  '--leading-body',
  '--leading-tight',
  '--tracking-display',
  '--space-1',
  '--space-2',
  '--space-3',
  '--space-4',
  '--space-5',
  '--space-6',
  '--space-8',
  '--space-12',
  '--section-y-desktop',
  '--section-y-tablet',
  '--section-y-phone',
  '--radius-sm',
  '--radius-md',
  '--radius-lg',
  '--radius-pill',
  '--elev-flat',
  '--elev-ring',
  '--elev-raised',
  '--focus-ring',
  '--motion-fast',
  '--motion-base',
  '--ease-standard',
  '--container-max',
  '--container-gutter-desktop',
  '--container-gutter-tablet',
  '--container-gutter-phone',
];

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

/** src/opendesign.json의 슬롯을 검증하고 [이름, CSS 값] 목록으로 바꾼다. 참조는 해석한 값으로 쓴다. */
function openDesignTokens(slots, entries) {
  const byKey = new Map(entries.map(([path, value]) => [path.join('.'), cssValue(path, value)]));
  const where = 'src/opendesign.json';
  for (const name of OPENDESIGN_SLOTS)
    if (!(name in slots)) fail(`${where}에 OpenDesign 공통 슬롯 "${name}"이 없습니다.`);
  return Object.entries(slots).map(([name, raw]) => {
    if (!OPENDESIGN_SLOTS.includes(name)) fail(`${where}의 "${name}"은 OpenDesign 공통 슬롯이 아닙니다.`);
    if (typeof raw !== 'string' || !raw.trim()) fail(`${where}의 "${name}" 값은 비어 있지 않은 문자열이어야 합니다.`);
    const ref = REF_PATTERN.exec(raw);
    if (ref) {
      if (!byKey.has(ref[1])) fail(`${where}의 "${name}"이 참조하는 토큰 "${ref[1]}"가 tokens.json에 없습니다.`);
      return [name, byKey.get(ref[1])];
    }
    if (COLOR_LITERAL.test(raw))
      fail(
        `${where}의 "${name}"에 색 리터럴 "${raw}"가 있습니다. tokens.json에 색 토큰을 두고 "{color...}"로 참조하세요.`,
      );
    return [name, raw];
  });
}

function build() {
  let source;
  let openDesign;
  try {
    source = JSON.parse(readFileSync(sourcePath, 'utf8'));
    openDesign = JSON.parse(readFileSync(openDesignPath, 'utf8'));
  } catch (error) {
    fail(`원본을 읽을 수 없습니다: ${error.message}`);
  }
  const entries = resolveTokens(flatten(source));
  const declarations = entries.map(([path, value]) => `  --ds-${path.join('-')}: ${cssValue(path, value)};`);
  const css = `/* ${HEADER} */\n:root {\n${declarations.join('\n')}\n}\n`;
  const tree = nest(entries);
  const groups = Object.keys(tree);
  const js = `// ${HEADER}\n${groups.map((group) => `export const ${jsKey(group)} = ${renderJs(tree[group], 0)};\n`).join('\n')}\nexport const tokens = { ${groups.map(jsKey).join(', ')} };\n`;
  const dts = `// ${HEADER}\n${groups.map((group) => `export declare const ${jsKey(group)}: ${renderDts(tree[group], 0)};\n`).join('\n')}\nexport declare const tokens: {\n${groups.map((group) => `  readonly ${jsKey(group)}: typeof ${jsKey(group)};`).join('\n')}\n};\nexport type Tokens = typeof tokens;\n`;

  // OpenDesign 디자인 시스템 패키지: 앱 토큰(--ds-*)과 OpenDesign 공통 슬롯을 한 :root에 둔다.
  // OpenDesign 에이전트는 이 블록을 산출물에 붙이고, 저장소에 스냅숏할 때는 이 파일을 링크한다(design/docs/opendesign.md).
  const slots = openDesignTokens(openDesign.tokens ?? {}, entries);
  const openDesignCss = `/* ${HEADER}, packages/design-tokens/src/opendesign.json */\n:root {\n${declarations.join('\n')}\n\n  /* OpenDesign 공통 슬롯 */\n${slots.map(([name, value]) => `  ${name}: ${value};`).join('\n')}\n}\n`;
  for (const key of ['id', 'name', 'category', 'description'])
    if (typeof openDesign[key] !== 'string' || !openDesign[key])
      fail(`src/opendesign.json에 "${key}" 문자열이 필요합니다.`);
  const manifest = {
    schemaVersion: 'od-design-system-project/v1',
    id: openDesign.id,
    name: openDesign.name,
    category: openDesign.category,
    description: openDesign.description,
    source: {
      type: 'local',
      origin: 'packages/design-tokens/src/tokens.json + src/opendesign.json (pnpm tokens:generate)',
    },
    files: { design: 'DESIGN.md', tokens: 'tokens.css' },
  };
  return new Map([
    [join(packageDir, 'generated/tokens.css'), css],
    [join(packageDir, 'generated/index.js'), js],
    [join(packageDir, 'generated/index.d.ts'), dts],
    [join(repoRoot, 'design/shared/tokens.css'), css],
    [join(repoRoot, 'design/system/tokens.css'), openDesignCss],
    [join(repoRoot, 'design/system/manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`],
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
