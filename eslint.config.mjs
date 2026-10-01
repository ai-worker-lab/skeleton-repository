// 저장소 전체 ESLint 설정. 영역별 규칙은 files 범위로 나눕니다. 결정 배경은 docs/adr/0004-lint-format.md.
import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import prettierConfig from 'eslint-config-prettier';
import expoConfig from 'eslint-config-expo/flat.js';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const appFiles = ['apps/app/**/*.{js,ts,tsx}'];

export default defineConfig([
  globalIgnores([
    '**/node_modules/',
    '**/dist/',
    '**/.next/',
    '**/.expo/',
    '.local/',
    'design/',
    'packages/design-tokens/generated/',
    'apps/web/next-env.d.ts',
    'apps/app/expo-env.d.ts',
  ]),

  // 공통: JavaScript·TypeScript 권장 규칙. 앱은 Expo 설정이 자체 TypeScript 규칙을 포함하므로 제외합니다.
  { files: ['**/*.{js,mjs,cjs,ts,tsx}'], ignores: appFiles, extends: [js.configs.recommended] },
  { files: ['**/*.{ts,tsx}'], ignores: appFiles, extends: [tseslint.configs.recommended] },

  // Node 실행 코드: API, 공유 패키지, 스크립트, 루트 설정.
  {
    files: ['apps/api/**/*.ts', 'packages/**/*.{ts,mjs}', 'scripts/**/*.mjs', '*.{js,mjs,cjs}'],
    languageOptions: { globals: globals.node },
  },
  { files: ['apps/api/test/**/*.ts'], languageOptions: { globals: globals.jest } },

  // 웹: Next.js 핵심 규칙과 React hooks.
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
    plugins: { '@next/next': nextPlugin },
    rules: { ...nextPlugin.configs.recommended.rules, ...nextPlugin.configs['core-web-vitals'].rules },
    settings: { next: { rootDir: 'apps/web' } },
    languageOptions: { globals: globals.browser },
  },

  // 앱: Expo 공식 규칙.
  { files: appFiles, extends: [expoConfig] },

  // 서식은 Prettier가 맡으므로 서식 관련 규칙을 끕니다. 마지막에 둡니다.
  prettierConfig,
]);
