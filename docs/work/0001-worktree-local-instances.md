# 0001 worktree별 로컬 인스턴스와 로그 조회

- 단계: 티켓
- 역할: orchestrator
- 상태: 진행
- 종류: 유지보수
- 우선순위: P1
- 작성일: 2026-10-01

## 목적

에이전트가 격리 작업공간(git worktree)마다 인프라·API·웹·Expo를 따로 띄워 자기 변경을 실제 경로에서 검증할 수 있게 합니다. 지금은 Compose project와 포트가 고정되어(`Makefile`, `apps/web/package.json`, `apps/app/package.json`) 병렬 작업공간에서는 타입 검사·빌드까지만 확인할 수 있습니다.

## 수용 기준

- [ ] `pnpm instance`가 현재 checkout의 인스턴스 설정 `.local/instance.env`를 만들거나 읽어 이름·포트·URL을 출력한다. 주 checkout은 슬롯 0(현재 포트와 Compose project `app-skeleton` 그대로), 연결된 worktree는 다른 worktree가 쓰지 않는 가장 작은 슬롯 k≥1을 받고 포트는 기본 포트 + 100×k이다. `PORT_SLOT` 환경변수로 덮어쓸 수 있다.
- [ ] `.local/instance.env` 키: `INSTANCE_NAME`, `PORT_SLOT`, `COMPOSE_PROJECT_NAME`, `API_PORT`, `WEB_PORT`, `EXPO_PORT`, `POSTGRES_PORT`, `VALKEY_PORT`, `PORT`, `DATABASE_URL`, `TEST_DATABASE_URL`, `API_INTERNAL_URL`, `EXPO_PUBLIC_API_BASE_URL`, `API_URL`, `WEB_URL`.
- [ ] 새 worktree에서 없는 로컬 설정 파일(`infra/local/.env`, `apps/api/.env`, `apps/web/.env.local`, `apps/app/.env`)을 추적 예시에서 만들고 기존 파일은 덮어쓰지 않는다.
- [ ] `scripts/lib/instance.mjs`가 `readInstanceEnv(root)`(없으면 `null`)와 `ensureInstance(root)`(없으면 생성 후 반환)를 내보낸다.
- [ ] `make up`/`down`/`status`/`*-up`이 인스턴스 설정의 Compose project·포트로 동작하고, PM2 프로세스(`ecosystem.config.cjs`)가 인스턴스 포트·연결 문자열을 받는다. 웹·Expo `start` 스크립트는 `WEB_PORT`·`EXPO_PORT`가 없으면 기존 포트를 쓴다.
- [ ] `make instance-destroy CONFIRM=1`이 연결된 worktree 인스턴스의 컨테이너·볼륨·PM2를 지우고, 주 checkout에서는 거부한다.
- [ ] `pnpm logs <api|web|app|infra> [--lines N] [--follow]`가 해당 서비스의 최근 로그를 출력한다. 기본은 follow 없이 끝난다.
- [ ] 주 checkout과 연결된 worktree 하나에서 동시에 `make up` 후 두 인스턴스의 `/api/health/ready`와 웹 주소가 각각 응답한다.
- [ ] `scripts/init-project.mjs --port-offset`이 새 기본 포트를 계속 올바르게 바꾼다.

## 범위

- 포함: `scripts/instance.mjs`, `scripts/logs.mjs`, `scripts/lib/instance.mjs`, `Makefile`, `ecosystem.config.cjs`, 웹·앱 `start` 스크립트, 로컬 개발 문서, 인프라 규칙, ADR 0008.
- 제외: dev/prod 원격 환경, CI.

## 위험·복구

주 checkout의 Compose project·볼륨 이름(`app-skeleton`)은 바꾸지 않습니다. 연결된 worktree 인스턴스는 별도 볼륨을 쓰며 `instance-destroy`는 그 볼륨만 지웁니다.

## 연결

- [영역별 병렬 개발](../development/parallel-work.md), [로컬 개발 환경](../development/local-environment.md)

## 진행 기록

- 2026-10-01: 생성. 에이전트 친화 하네스 구성(0001~0005)의 검증 루프 기반.
