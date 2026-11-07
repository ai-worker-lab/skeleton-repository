# 0014 선택 가능한 API 백엔드 통합

- 단계: 티켓
- 역할: orchestrator
- 상위: 0016
- 상태: 검증
- 종류: 기능
- 우선순위: P1
- 작성일: 2026-10-15

## 목적

사용자 요청에 따라 템플릿의 API를 NestJS + TypeScript 또는 Python + FastAPI로 선택하고 같은 개발·검증 명령으로 사용할 수 있게 한다.

## 수용 기준

- [x] 기본 NestJS 경로는 Python 없이 설치·실행·검증할 수 있다.
- [x] 추적 설정 및 초기화 옵션으로 FastAPI를 선택하고 `make up`, `pnpm verify`, CI가 선택값을 따른다.
- [x] 두 백엔드에서 같은 HTTP 계약과 웹 연결을 실제 PostgreSQL로 확인한다.
- [x] 실행 안내·환경 설정·역할 소유 경계·변경 기록을 갱신하고 PR 검토 자료를 준비한다.

## 범위

- 포함: API 선택기, 루트 명령, 초기화, PM2, 인스턴스 환경, CI, 통합 테스트, 관련 문서. Python API 구현은 API 티켓 0015에 위임한다.
- 제외: 도메인 기능, 원격 배포, 기존 DB 데이터 변경, 웹·앱 화면 변경.

## 위험·복구

프로젝트별로 하나의 API만 실행한다. 선택을 되돌릴 때 기존 API 프로세스를 재시작한다. 두 구현의 향후 도메인 migration을 자동 변환하지 않는다. 기본 선택은 NestJS로 유지한다.

## 연결

- [설계](../../specs/optional-fastapi.md)
- [Python 구현](../api/0015-fastapi-backend.md)

## 진행 기록

- 2026-10-15: 사용자 구현·PR 요청으로 시작. 기존 작업 브랜치는 보존하고 `origin/main`에서 격리된 worktree를 생성. API 구현·공용 도구·문서를 겹치지 않는 소유 경로로 병렬 분담.
- 2026-10-15: `pnpm verify` 및 `API_BACKEND=fastapi pnpm verify --keep-going` 각각 전체 8단계 통과. 선택기·초기화 회귀 테스트 11개, NestJS 실제 PostgreSQL 테스트 9개, FastAPI 테스트 16개 통과. 초기 동시 편집 중 발생한 두 스크립트 서식 오류는 정규화 후 재검증 통과.
- 2026-10-15: 별도 임시 git 복사본에서 `--name python-demo --repo example/python-demo --api fastapi --port-offset 21000 --no-verify` 초기화 후 `pnpm install --frozen-lockfile`, `pnpm api sync`, `pnpm verify --fast`, 선택기 테스트 통과(초기화 스크립트가 제거된 뒤 관련 3개만 skip, 나머지 8개 통과). `uv.lock` 바이트 동일 확인.
- 2026-10-15: `make up`, FastAPI로 `make api-restart`, `make status`에서 독립 worktree API·웹·Expo·PostgreSQL·Valkey 기동 확인. 사용자 브라우저 지침에 따라 전용 Chrome Debug(CDP 9223)에서 두 백엔드 각각 기존 smoke 기준 5개(health·readiness·웹 200/내용/콘솔 오류 없음·1280px·390px 가로 넘침 없음)와 웹 BFF health·SSR 정상 상태를 확인. 일반 Chromium을 띄우는 `pnpm smoke` 명령 자체는 로컬에서 실행하지 않음. 스크린샷은 Chrome Debug artifacts의 `skeleton-{nestjs,fastapi}-{1280,390}.png`.
- 2026-10-15: CI의 두 백엔드 `pnpm api start` 경로를 별도 포트에서 실행해 실제 DB readiness 확인. `actionlint .github/workflows/ci.yml`, `pnpm work:scope 0014`, `git diff --check` 통과. 배포·병합은 수행하지 않음. 기존 PR #1의 초기화/CI 변경과 별개로 `origin/main` 기준 구현이므로 두 PR을 함께 병합할 때 공용 도구 변경 조정 필요.
