# GitHub Actions 워크플로

GitHub Actions는 CD의 기본 실행 환경입니다. CI는 로컬 개발자·에이전트 환경에서 실행하며 이 디렉터리에 CI workflow를 추가하지 않습니다.

현재 실행 가능한 CD workflow는 없습니다. 배포 대상과 환경·권한·secret·복구 방법을 확정한 프로젝트에서 필요한 CD workflow를 작성합니다. CI workflow를 끄기 위해 저장소 Actions 전체를 비활성화하지 않습니다.

실행 절차와 의존성 경계의 원본은 [로컬 CI·CD 경계](../../docs/development/verification.md#ci), 선택의 근거는 [ADR 0010](../../docs/adr/0010-local-ci-actions-cd.md)입니다.
