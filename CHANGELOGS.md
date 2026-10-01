# 변경 기록

내부 참고용 전체 변경 기록입니다. 공개·배포 여부와 관계없이 모든 변경을 기록합니다. 이 파일에는 전용 로그가 없는 `design/`, `packages/`, `docs/`, `.github/`, 루트 설정·정책 변경과 여러 영역에 걸친 작업의 요약을 둡니다. 영역별 세부 변경은 [인프라](infra/CHANGELOGS.md), [백엔드 API](apps/api/CHANGELOGS.md), [웹](apps/web/CHANGELOGS.md), [앱](apps/app/CHANGELOGS.md) 로그에 있습니다.

공개 릴리스 노트는 [RELEASES](RELEASES.md)에 있습니다. 작성 규칙은 [저장소 공통 정책의 변경 기록](docs/development/repository-policy.md#변경-기록)을 따릅니다.

## 2026-10-01

- 에이전트 친화 하네스 구성. 루트 `AGENTS.md`를 크기 예산 안의 지도로 줄이고 공통 정책 원문을 [저장소 공통 정책](docs/development/repository-policy.md)으로 옮김(ADR 0006, `docs/work/0004-agents-map-and-policy-docs.md`). 영역 `AGENTS.md`·변경 기록·FAQ의 정책 링크를 새 위치로 갱신.
- worktree별 로컬 인스턴스(`pnpm instance`, `make instance-destroy`, `.local/instance.env`)와 로그 조회(`pnpm logs`): 루트 `Makefile`, `ecosystem.config.cjs`, `scripts/instance.mjs`, `scripts/logs.mjs`, `scripts/lib/instance.mjs`, `scripts/init-project.mjs`, ADR 0008. 근거 `docs/work/0001-worktree-local-instances.md`. 세부는 [인프라](infra/CHANGELOGS.md)·[웹](apps/web/CHANGELOGS.md)·[앱](apps/app/CHANGELOGS.md) 로그.
- 단일 검증 명령 `pnpm verify`(`--fast`, `--keep-going`)와 Playwright smoke(`pnpm smoke`, `tests/smoke/`), CI를 `verify`·`smoke`·`work-scope` job으로 재구성, [검증 루프](docs/development/verification.md) 문서. 근거 `docs/work/0002-verify-and-smoke.md`.
- 기계 검사: `pnpm docs:check`(링크·anchor·고아 문서·ADR 형식·변경 기록 순서·`AGENTS.md` 예산), ESLint 영역 경계(`no-restricted-imports`), `.omp/agents/*.md`의 `owns`와 `pnpm work:scope`. 근거 `docs/work/0003-mechanical-guardrails.md`.
- work item 실행기: `pnpm work:next`, `pnpm work:run`(`scripts/runner.mjs`, `scripts/lib/runner-workflow.mjs`), 실행 정책·프롬프트 [WORKFLOW.md](WORKFLOW.md), [작업 실행기](docs/development/agent-runner.md)·[문서 정리](docs/development/doc-gardening.md) 문서, ADR 0007. work item 공용 모듈 `scripts/lib/work-items.mjs`·`scripts/lib/agents.mjs`. 근거 `docs/work/0005-work-dispatch-runner.md`.
- 루트 개발 의존성 `@playwright/test`, `yaml` 추가.
- who-when 저장소의 검증된 구조에서 서비스 고유 내용을 걷어내 초기 뼈대 구성: pnpm workspace, 공통 정책(`AGENTS.md`), OMP agent 정의(`.omp/`), work item 규칙과 검사(`docs/work/`, `scripts/work.mjs`), ADR 0001~0005, GitHub Actions CI(Node 22·24·26), ESLint + Prettier, 공유 계약 `@app-skeleton/shared`(liveness·readiness·`ApiError`), 디자인 토큰 `@app-skeleton/design-tokens`, 새 서비스 초기화 스크립트(`scripts/init-project.mjs`). 영역별 세부는 [인프라](infra/CHANGELOGS.md)·[API](apps/api/CHANGELOGS.md)·[웹](apps/web/CHANGELOGS.md)·[앱](apps/app/CHANGELOGS.md) 로그.
