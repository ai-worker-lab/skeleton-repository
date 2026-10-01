# 기존 저장소에 하네스 적용

이 템플릿의 에이전트 하네스(worktree별 로컬 인스턴스, `pnpm verify`·`pnpm smoke`, 문서·디자인·소유 범위 검사, work item 실행기, 제품 탐색·기술 설계 절차, OpenDesign 연결)를 이미 운영 중인 저장소에 들이는 절차입니다. 새 서비스를 템플릿에서 시작할 때는 이 문서 대신 [루트 README](../../README.md)의 템플릿 안내와 `scripts/init-project.mjs`를 씁니다.

이 절차는 이 템플릿에서 갈라져 나간 who-when 저장소에 하네스를 옮긴 경험(who-when work item 0020)을 일반화한 것입니다. 그때 템플릿이 자기 값을 가정해 손봐야 했던 곳은 템플릿 쪽 설정 한 곳으로 모았습니다(포트·토큰 접두사·디자인 검사 기준선).

## 전제와 작업 단위

- 대상 저장소가 같은 구조(pnpm workspace, `apps/api`·`apps/web`·`apps/app`, `packages/shared`·`packages/design-tokens`, `infra/local` Compose, `docs/work/` work item)라고 가정합니다. 없는 영역은 해당 파일 묶음을 빼고, 경로가 다르면 복사한 스크립트의 경로 상수(예: `scripts/lib/instance.mjs`의 `LOCAL_FILES`)를 맞춥니다.
- 이식은 대상 저장소의 `orchestrator` 독립 티켓 하나로 합니다. 브랜치는 `work/NNNN-<slug>`이고, `진행 기록`에 템플릿 저장소와 기준 커밋을 적습니다.
- 옮길 파일 목록은 템플릿에서 확인합니다: 대상 저장소가 템플릿의 어느 커밋에서 갈라졌는지 알면 `git -C <템플릿> diff --stat <갈라진 커밋>..main`이 하네스 변경 전체입니다.

## 파일 묶음

| 묶음 | 파일 | 방법 |
| --- | --- | --- |
| 새 파일 | `scripts/`의 `verify.mjs`·`smoke.mjs`·`docs-check.mjs`·`design.mjs`·`instance.mjs`·`logs.mjs`·`od.mjs`·`runner.mjs`·`work-scope.mjs`와 `scripts/lib/`, `tests/smoke/`, `WORKFLOW.md`, `.omp/skills/`, `docs/development/`의 `repository-policy.md`·`verification.md`·`agent-runner.md`·`doc-gardening.md`·이 문서, `docs/specs/`, `docs/product/README.md`·`TEMPLATE.md`·`research/TEMPLATE.md`, `docs/references/TEMPLATE.md`, `design/system/`, `design/docs/opendesign.md`, `packages/design-tokens/src/opendesign.json`·`scripts/source.mjs`, 하네스 ADR(아래) | 템플릿 최신본을 복사한 뒤 [치환 규칙](#치환-규칙)을 적용합니다 |
| 병합 파일 | 루트·영역 `AGENTS.md`, `README.md`, `Makefile`, `ecosystem.config.cjs`, 루트 `package.json`(scripts·devDependencies), `.github/workflows/ci.yml`, `.github/pull_request_template.md`, `.gitignore`(`.local/`), `.omp/agents/*.md`, `eslint.config.mjs`, `scripts/work.mjs`, `docs/README.md`, `docs/work/README.md`, `docs/alm/workflow.md`, `docs/development/`의 `local-environment.md`·`environment-secrets.md`·`parallel-work.md`, `docs/faq.md`, `docs/architecture/*.md`, `packages/design-tokens/`의 `scripts/generate.mjs`·`src/tokens.json`·`docs/usage.md`, 앱 `package.json`의 개발 서버 스크립트, `apps/api/src/main.ts`의 포트 읽기, 각 `.env.example`, `infra/local/compose.yaml`, 각 `CHANGELOGS.md`·`RELEASES.md`의 머리말 | 대상 저장소가 이미 바꾼 파일이므로 3-way 병합합니다. 대상 저장소 고유 문장(제품 설명, 보류 결정, 고유 ADR 색인)은 보존하고 하네스 규칙만 들입니다. 루트 `README.md`는 `harness:start`~`harness:end` 블록을 그대로 옮깁니다. `pnpm-lock.yaml`은 손으로 병합하지 않고 `pnpm install`로 다시 만듭니다 |
| 제외 | 템플릿의 work item(`docs/work/0001-*` 등)과 변경 기록 본문, `scripts/init-project.mjs`, 루트 `README.md`의 `template:start`~`template:end` 블록, 디자인 토큰 값·이름, 제품 코드(`apps/*/src`의 화면·기능) | 옮기지 않습니다. 템플릿 work item이 필요한 맥락은 이식 티켓의 `진행 기록`에 템플릿 커밋으로 남깁니다 |

## 치환 규칙

| 값 | 템플릿 값 | 대상 저장소에서 |
| --- | --- | --- |
| 서비스 이름 | `app-skeleton`(Compose project, PM2 프로세스, 로그 문구), `app_skeleton`(DB 이름·계정) | 대상 저장소 이름. Compose project는 기존 이름과 같아야 기존 데이터 볼륨을 계속 씁니다([첫 실행](#pnpm-instance-첫-실행)) |
| 패키지 범위 | `@app-skeleton/*` | 대상 저장소 범위(`@<이름>/*`). `package.json` filter, `Makefile`, `ecosystem.config.cjs`, CI, 생성물 머리말 |
| 저장소 | `ai-worker-lab/skeleton-repository` | 대상 저장소 `owner/name` |
| 슬롯 0 포트 | [`infra/local/.env.example`](../../infra/local/.env.example)의 `API_PORT`·`WEB_PORT`·`EXPO_PORT`·`POSTGRES_PORT`·`VALKEY_PORT` | 이 다섯 값만 대상 저장소가 쓰던 포트로 바꿉니다. 다른 파일은 포트 숫자를 갖지 않고 `pnpm instance` 값을 씁니다 |
| 토큰 CSS 접두사 | `packages/design-tokens/src/tokens.json`의 `"$cssPrefix": "ds"`(→ `--ds-*`) | 대상 저장소가 쓰던 접두사(예: `pk` → `--pk-*`)를 이 값에 둡니다. 생성기와 `pnpm design:check`는 손대지 않아도 이 값을 따릅니다. 복사한 `design/system/DESIGN.md`의 `--ds-`는 새 접두사로 바꾸고, 웹 스타일(`apps/web/src/styles.css`의 `var(--ds-*)`)은 대상 저장소 것을 씁니다. 바꾼 뒤 `pnpm tokens:generate`와 `pnpm design:check`가 남은 옛 접두사를 고칠 이름과 함께 알려 줍니다([CSS 변수 접두사](../../packages/design-tokens/docs/usage.md#css-변수-접두사)) |
| OpenDesign 슬롯 | `packages/design-tokens/src/opendesign.json`의 `--bg` 등 슬롯이 가리키는 토큰 경로 | 대상 저장소 토큰 키에 맞게 참조를 바꿉니다. 빠진 의미 토큰은 `pnpm tokens:generate`가 목록과 추가 위치를 한 번에 알려 주며, 새 토큰 값은 `(AI 제안)`으로 표시하고 기존 값은 바꾸지 않습니다 |
| 기준 브랜치 | `WORKFLOW.md`의 `workspace.base`(`main`) | 대상 저장소의 통합 브랜치. `pnpm work:run`과 `pnpm work:scope`의 기본 기준이 함께 따라갑니다. CI는 `--base origin/<PR 기준 브랜치>`를 그대로 씁니다 |

치환 뒤 `git grep -nE 'app-skeleton|app_skeleton|skeleton-repository'`가 출처 표기 외에는 아무것도 찾지 않아야 합니다.

## 하네스 ADR 번호

하네스가 들여오는 결정은 [ADR 0006 AGENTS.md를 지도로](../adr/0006-agents-md-as-map.md), [ADR 0007 저장소 work item 실행기](../adr/0007-repository-work-item-runner.md), [ADR 0008 worktree별 로컬 인스턴스](../adr/0008-worktree-local-instances.md), [디자인 ADR 0001 OpenDesign 연결 방식](../../design/docs/adr/0001-opendesign-integration.md)입니다.

- 대상 저장소의 같은 폴더(`docs/adr/`, `design/docs/adr/`)에 이미 그 번호가 있으면 다음 빈 번호로 파일 이름과 첫 줄 제목을 바꿉니다. 번호가 겹치면 `pnpm docs:check`가 실패합니다.
- 바꾼 ADR의 `배경` 끝에 출처를 한 줄 적습니다. 예: "이 결정은 템플릿 skeleton-repository의 에이전트 하네스를 옮기며 들여왔습니다(원래 번호 ADR 0006, 이식 work item 0020)." ADR은 work item에 링크하지 않으므로(`pnpm docs:check`) work item은 번호만 적습니다.
- 옛 번호를 가리키는 곳을 함께 고칩니다: `git grep -nE 'adr/000[678]|ADR 000[678]'`(`Makefile`, `scripts/lib/instance.mjs`·`scripts/runner.mjs` 주석, `docs/README.md`, `docs/development/` 문서, `.omp/agents/infra.md`, `infra/AGENTS.md` 등).

## 정책 앵커 이동

ADR 0006에 따라 공통 정책 원문은 루트 `AGENTS.md`가 아니라 [저장소 공통 정책](repository-policy.md)에 있습니다. 대상 저장소 문서가 `AGENTS.md#변경-기록`처럼 옛 정책 위치의 anchor를 가리키면(대개 루트·영역 `CHANGELOGS.md`와 `RELEASES.md`의 머리말) `docs/development/repository-policy.md#변경-기록`으로 바꿉니다. 대상 저장소 고유 규칙은 루트 `AGENTS.md` 지도에 한 줄로 남기거나 `repository-policy.md`의 해당 절로 옮깁니다. 깨진 anchor와 `AGENTS.md` 크기 예산은 `pnpm docs:check`가 알려 줍니다.

## 기존 디자인 산출물

하네스 전에 만든 `design/<영역>/` 산출물은 색 리터럴이나 `handoff.md` 누락으로 `pnpm design:check`를 통과하지 못할 수 있습니다. 산출물을 이식 티켓에서 고치지 않고, 정리 work item을 만든 뒤 그 영역을 디자인 검사 기준선 `design/.check-baseline.json`에 사유와 work item 번호로 올립니다. 기준선 영역의 실패는 알림으로, 기준선에 없는 영역은 실패로 남습니다. 형식과 정리 후 기준선에서 지우는 규칙은 [이식 전 산출물 기준선](../../design/docs/opendesign.md#이식-전-산출물-기준선)이 기준입니다.

## 조사 문서와 PRD 위치

하네스는 벤치마킹을 `docs/product/research/`, 기술 조사를 `docs/references/`, PRD를 `docs/product/<서비스 또는 기능>.md`에 둡니다([제품 탐색과 PRD](../product/README.md)). 대상 저장소에 다른 위치의 조사 문서(예: 벤치마킹이 `docs/references/`에 있음)나 다른 이름의 PRD(예: `docs/product/requirements.md`)가 있으면 옮기거나 이름을 바꾸지 않고 `docs/product/README.md`의 문서 위치 표에서 연결합니다. 새 문서만 표의 위치를 따릅니다. `product-discovery` 스킬은 조사 전에 이 표에 연결된 기존 문서까지 찾아 읽습니다.

`pnpm docs:check`는 `docs/references/`·`docs/product/research/`의 문서에 `- 확인일: YYYY-MM-DD`(날짜 뒤 공백 다음 메모 가능)와 URL 출처(`[이름](URL)` 링크나 맨 URL)를 요구합니다. 확인일이 없는 기존 조사 문서는 마지막으로 확인한 날짜를 머리에 추가합니다.

## `pnpm instance` 첫 실행

이식 브랜치에서 `pnpm instance`(또는 `make up`)를 처음 실행하면 다음 파일이 생깁니다.

- `.local/instance.env`: 이 checkout의 슬롯, Compose project, 포트, 연결 주소. `.local/`은 Git에서 제외합니다. 주 checkout은 슬롯 0으로 `infra/local/.env.example`의 포트와 Compose project `<서비스 이름>`(`scripts/lib/instance.mjs`의 `BASE_NAME`)을 씁니다. 대상 저장소가 쓰던 Compose project 이름(`docker compose ls`, `docker volume ls`로 확인)과 다르면 새 빈 볼륨이 생기므로, 첫 `make up` 전에 이름을 맞춥니다. `make`는 이미 있는 `.local/instance.env`를 그대로 읽으므로 포트 원본을 바꾼 뒤에는 `pnpm instance`를 먼저 실행해 다시 만듭니다(이름과 Compose project는 유지).
- 없는 로컬 설정 파일: `infra/local/.env`, `apps/api/.env`, `apps/web/.env.local`, `apps/app/.env`. 추적 예시에서 만들고 포트·연결 값은 인스턴스 값으로 채웁니다. 이미 있는 파일은 덮어쓰지 않으며, `make` 대상이 넘기는 인스턴스 값이 파일 값보다 우선합니다([로컬 개발 환경](local-environment.md)). 대상 저장소의 기존 파일에 옛 포트가 남아 있고 `pnpm dev:*`처럼 직접 실행할 때도 새 값이 필요하면, 파일을 지우고 `pnpm instance`로 다시 만듭니다. 값 하나는 `pnpm instance --get <KEY>`(예: `--get WEB_PORT`)로 확인합니다.

## 검증 순서

이식 티켓의 수용 기준으로 다음을 차례로 확인하고 결과를 `진행 기록`에 남깁니다.

1. `pnpm install` 후 `pnpm verify` 전체가 통과합니다(API 테스트는 `make infra-up`으로 DB가 떠 있어야 합니다).
2. `pnpm docs:check`, `pnpm work:check`, `pnpm work:next`, `pnpm work:scope <이식 티켓 번호>`가 통과합니다. 기존 work item은 내용을 바꾸지 않고 새 검사를 통과해야 합니다. 통과하지 못하면 검사 규칙과 기존 형식 중 무엇을 맞출지 정하고 근거를 남깁니다.
3. `pnpm instance`가 슬롯 0에 대상 저장소의 포트와 Compose project를 보여 줍니다. `make up` 후 `pnpm smoke`가 통과하고, `make down`으로 멈춥니다(볼륨 유지). smoke는 첫 화면 문구를 보지 않으므로 대상 저장소의 화면 그대로 통과해야 합니다.
4. `pnpm design:check`가 통과합니다(기준선 영역은 알림). OpenDesign 앱이 실행 중이면 `pnpm design:sync`로 `user:<서비스 이름>` 디자인 시스템을 설치합니다.
5. `pnpm work:run --dry-run`이 다음 착수 티켓을 고르고, `pnpm work:run --print-prompt <번호>`가 같은 티켓의 프롬프트를 `WORKFLOW.md`로 렌더링합니다(에이전트는 실행하지 않음).
6. 템플릿 값이 남지 않습니다: 이름·패키지 범위·저장소(위 `git grep`), 템플릿 슬롯 0 포트, 템플릿 ADR 번호(출처 표기 제외), 접두사를 바꿨다면 `--ds-`.

이식 중 템플릿이 자기 값을 가정한 곳을 또 발견하면 대상 저장소에서 우회한 내용을 `진행 기록`에 적고, 템플릿 저장소에 work item으로 되돌려 설정 한 곳으로 모읍니다.
