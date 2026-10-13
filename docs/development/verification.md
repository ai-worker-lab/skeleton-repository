# 검증 루프

CI는 개발자 또는 에이전트의 로컬 실행 환경에서 수행하며 GitHub Actions에서는 실행하지 않습니다. 정적 검사·빌드·테스트는 `pnpm verify`, 실행 중인 API·웹 확인은 `pnpm smoke`입니다. 각 명령의 실제 단계는 스크립트가 기준이며 이 문서는 사용법과 완료 전 확인 범위를 설명합니다.

## `pnpm verify`

[`scripts/verify.mjs`](../../scripts/verify.mjs)가 루트 `package.json`의 script를 `pnpm run <단계>`로 순서대로 실행합니다. 각 단계의 출력은 그대로 보이고, 끝에 단계별 결과(`통과`·`실패`·`건너뜀`)와 소요 시간, 실패 단계의 해결 안내를 요약합니다. 실패가 하나라도 있으면 종료 코드 1로 끝납니다.

| 명령 | 단계 |
| --- | --- |
| `pnpm verify` | `test:init → tokens:check → work:check → docs:check → design:check → lint → typecheck → build → test` |
| `pnpm verify --fast` | `test:init → tokens:check → work:check → docs:check → design:check → lint → typecheck` |

- 기본은 첫 실패에서 멈추고 남은 단계를 `건너뜀`으로 표시합니다. 모든 단계 결과를 보려면 `--keep-going`을 붙입니다.
- `test:init`은 임시 Git 복사본에서 초기화 CLI의 입력·미리보기·식별자·포트·기존 설정 보호·검증 재시도를 검사합니다. 실제 설치·빌드는 아래 CI 절차의 초기화 복사본 검증으로 확인합니다.
- `.local/instance.env`([인스턴스 설정](local-environment.md))가 있으면 그 값을 환경변수로 보충합니다. 이미 설정된 환경변수가 우선합니다. `test` 단계의 API 통합 테스트는 이 값의 `TEST_DATABASE_URL`로 현재 작업공간의 PostgreSQL에 연결합니다.
- `test`는 실제 PostgreSQL이 필요합니다. 먼저 `make infra-up`으로 DB를 띄웁니다.
- `design:check`는 `design/` 산출물의 색 리터럴과 인계 문서를 검사하고, 로컬 OpenDesign이 실행 중일 때만 `od lint`를 함께 돌립니다([OpenDesign 사용 기준](../../design/docs/opendesign.md#검사)). OpenDesign이 없는 실행 환경에서는 `od lint`를 건너뛰며 이를 검증 기록에 구분합니다.

## `pnpm smoke`

[`scripts/smoke.mjs`](../../scripts/smoke.mjs)가 실행 중인 API·웹에 [Playwright 테스트](../../tests/smoke/smoke.spec.ts)를 실행합니다. 서비스를 띄우지 않으며, 띄운 서비스의 주소만 받습니다.

1. 주소는 `API_URL`·`WEB_URL` 환경변수, 없으면 `.local/instance.env`의 같은 키를 씁니다. 둘 다 없으면 `make up` 안내와 함께 실패합니다.
2. 두 주소가 연결을 받는지 먼저 확인하고, 응답이 없으면 `make up`·`pnpm logs api`·`pnpm logs web` 안내와 함께 실패합니다.
3. Playwright Chromium을 실행할 수 없으면 `pnpm exec playwright install chromium` 안내와 함께 실패합니다.
4. `playwright test -c tests/smoke/playwright.config.ts`를 실행합니다. `pnpm smoke` 뒤의 인자는 그대로 넘깁니다(예: `pnpm smoke --headed`, `pnpm smoke -g 모바일`).

검사 항목([`tests/smoke/smoke.spec.ts`](../../tests/smoke/smoke.spec.ts)):

- API liveness `GET /api/health`가 200과 `{ status: 'ok' }`, readiness `GET /api/health/ready`가 200과 `{ status: 'ready' }`. 경로와 응답 형식의 기준은 [`packages/shared/src/index.ts`](../../packages/shared/src/index.ts)입니다.
- 웹 첫 화면(`/`)이 200으로 열리고 보이는 내용이 있으며 브라우저 콘솔 오류와 페이지 예외가 없음. 특정 화면 문구는 검사하지 않으므로 첫 화면을 바꾸는 기능 티켓도 smoke를 고치지 않고 통과합니다. 화면별 시나리오와 웹→API 연결은 기능의 통합 티켓이 E2E로 확인합니다([기술 설계와 티켓 분해](../specs/README.md)).
- 1280px·390px 폭에서 `document.documentElement.scrollWidth <= clientWidth`(가로 넘침 없음).

실패한 테스트의 trace는 `.local/smoke/test-results/`에 남습니다. `pnpm exec playwright show-trace <trace.zip>`으로 엽니다.

## CI

CI는 GitHub Actions 밖에서 실행합니다. 기본 실행 환경은 개발자 또는 에이전트의 로컬 checkout이며, 검증 원본은 `package.json`의 명령과 `scripts/verify.mjs`입니다. PR·push 이벤트로 검증 workflow를 실행하지 않습니다([ADR 0010](../adr/0010-local-ci-actions-cd.md)).

```sh
pnpm install --frozen-lockfile
make up
pnpm verify --keep-going
pnpm smoke
pnpm work:scope 0013 --base origin/main # 실제 티켓 번호와 PR 기준 브랜치 사용
make down
```

- smoke 브라우저는 최초 한 번 `pnpm exec playwright install chromium`으로 설치합니다. `make down`은 데이터 볼륨을 보존합니다.
- PR에 검증한 커밋 또는 변경 식별자, Node/pnpm 버전, 실행 명령·결과·미실행 범위를 남깁니다. 코드를 고쳤으면 영향받는 검증을 다시 수행합니다. 로컬 검증을 건너뛰거나 실패를 성공으로 기록하지 않습니다.
- Node.js 지원 대상은 22·24·26이고 로컬 기본값은 `.nvmrc`입니다. 기본 버전 외 호환성을 주장하려면 각 버전의 로컬 실행 결과를 따로 기록합니다. Actions matrix가 대신 확인한다고 가정하지 않습니다.
- 초기화 CLI나 치환 규칙을 바꾸면 검증 대상 변경이 포함된 새 복사본에서 [새 프로젝트 시작 안내](new-project.md)를 실행합니다. 최대 40자 이름(`project-abcdefghijklmnopqrstuvwxyz-12345`)·포트 오프셋 12173으로 초기화하고 `--finish`, `make up`, `pnpm verify`, `pnpm smoke`를 확인한 뒤 종료합니다. 원본 checkout을 초기화하지 않습니다.

### CD와의 경계

GitHub Actions는 CD의 기본 실행 환경입니다. CI 실행량·대기열·실패·산출물 때문에 CD가 의존하거나 멈추지 않도록 다음 경계를 유지합니다.

- Actions에 `verify`, 테스트 matrix, PR smoke, 초기화 회귀 검증 같은 CI job을 등록하지 않습니다. 로컬 CI를 Actions의 self-hosted runner로 옮기는 것도 이 정책에 맞지 않습니다.
- CD는 프로젝트에서 승인한 배포 트리거로 실행합니다. CI workflow의 `workflow_run`, CI job의 `needs`, CI check 성공 상태나 CI workflow artifact를 실행 조건/입력으로 요구하지 않습니다.
- 배포에 필요한 build·패키징·업로드·배포 후 상태 확인은 CD에 포함할 수 있습니다. 일반 코드 검증은 로컬 CI가 맡고 PR 검증 증적과 사람의 승인 절차를 유지합니다.
- workflow는 배포 대상·환경·권한·secret·복구 방법이 정해진 프로젝트에서 작성합니다. 현재 템플릿에는 실행 가능한 CD workflow가 없습니다([배포 계획](../architecture/deployment-target.md)).
- CI workflow만 제거/비활성화하며 저장소 Actions 전체를 끄거나 다른 CD workflow를 수정하지 않습니다. workflow 배치는 [Actions 디렉터리 안내](../../.github/workflows/README.md)를 따릅니다.

이 분리는 CI의 Actions 사용을 없애는 변경입니다. 기존 계정 결제·한도 문제 자체를 해결하거나 CD 실행 성공을 보장하는 것은 아닙니다.

## 완료 보고 전 확인 범위

work item을 `검증` 상태로 올리거나 완료를 보고하기 전에 변경 영역에 맞는 명령을 실제로 실행하고, 실행한 명령과 결과를 work item `진행 기록`에 남깁니다. 실행하지 않은 검증을 통과로 적지 않습니다.

| 변경 영역 | 실행 |
| --- | --- |
| 문서·work item만 | `pnpm verify --fast` |
| 디자인(`design/`, 토큰 원본) | `pnpm tokens:generate`, `pnpm design:sync`, `pnpm design:check --require-lint`, `pnpm verify --fast`. 미리보기는 1280px·390px에서 직접 확인합니다([OpenDesign 사용 기준](../../design/docs/opendesign.md)). |
| 스크립트·설정·`packages/*` | `pnpm verify` |
| API(`apps/api/`) | `make infra-up` 후 `pnpm verify`, `make up` 후 `pnpm smoke` |
| 웹(`apps/web/`) | `pnpm verify`, `make up` 후 `pnpm smoke`. 바꾼 화면은 브라우저로 직접 확인합니다([웹 규칙](../../apps/web/AGENTS.md)). |
| 앱(`apps/app/`) | `pnpm verify`. 화면 동작은 [기기 테스트](../../apps/app/docs/device-testing.md)로 확인합니다(자동 UI 테스트 없음). |
| 인프라·`Makefile`·PM2 설정 | `make up` 후 `make status`, `pnpm smoke` |
| `.github/workflows/` | `pnpm verify --fast`, 바꾼 job이 실행하는 명령을 로컬에서 같은 순서로 실행 |

## 실패 출력 읽는 법

- `pnpm verify`: 맨 아래 `검증 요약`에서 `실패` 단계를 찾고, `해결 안내`의 명령을 먼저 실행합니다. 원인은 요약 위쪽의 `▶ <단계>` 아래 출력에 있습니다. 같은 단계만 다시 볼 때는 `pnpm <단계>`(예: `pnpm lint`)를 실행합니다.
- `pnpm smoke`: 테스트 전 확인 단계가 실패하면 출력의 명령(`make up`, `pnpm logs api`, `pnpm exec playwright install chromium`)을 따릅니다. 테스트 실패는 Playwright 출력의 테스트 이름·기대값과 함께 적힌 설명(예: readiness 503이면 API의 `DATABASE_URL`)을 확인합니다. 콘솔 오류는 `pnpm logs web`·`pnpm logs api`와 함께 봅니다.
- 로컬 CI: 위 명령의 출력과 `pnpm logs <서비스>`를 확인하고 실패 근거를 PR/work item에 남깁니다. CD 오류는 해당 프로젝트 배포 workflow의 로그에서 확인합니다.
