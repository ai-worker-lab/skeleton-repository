# Python 백엔드 작업 규칙

적용 범위: `apps/api-python/`와 하위 파일. [루트 규칙](../../AGENTS.md)을 함께 따릅니다.

- FastAPI 앱 팩토리와 lifespan을 기준으로 확장하며 제품 기능 없이 공통 계층을 미리 추가하지 않습니다.
- 외부 입력은 Pydantic 모델 등으로 검증합니다. 인증·권한 검사는 해당 엔드포인트 요구에 맞게 구현합니다.
- 클라이언트 계약의 기준은 [공유 계약](../../packages/shared/src/index.ts)입니다. Python 모델을 바꾸면 웹·앱 영향과 실제 HTTP 응답을 확인합니다.
- DB 변경은 bind parameter와 transaction을 사용합니다. SQL migration은 `migrations/`에 두고 데이터 손실·배포 순서·복구 가능성을 확인합니다.
- `config.py`가 `.env`를 읽으며 프로세스 환경변수가 우선합니다. 새 설정은 소비 코드와 `.env.example`을 함께 고칩니다.
- `/api/health`는 DB와 무관한 liveness이고 `/api/health/ready`는 PostgreSQL readiness입니다. 장애 응답도 실제 PostgreSQL 테스트로 확인합니다.
- [개발 안내](docs/development.md)의 검사와 저장소 `pnpm verify`, 실행 중 `pnpm smoke` 결과를 작업 기록에 남깁니다.
- Python 백엔드 변경은 [CHANGELOGS.md](CHANGELOGS.md)에 기록합니다.
