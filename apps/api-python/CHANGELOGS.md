# Python 백엔드 API 변경 기록

내부 변경 기록입니다. 작성 규칙은 [공통 정책](../../docs/development/repository-policy.md#변경-기록)을 따릅니다.

## 2026-10-15

- Python 3.12·uv 잠금 의존성·FastAPI 실행 모듈과 환경변수 검증을 추가. 기존 API와 동일한 health/readiness 계약, psycopg 비동기 pool, SQL migration 잠금·transaction, 실제 PostgreSQL 통합 테스트와 ruff·mypy 검사를 제공. 근거: [0015](../../docs/work/api/0015-fastapi-backend.md), [`src/skeleton_api`](src/skeleton_api), [`tests`](tests).
