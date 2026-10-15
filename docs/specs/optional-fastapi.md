# 선택 가능한 API 백엔드 설계

- 상태: 검토
- 작성일: 2026-10-15
- 입력: 사용자 요청 — NestJS + TypeScript 외에 Python + FastAPI도 API로 선택하고 PR 생성.
- 연결: [통합 티켓](../work/orchestrator/0014-optional-fastapi.md), [API 티켓](../work/api/0015-fastapi-backend.md)

## 요구 대응과 구성

`apps/api`의 NestJS를 기본값으로 유지하고 `apps/api-python`에 독립 uv 프로젝트를 둔다. `api.config.json`을 프로젝트 선택의 원본으로 삼고 `API_BACKEND`는 한 실행의 override로 쓴다. 초기화의 `--api` 옵션은 선택을 저장한다. 공용 실행기 `scripts/api.mjs`를 루트 명령·PM2·CI가 호출한다. Python 도구는 FastAPI를 선택했을 때만 필요하다.

웹·앱 → 선택된 API → PostgreSQL 흐름과 기존 URL·포트는 동일하다. TypeScript 계약은 `packages/shared/src/index.ts`에 유지하며 Python 모델과 HTTP 통합 테스트가 같은 JSON 계약을 확인한다. 두 API를 동시에 실행하거나 한 구현의 내부 코드를 다른 언어에서 import하지 않는다.

## 계약과 데이터

기존 `GET /api/health`, `GET /api/health/ready` 성공 및 DB 장애 오류 계약을 유지한다. 새 도메인 데이터·인증·권한·UI 요구는 없다. Python API는 기존 SQL migration 규칙(파일명 순서, advisory lock, 파일별 transaction, 기록 테이블)을 따른다. 각 구현의 migration 폴더는 독립적이므로 제품 기능이 생긴 뒤 백엔드를 교체할 때에는 schema 호환성을 별도로 검토해야 한다.

## 작업 분담과 검증

| 티켓 | 역할 | 소유 범위 | 검증 |
| --- | --- | --- | --- |
| 0014 | orchestrator | 공용 선택·실행·초기화·검증·문서 | 기본 NestJS와 FastAPI 각각 전체 검증, 실제 실행·웹 smoke, 초기화 회귀 |
| 0015 | api | `apps/api-python/**` | 실제 PostgreSQL HTTP·장애·migration 테스트, Ruff·mypy |

선택기 검증은 잘못된 선택 거부, 기본값, 환경 override, 초기화 후 lock 유지와 실행 명령 연결을 확인한다. CI는 기존 Node 지원 범위와 두 API 구현을 검사한다. 원격 배포는 범위에 포함하지 않는다.

## 검토 기록

- 2026-10-15 API 검토: 기존 health·readiness·pool·migration·환경 로딩 계약 확인. Python API의 동등한 동작과 실제 DB 테스트가 필요함을 반영.
- 2026-10-15 통합 검토: 실행·빌드·타입 검사·테스트·PM2·초기화·CI의 NestJS 하드코딩을 공용 선택기로 통일. 사용자 요청 범위 안에서 구현하고 PR 검토 대상으로 제출한다.
