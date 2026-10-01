# 0005 work next와 WORKFLOW.md 기반 실행기

- 단계: 티켓
- 역할: orchestrator
- 상태: 진행
- 종류: 유지보수
- 우선순위: P1
- 작성일: 2026-10-01

## 목적

저장소 work item을 에이전트 작업의 제어 평면으로 씁니다([Symphony](https://github.com/openai/symphony)의 방식). 착수 가능한 티켓을 계산하고, 티켓마다 격리 worktree와 코딩 에이전트를 띄워 `검증` 상태까지 진행시키며, 주기적인 문서 정리 작업을 실행합니다. 에이전트 런타임은 설정한 명령으로 바꿀 수 있습니다.

## 수용 기준

- [ ] `pnpm work:next [--json] [--all]`이 착수 가능한 work item을 우선순위·번호 순으로 출력한다. 조건: 에픽이 아니고, 하위 항목이 없고, `상태: 준비`이며, 자신과 모든 상위의 `선행`이 `완료`이고, `work/NNNN-*` 브랜치(로컬 또는 원격)로 점유되지 않음. `--all`은 제외 사유와 함께 모두 보여 준다.
- [ ] 루트 `WORKFLOW.md`가 YAML front matter(추적 대상·인계 상태·작업공간·훅·에이전트 명령·동시 실행 수·제한 시간·재시도·주기 작업)와 에이전트 프롬프트 본문을 가진다. 프롬프트는 고정 절차 대신 목표·완료 조건·사용할 명령을 준다.
- [ ] `pnpm work:run`이 주기적으로 착수 가능한 티켓을 골라 `work/NNNN-<slug>` 브랜치 worktree를 만들고, 생성 훅을 실행하고, 프롬프트를 렌더링해 `agent.command`를 해당 worktree에서 실행한다. 에이전트가 끝나면 worktree의 work item 상태를 읽어 `준비`·`진행`이면 지수 backoff로 재시도하고 그 밖의 상태면 인계로 끝낸다. 기준 checkout에서 `보류/종료`가 되면 실행 중 에이전트를 멈춘다. 재시작 시 점유 브랜치와 worktree로 진행 중 작업을 이어 간다.
- [ ] `--once`, `--dry-run`, `--workflow <path>`를 지원하고, 실행 이벤트를 `.local/runner/events.jsonl`, 에이전트 출력을 `.local/runner/logs/`에 남긴다.
- [ ] 주기 작업 설정으로 문서 정리(doc-gardening) 에이전트를 정해진 간격마다 실행하며, 절차는 `docs/development/doc-gardening.md`가 기준이다.
- [ ] 에이전트가 범위 밖 개선점이나 빠진 하네스 능력을 발견하면 `분류 대기`·`(AI 제안)` 우선순위 work item으로 등록하는 규칙이 `docs/work/README.md`와 프롬프트에 있다.
- [ ] 실행기 사용법·설정 키·런타임 예시(OMP, Codex, Claude Code) 문서와 ADR 0007이 있다.

## 범위

- 포함: `scripts/work.mjs`(`--next`), `scripts/runner.mjs`, `WORKFLOW.md`, `docs/work/README.md`, 실행기·문서 정리 문서, ADR 0007.
- 제외: 외부 이슈 트래커 연동([ADR 0002](../adr/0002-work-items-in-repository.md) 유지), 웹 대시보드.

## 위험·복구

실행기는 설정한 에이전트 명령을 사람 확인 없이 실행합니다. 기본 설정은 동시 실행 1개이고, 배포·데이터 파괴·외부 공개는 프롬프트에서 금지하며, 원격 push는 설정으로 켭니다. 중단은 실행기 종료(`Ctrl+C`)이며 worktree와 브랜치는 남습니다.

## 연결

- [작업 관리](README.md), [ADR 0002](../adr/0002-work-items-in-repository.md), [Symphony SPEC](https://github.com/openai/symphony)

## 진행 기록

- 2026-10-01: 생성.
