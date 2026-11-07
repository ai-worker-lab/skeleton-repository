# FastAPI 백엔드 개발

`apps/api-python`은 NestJS와 같은 클라이언트 계약을 제공하는 선택형 API입니다. 선택과 공통 실행 명령은 [API 구현 선택](../../../docs/development/api-backends.md)을 참고합니다. 이 프로젝트의 Python 버전은 [`.python-version`](../.python-version), 의존성은 [`pyproject.toml`](../pyproject.toml)·[`uv.lock`](../uv.lock)이 기준입니다.

## 직접 실행과 검사

저장소 루트에서 실행합니다. Python 프로젝트의 상대 경로가 올바르게 해석되도록 `uv --directory`를 사용합니다.

```sh
uv sync --locked --directory apps/api-python
uv run --locked --directory apps/api-python python -m skeleton_api --reload
uv run --locked --directory apps/api-python ruff check .
uv run --locked --directory apps/api-python ruff format --check .
uv run --locked --directory apps/api-python mypy src
uv run --locked --directory apps/api-python python -m compileall -q src
uv run --locked --directory apps/api-python pytest
```

[`__main__.py`](../src/skeleton_api/__main__.py)는 `PORT`를 읽고 `0.0.0.0`에 Uvicorn을 실행합니다. `--reload`를 생략하면 소스 감시 없이 실행합니다. 현재 실행·검증은 checkout 소스를 대상으로 하며 원격 배포용 패키징은 정의하지 않습니다.

## 설정과 HTTP 계약

[`config.py`](../src/skeleton_api/config.py)가 `apps/api-python/.env`를 읽습니다. 프로세스 환경변수를 덮어쓰거나 dotenv 변수 참조를 확장하지 않습니다. `DATABASE_URL`과 `PORT`는 필수이며 `PORT`는 1~65535 정수여야 합니다. 로컬 파일은 `pnpm instance`가 [`.env.example`](../.env.example)에서 준비합니다.

[`main.py`](../src/skeleton_api/main.py)의 앱 팩토리는 lifespan에서 연결 확인과 migration을 수행한 뒤 요청을 받습니다. 종료하거나 시작 중 실패하면 pool을 닫습니다. [TypeScript 공유 계약](../../../packages/shared/src/index.ts)을 Python으로 직접 가져오지 않으며 Pydantic 응답 모델과 [HTTP 통합 테스트](../tests/test_health.py)로 동일한 응답을 확인합니다.

| 경로 | 정상 | PostgreSQL 장애 |
| --- | --- | --- |
| `/api/health` | 200, `{"status":"ok"}` | 200 유지 |
| `/api/health/ready` | 200, `{"status":"ready"}` | 503, `{"code":"database_unavailable","message":"데이터베이스에 연결할 수 없습니다."}` |

readiness는 실제 `SELECT 1`을 실행하며 연결 확보와 질의를 합쳐 최대 5초를 기다립니다. 오류 응답에 연결 문자열이나 SQL 정보를 넣지 않습니다. 캐시 등 다른 의존성은 검사하지 않습니다.

## PostgreSQL과 migration

[`database.py`](../src/skeleton_api/database.py)는 psycopg 비동기 pool(최대 15개 연결, 연결 대기 5초)을 관리합니다. `Database.transaction()`의 블록은 성공 시 commit, 예외 시 rollback합니다. `migrations/*.sql`을 이름순으로 적용하고 `schema_migrations`에 파일명에서 `.sql`을 뺀 version을 기록합니다. 디렉터리가 없으면 기록 테이블만 만듭니다. NestJS와 동일한 PostgreSQL advisory lock `931475210`을 사용하며 파일별 transaction으로 실패 파일의 변경과 기록을 함께 되돌립니다.

각 구현의 migration 파일은 해당 API 폴더가 소유합니다. 기존 DB에서 구현을 바꿀 때에는 양쪽 migration의 version과 실제 스키마를 먼저 맞춰야 합니다. 같은 DB를 공유하며 두 구현을 동시에 운영하는 절차는 제공하지 않습니다.

[`tests/conftest.py`](../tests/conftest.py)는 `TEST_DATABASE_URL`, 없으면 로컬 `DATABASE_URL`을 관리 연결로 사용해 매 테스트마다 임의 이름의 DB를 만들고 지웁니다. 해당 계정에 `CREATEDB` 권한이 필요하며 개발 DB의 테이블은 변경하지 않습니다. `make infra-up` 후 `pnpm verify`는 선택한 API의 검사와 DB 테스트를 실행합니다.

## 구현 근거

- [FastAPI lifespan](https://fastapi.tiangolo.com/advanced/events/): 앱 시작·종료 자원을 같은 context manager에서 관리합니다.
- [psycopg connection pools](https://www.psycopg.org/psycopg3/docs/advanced/pool.html): 비동기 pool의 시작·대기·종료를 명시적으로 관리합니다.
- [uv 명령](https://docs.astral.sh/uv/reference/cli/): 잠금 의존성 설치와 프로젝트 디렉터리에서의 실행 옵션을 사용합니다.
