# API 백엔드 선택

기본 API는 `apps/api/`의 NestJS + TypeScript이며, Python을 쓰는 서비스는 `apps/api-python/`의 FastAPI를 선택합니다. 한 실행 환경에서는 API 하나가 같은 포트와 HTTP 계약을 제공합니다. 웹·Expo 앱은 API 구현 언어를 알 필요 없이 기존 경로와 응답을 사용합니다.

## 선택과 준비

선택의 원본은 루트 [`api.config.json`](../../api.config.json)의 `backend`입니다. 허용 값은 `nestjs`·`fastapi`이며 프로세스 환경변수 `API_BACKEND`가 파일 값보다 우선합니다. 선택을 읽고 검증하는 코드는 [`scripts/lib/api-backend.cjs`](../../scripts/lib/api-backend.cjs)입니다. API의 `.env`나 worktree 인스턴스 설정에 백엔드를 저장하지 않습니다.

새 서비스는 초기화할 때 선택합니다.

```sh
node scripts/init-project.mjs --name my-service --repo owner/my-service --api fastapi
```

이미 초기화한 저장소는 `api.config.json`을 바꿉니다.

```json
{ "backend": "fastapi" }
```

FastAPI에는 Python 3.12와 uv가 필요합니다. Python 버전은 [`apps/api-python/.python-version`](../../apps/api-python/.python-version), 의존성과 검사 설정은 [`pyproject.toml`](../../apps/api-python/pyproject.toml), 설치 버전은 [`uv.lock`](../../apps/api-python/uv.lock)이 기준입니다. 웹·앱과 저장소 도구에는 계속 Node.js·pnpm이 필요합니다. NestJS를 선택한 기본 경로에서는 Python·uv를 실행하지 않습니다.

```sh
pnpm install
pnpm api sync
make up
pnpm verify
pnpm smoke
```

한 실행에만 선택을 바꾸려면 환경변수를 붙입니다. 이 방법은 `api.config.json`을 수정하지 않습니다.

```sh
API_BACKEND=fastapi pnpm api sync
API_BACKEND=fastapi make api-up
API_BACKEND=fastapi pnpm verify
pnpm smoke
```

PM2는 시작할 때 선택한 백엔드를 받습니다. 선택을 바꾼 뒤에는 `make api-restart` 또는 `make api-up`으로 API를 다시 띄웁니다. 공통 PM2 이름·API 포트·웹·앱의 연결 주소는 그대로 사용합니다. `.env` 생성과 worktree별 포트·DB는 [로컬 개발 환경](local-environment.md), 환경변수 범위는 [환경과 비밀값 관리](environment-secrets.md)를 따릅니다.

## 공통 명령

[`scripts/api.mjs`](../../scripts/api.mjs)가 선택한 구현에 명령을 전달합니다. 루트 `dev:api`·`build`·`lint`·`format`·`typecheck`·`test`와 `make api-up`·`pnpm verify`도 이 선택을 따릅니다. API를 선택해도 웹·앱·공용 패키지의 기존 검사와 빌드는 계속 실행합니다.

| 명령 | NestJS | FastAPI |
| --- | --- | --- |
| `pnpm api sync` | pnpm lockfile로 의존성 설치 | `uv sync --locked` |
| `pnpm api dev` 또는 `pnpm api start:dev` | Nest watch 실행 | Uvicorn reload 실행 |
| `pnpm api build` | TypeScript 컴파일 | Python 소스 바이트코드 컴파일 검사 |
| `pnpm api start` | 빌드한 `dist/main.js` 실행 | `python -m skeleton_api` 실행 |
| `pnpm api lint` | ESLint·Prettier 검사 | Ruff 규칙·서식 검사 |
| `pnpm api format` | Prettier·ESLint 자동 수정 | Ruff 규칙·서식 자동 수정 |
| `pnpm api typecheck` | TypeScript 검사 | mypy 검사 |
| `pnpm api test` | Jest 통합 테스트 | pytest 설정·HTTP·DB 통합 테스트 |

FastAPI의 실행·검사 명령은 `uv run --locked --directory apps/api-python`을 사용합니다. Python의 `build`는 배포 이미지나 실행 파일을 만드는 작업이 아닙니다. 원격 배포는 [배포 대상 아키텍처](../architecture/deployment-target.md)에 기록된 계획 단계입니다.

## HTTP 계약과 데이터 경계

공유 HTTP 경로·DTO·오류 타입의 기준은 [`packages/shared/src/index.ts`](../../packages/shared/src/index.ts)입니다. NestJS와 클라이언트는 TypeScript 타입을 직접 사용하고, FastAPI는 같은 JSON 계약을 Python 모델로 구현합니다. TypeScript 선언만 바꾸어도 Python 코드가 자동으로 바뀌지는 않습니다. 공통 계약을 바꾸면 두 구현과 HTTP 테스트를 함께 갱신합니다.

두 구현은 `/api/health` liveness, DB 질의를 수행하는 `/api/health/ready` readiness와 `ApiError` 오류 형식을 제공합니다. 실제 PostgreSQL을 사용하는 각 백엔드의 통합 테스트와 같은 Playwright smoke가 이를 확인합니다. CI도 선택 파일 값과 별개로 두 구현을 검사합니다([검증 루프](verification.md)).

SQL migration은 각 구현의 `migrations/`에서 읽습니다. 두 실행기는 같은 `schema_migrations` 이력 테이블과 PostgreSQL advisory lock을 사용하지만, 선택을 바꾸는 작업이 SQL 파일이나 기존 데이터를 변환하지는 않습니다. 제품 기능을 구현한 저장소에서 백엔드를 바꿀 때는 새 구현의 HTTP 계약·migration 이력·데이터 호환성을 먼저 확인합니다.

NestJS 구조는 [NestJS API 구현 기준](../architecture/nestjs-api.md), FastAPI 구조와 직접 실행·테스트 방법은 [FastAPI 개발 안내](../../apps/api-python/docs/development.md)를 참고합니다. 선택 구조의 배경과 트레이드오프는 [ADR 0010](../adr/0010-selectable-api-backends.md)에 기록합니다.
