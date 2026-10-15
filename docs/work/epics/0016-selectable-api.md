# 0016 NestJS와 FastAPI 중 API 선택

- 단계: 에픽
- 상태: 검증
- 종류: 기능
- 우선순위: P1
- 작성일: 2026-10-15

## 목적

사용자가 새 서비스를 만들 때 TypeScript 또는 Python 생태계를 선택할 수 있다.

## 수용 기준

- [x] 기본 NestJS 및 선택된 FastAPI가 동일한 로컬 실행·검증·클라이언트 연결 흐름을 제공한다.
- [x] 두 구현의 실제 PostgreSQL 연동과 초기화 옵션을 검증하고 PR 검토 자료를 준비한다.

## 범위

- 포함: [공용 통합](../orchestrator/0014-optional-fastapi.md), [Python API](../api/0015-fastapi-backend.md).
- 제외: 제품 기능과 원격 배포.

## 위험·복구

NestJS 기본값을 유지하고 백엔드 전환은 API 프로세스 재시작으로 반영한다.

## 연결

- [설계](../../specs/optional-fastapi.md)

## 진행 기록

- 2026-10-15: 사용자 요청에 따라 API와 공용 도구 작업을 병렬 분담.
- 2026-10-15: 두 구현의 전체 검증과 실제 DB·웹 연결, FastAPI 초기화 복사본 검증을 완료. 통합 티켓 0014에 명령·범위·결과 기록.
