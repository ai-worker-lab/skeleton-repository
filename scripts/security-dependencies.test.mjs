import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';

// 루트에 우연히 설치된 버전 대신 Expo와 Router가 실제로 해석하는 의존성을 검사합니다.
const appRequire = createRequire(new URL('../apps/app/package.json', import.meta.url));
const expoRequire = createRequire(appRequire.resolve('expo/package.json'));
const cliRequire = createRequire(expoRequire.resolve('@expo/cli/package.json'));
const routerRequire = createRequire(appRequire.resolve('expo-router/package.json'));

function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'security-dependencies-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (file, content = '') => {
    const path = join(root, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
    return path;
  };
  return { root, write };
}

test('Expo Metro는 PNG 파일 경로에서 이미지 크기와 자산 정보를 읽는다', async (t) => {
  const f = fixture(t);
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=',
    'base64',
  );
  const path = f.write('pixel.png', png);
  const { getAssetData } = expoRequire('@expo/metro/metro/Assets');
  const asset = await getAssetData(path, 'images/pixel.png', [], 'ios', '/assets');

  assert.equal(asset.width, 1);
  assert.equal(asset.height, 1);
  assert.equal(asset.name, 'pixel');
  assert.equal(asset.type, 'png');
  assert.equal(asset.httpServerLocation, '/assets/images');
  assert.deepEqual(asset.files, [path]);
  assert.deepEqual(asset.scales, [1]);
});

test('Expo CLI glob은 API 경로 전체·첫 결과·빈 결과를 반환한다', { timeout: 5000 }, async (t) => {
  const f = fixture(t);
  for (const path of ['app/hello+api.ts', 'app/nested/world+api.tsx', 'app/ignored/skip+api.ts', 'app/index.tsx']) {
    f.write(path);
  }
  const { everyMatchAsync, anyMatchAsync } = cliRequire('./build/src/utils/glob.js');
  const pattern = '**/*+api.@(ts|tsx|js|jsx)';
  const options = { cwd: f.root, nodir: true, ignore: ['**/ignored/**'] };
  const expected = ['app/hello+api.ts', 'app/nested/world+api.tsx'];

  assert.deepEqual((await everyMatchAsync(pattern, options)).sort(), expected);
  const first = await anyMatchAsync(pattern, options);
  assert.equal(first.length, 1);
  assert.ok(expected.includes(first[0]));
  assert.deepEqual(await anyMatchAsync('missing/**/*.ts', options), []);
});

test('Expo CLI의 glob·minimatch는 중첩 경로와 확장자 선택 패턴을 유지한다', (t) => {
  const f = fixture(t);
  const paths = ['app/(tabs)/index.tsx', 'app/한글/화면.tsx', 'app/readme.md'];
  for (const path of paths) f.write(path);
  const { sync } = cliRequire('glob');
  const { minimatch } = cliRequire('minimatch');
  const pattern = '**/*.@(ts|tsx)';
  const expected = paths.slice(0, 2).sort();

  assert.deepEqual(sync(pattern, { cwd: f.root, nodir: true }).sort(), expected);
  assert.deepEqual(paths.filter((path) => minimatch(path, pattern)).sort(), expected);
  assert.equal(minimatch('app/ignored/screen.tsx', '**/ignored/**'), true);
});

test('Expo Router의 query-string은 한글·반복 값·잘못된 percent 입력을 처리한다', () => {
  const queryString = routerRequire('query-string');
  const parsed = queryString.parse('name=%ED%95%9C%EA%B8%80&tag=a&tag=b&bad=%zz&space=a+b');

  assert.deepEqual({ ...parsed }, { name: '한글', tag: ['a', 'b'], bad: '%zz', space: 'a b' });
  assert.deepEqual({ ...queryString.parse(queryString.stringify(parsed)) }, { ...parsed });
});
