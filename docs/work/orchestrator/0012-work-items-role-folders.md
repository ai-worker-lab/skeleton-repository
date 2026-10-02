# 0012 work item 역할별 폴더

- 단계: 티켓
- 역할: orchestrator
- 상태: 진행
- 종류: 유지보수
- 우선순위: P1
- 작성일: 2026-10-02

## 목적

work item이 모두 `docs/work/` 한 폴더에 있어 어느 역할의 일인지 파일 목록으로 구분하기 어렵습니다(2026-10-02 사용자 결정: 선택지 중 "역할별 폴더"). 에픽은 `docs/work/epics/`, 티켓·하위 티켓은 `docs/work/<역할>/`에 두고, 검사·옮기기 도구와 문서를 맞춥니다. 에픽·티켓·하위 티켓 3단계와 에픽 없는 독립 티켓은 그대로입니다. 이 도구는 템플릿이 원본이고 who-when이 이식해 쓰므로 템플릿에서 먼저 바꾸고 이식 절차를 남깁니다.

## 수용 기준

- [ ] `scripts/lib/work-items.mjs`가 `docs/work/epics/`와 `docs/work/<역할>/`을 읽고, 에픽이 `epics/` 밖에 있거나 티켓·하위 티켓이 `역할`과 다른 폴더에 있거나, 루트에 남은 work item, 알 수 없는 폴더, 한 단계를 넘는 폴더를 옮길 위치와 고치는 명령을 담은 오류로 보고한다. 번호 중복은 폴더를 넘어 검사한다.
- [ ] `pnpm work:place [NNNN ...] [--dry-run]`이 work item을 단계·역할에 맞는 폴더로 `git mv`하고, 저장소 Markdown에서 그 파일을 가리키는 상대 링크와 옮긴 파일 안의 바깥 링크를 고친다. 링크 해석은 `pnpm docs:check`와 같은 규칙이며 코드 블록·인라인 코드 안의 경로는 건드리지 않는다.
- [ ] 기존 0001~0011을 이 명령으로 `docs/work/orchestrator/`로 옮긴다.
- [ ] 번호로 work item을 찾는 곳(`work-scope.mjs`, `runner.mjs`, `runner-workflow.mjs`의 `tracker.dir`, `verify.mjs`, `docs-check.mjs`, `design.mjs`)이 하위 폴더를 다룬다.
- [ ] 새 work item을 만드는 안내(`docs/work/README.md`, `TEMPLATE.md`, `WORKFLOW.md`, `AGENTS.md`, 경로를 말하는 문서)가 새 배치를 따른다.
- [ ] ADR 0003 결정 4의 폴더 부분을 대체하는 새 ADR과 색인, ADR 0003 상태 표시.
- [ ] `docs/development/adopting-harness.md`에 이미 하네스를 쓰는 저장소가 이 변경을 들이는 절차(복사할 파일, 옮기는 명령, 확인 명령)가 있다.
- [ ] 일부러 잘못 둔 파일(역할 폴더의 에픽, 다른 역할 폴더의 티켓, 루트의 work item)에 `pnpm work:check`가 각각 알아듣게 실패하고 `pnpm work:place`가 고친다. 역할을 바꾼 티켓을 옮길 때 다른 문서의 링크가 고쳐진다.
- [ ] `pnpm work:check`, `pnpm work`, `pnpm work:next`, `pnpm work:scope 0012`, `pnpm docs:check`, `pnpm verify`가 통과한다.

## 범위

- 포함: `scripts/`(work item 도구·링크 해석 공용 모듈), `package.json` scripts, `WORKFLOW.md`, `docs/work/`, `docs/adr/`, `docs/README.md`, `docs/alm/workflow.md`, `docs/development/`, `docs/specs/TEMPLATE.md`, `docs/product/TEMPLATE.md`, `.github/pull_request_template.md`, `.omp/skills/technical-design/SKILL.md`, 루트 `AGENTS.md`·`README.md`·`CHANGELOGS.md`.
- 제외: 과거 work item 0001~0011의 내용(위치와 상대 링크만 바뀜), 변경 기록 본문의 옛 경로 근거, who-when 저장소.

## 위험·복구

work item 파일 경로가 바뀌므로 진행 중인 다른 `work/NNNN-*` 브랜치가 옛 경로의 파일을 고치면 병합 때 이름 변경을 따라가야 합니다. 지금 템플릿에는 그런 브랜치가 없습니다. 되돌리려면 이 커밋을 `git revert`합니다.

## 연결

- [작업 관리](../README.md), [ADR 0003](../../adr/0003-work-item-hierarchy.md), [ADR 0009](../../adr/0009-work-item-role-folders.md), [기존 저장소에 하네스 적용](../../development/adopting-harness.md#이미-하네스를-쓰는-저장소-역할별-work-item-폴더)

## 진행 기록

- 2026-10-02: 생성. 사용자 결정에 따라 배치를 `docs/work/epics/`, `docs/work/<역할>/`로 확정(에픽별 폴더·이름에 역할 넣기는 ADR 0009에서 탈락).
