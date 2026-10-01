# 백엔드 API 변경 기록

내부 참고용으로 백엔드 API의 모든 변경을 공개 여부와 관계없이 기록합니다. 작성 규칙은 [루트 AGENTS.md의 변경 기록](../../AGENTS.md#변경-기록)을 따르며, 공개 릴리스 노트는 [RELEASES](../../RELEASES.md)에 있습니다.

## 2026-10-01

- NestJS API 뼈대: 로컬 `.env` 로딩, `DATABASE_URL` 검증, PostgreSQL 연결(연결 대기 5초, idle 연결 오류 처리)과 migration 실행기, liveness `GET /api/health`와 readiness `GET /api/health/ready`, Jest 통합 테스트(일회용 DB), 백엔드 작업 규칙.
