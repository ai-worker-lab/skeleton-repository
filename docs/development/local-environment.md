# 로컬 개발 환경

[infra/local/compose.yaml](../../infra/local/compose.yaml)은 로컬 PostgreSQL 17과 Valkey 8을 제공합니다. 구성 기본값은 이 파일, 개인 설정은 `infra/local/.env`에서 관리합니다. 추적되는 [환경변수 예시](../../infra/local/.env.example)에는 안전한 로컬 값만 둡니다. 서비스별 소유권과 원격 환경은 [환경과 비밀값 관리](environment-secrets.md)를 참고하세요.

## 시작

```sh
pnpm install
cp -n infra/local/.env.example infra/local/.env
chmod 600 infra/local/.env
cp -n apps/api/.env.example apps/api/.env
chmod 600 apps/api/.env
cp -n apps/web/.env.example apps/web/.env.local
cp -n apps/app/.env.example apps/app/.env
make up
make status
```

웹·앱의 `.env.example`은 각 영역 담당자가 관리하는 추적 예시입니다. 웹 설정은 `API_INTERNAL_URL`, 앱 설정은 `EXPO_PUBLIC_API_BASE_URL`이며 `cp -n`은 기존 개인 설정을 덮어쓰지 않습니다.

API는 시작 시 `apps/api/.env`가 있으면 읽고, 이미 프로세스 환경에 있는 값은 덮어쓰지 않습니다. 필수 설정은 `DATABASE_URL`(PostgreSQL 연결 문자열)이고, `PORT`(기본 `13000`)는 선택입니다. `DATABASE_URL`이 빠지면 API는 `DATABASE_URL is required` 오류로 종료됩니다. `.env`는 커밋하지 마세요. 마이그레이션은 API 시작 시 PostgreSQL advisory lock을 사용하여 인스턴스 간 직렬 실행됩니다.

`Makefile`은 인프라(PostgreSQL·Valkey)는 Docker Compose(project `app-skeleton`), API·웹·Expo 개발 서버는 저장소 전용 PM2(`ecosystem.config.cjs`의 `app-skeleton-api`·`app-skeleton-web`·`app-skeleton-app`)로 관리합니다. 세 서버 시작 대상은 `packages/shared`를 먼저 빌드합니다. 웹·앱의 `@app-skeleton/shared` import는 `packages/shared/package.json`의 `exports`/`main`이 가리키는 `dist/` 산출물을 사용합니다. `@app-skeleton/design-tokens`는 커밋된 `generated/` 생성물을 가리키므로 빌드 단계가 없으며, 토큰을 바꾼 뒤에는 `pnpm tokens:generate`를 실행합니다([사용법](../../packages/design-tokens/docs/usage.md)). PM2 표시는 프로세스가 응답 가능함을 보장하지 않으므로, `make status`에 `online`으로 보여도 실패 시 `.local/pm2/logs/`의 서비스별 로그를 확인하세요.

| 영역 | 시작 | 종료 | 재시작 |
| --- | --- | --- | --- |
| 전체 | `make up` | `make down` | `make restart` |
| DB·Valkey | `make infra-up` | `make infra-down` | `make infra-restart` |
| API | `make api-up` | `make api-down` | `make api-restart` |
| 웹 | `make web-up` | `make web-down` | `make web-restart` |
| Expo | `make app-up` | `make app-down` | `make app-restart` |

웹 개발 서버는 `next dev --port 15173`로 실행하며 `http://localhost:15173`에서 접근합니다. (웹 패키지의 `start` 스크립트가 해당 포트를 지정합니다.) API 주소는 `http://localhost:13000/api/health`, Expo Metro는 `http://localhost:18081`입니다. PostgreSQL 호스트 포트는 기본 `15432`, Valkey 호스트 포트는 `16379`입니다. 각 값은 기본 포트(API 3000, 웹 5173, Expo 8081, PostgreSQL 5432, Valkey 6379)에 같은 오프셋을 더한 것입니다. 같은 PC에서 여러 서비스를 함께 실행할 때 서로 겹치지 않게 정합니다. Compose는 Valkey 서비스를 제공하지만 API 소스(`apps/api/src`)에는 Valkey/Redis 연결 소비 코드가 없어 현재 API는 이를 사용하지 않습니다([ADR 0005](../adr/0005-keep-valkey-local-infra.md)). Compose 기본 자격 증명은 로컬 전용이며 프로덕션에 복사하지 않습니다.

## 테스트

```sh
make infra-up   # 테스트는 실제 PostgreSQL이 필요합니다
pnpm test       # 공용 패키지 빌드 후 test 스크립트가 있는 모든 workspace의 테스트 실행
```

현재 테스트는 API 통합 테스트(`apps/api/test/*.e2e-spec.ts`, Jest + ts-jest)뿐입니다. 테스트마다 일회용 데이터베이스(`app_skeleton_test_*`)를 만들고 끝나면 지우므로 개발 DB의 데이터는 바뀌지 않습니다. 관리 연결은 `TEST_DATABASE_URL`, 없으면 `apps/api/.env`의 `DATABASE_URL`을 쓰며, 그 사용자에게 데이터베이스 생성 권한이 필요합니다(로컬 Compose 사용자는 권한이 있습니다). 한 영역만 실행하려면 `pnpm --filter @app-skeleton/api test`를 씁니다.

## 코드 검사

커밋 전에 `pnpm lint`(ESLint + Prettier 검사)를 실행하고, 서식 오류는 `pnpm format`으로 고칩니다. 규칙은 루트 `eslint.config.mjs`와 `.prettierrc.json`에 있으며 도구 선택 배경은 [ADR 0004](../adr/0004-lint-format.md)입니다. Markdown 문서는 Prettier 대상이 아닙니다.

## CI

[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)이 `main` 대상 PR과 `main` push에서 `pnpm install --frozen-lockfile` 후 `tokens:check`, `work:check`, `lint`, `typecheck`, `build`, `test`를 실행합니다. 지원 Node.js LTS 버전(22·24·26)마다 따로 실행하며 한 버전이 실패해도 나머지 결과를 끝까지 봅니다. 테스트는 작업마다 PostgreSQL 17 서비스 컨테이너를 쓰고 `TEST_DATABASE_URL`로 연결합니다. 지원 버전을 바꾸면 workflow의 `matrix.node`와 README 요구사항을 함께 고칩니다.
