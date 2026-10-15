# 0015 Python FastAPI 백엔드

- 단계: 티켓
- 역할: api
- 상위: 0016
- 상태: 검증
- 종류: 기능
- 우선순위: P1
- 작성일: 2026-10-15

## 목적

선택 가능한 Python API가 기존 클라이언트 계약과 PostgreSQL 운영 동작을 제공한다.

## 수용 기준

- [x] `apps/api-python`에 Python 3.12·uv 잠금 파일·FastAPI 실행 모듈이 있다.
- [x] 실제 DB를 사용한 health, readiness 정상·장애, migration 순서·중복 방지·rollback 테스트가 통과한다.
- [x] 환경변수 검증, 종료 시 pool 정리, lint·타입 검사를 제공한다.

## 범위

- 포함: `apps/api-python/**`.
- 제외: 루트 선택기·CI·인프라·웹·앱 구현.

## 위험·복구

테스트는 별도의 일회용 DB만 생성·삭제한다. 제품 migration은 추가하지 않는다.

## 연결

- [설계](../../specs/optional-fastapi.md)
- [통합](../orchestrator/0014-optional-fastapi.md)

## 진행 기록

- 2026-10-15: 기존 NestJS 구현과 공유 HTTP 계약을 확인한 뒤 Python 구현을 분담.
- 2026-10-15: `uv sync --locked --directory apps/api-python` 성공. 같은 디렉터리에서 `uv run --locked`로 `ruff check .`, `ruff format --check .`, `mypy src`, `python -m compileall -q src` 통과.
- 2026-10-15: 이 checkout의 `TEST_DATABASE_URL`을 사용한 `uv run --locked --directory apps/api-python pytest -q`에서 16개 테스트 통과(5.75초). 실제 PostgreSQL 일회용 DB로 health/readiness 정상·DB 강제 제거·migration 순서·멱등성·동시 실행·실패 rollback·transaction·시작 실패 및 정상 종료 시 pool 정리를 확인. 저장소 통합 검증과 브라우저 smoke는 상위 통합 티켓에서 수행.
- 2026-10-15: 통합 담당이 선택기 경유 전체 검증 및 실제 TCP·웹 BFF·SSR 연결을 확인하여 검증 상태로 전환. 상세 근거는 통합 티켓 0014.
