# 0013 프로젝트 공통 템플릿 초기화 안정화

- 단계: 티켓
- 역할: orchestrator
- 상태: 검증
- 종류: 유지보수
- 우선순위: P1 (AI 제안)
- 작성일: 2026-10-13

## 목적

모든 신규 프로젝트가 같은 NestJS·Next.js·Expo 베이스에서 시작하고, 복제 후 프로젝트 식별자와 개발 환경을 안전하게 분리할 수 있게 합니다.

## 수용 기준

- [x] 기존 API·웹·앱·공유 계약·디자인 토큰·하네스 구성을 유지한다.
- [x] 새 프로젝트의 이름·저장소·포트를 정확하게 설정하고 포트와 무관한 숫자는 보존한다.
- [x] 미리보기, 잘못된 입력, 기존 로컬 설정/수정 발견 시 파일을 바꾸지 않는다. 바이너리·심볼릭 링크를 훼손하지 않는다.
- [x] 검증 실패 후 초기화를 다시 적용하지 않고 검증을 재실행할 수 있다.
- [x] 초기화 회귀 테스트와 기존 전체 검증, 실제 초기화 복사본의 실행·smoke 검증을 기록한다.
- [x] 변경을 커밋·push하고 main 대상 검토 가능한 PR을 전달한다. 머지·배포는 별도다.

## 범위

- 포함: 초기화 CLI, 회귀 테스트, CI, 새 프로젝트 시작 안내와 공통 문서.
- 제외: 다른 기술 스택/선택 프리셋, 제품 기능, 모바일 배포 식별자 발급, 원격 인프라 생성, 머지·배포.

## 위험·복구

초기화는 새 복사본의 추적 파일을 수정합니다. 변경 계획을 먼저 만들고 로컬 설정·기존 수정이 있으면 적용 전에 중단합니다. 테스트는 임시 복사본을 사용하며 원본 저장소의 로컬 DB·설정은 건드리지 않습니다.

## 연결

- [HIST-298](https://shaul1991.atlassian.net/browse/HIST-298)
- [초기화 코드](../../../scripts/init-project.mjs), [검증 기준](../../development/verification.md)

## L0 요청 접수·라우팅

- 식별자: 0013-L0. 사용자 요청: “해당 repo를 확인하고, 모든 프로젝트별 스켈레톤 repo로 사용할 수 있도록 하자.”
- 대상: `ai-worker-lab/skeleton-repository`. 접수일: 2026-10-13, 정확한 시각 불명. 15:14:33 KST에 작업 중임을 확인.

## L1 요구 정의

- 식별자: 0013-L1, 선행: 0013-L0.
- 사용자 확정: “모든 프로젝트는 일단 위 기술 스택을 베이스로 시작하려 한다.”
- 의도: 매 프로젝트마다 공통 실행·개발·검증 기반을 다시 만들지 않고 동일한 출발점을 재사용한다.
- 성공 기준: 위 수용 기준. 스택 범용화나 선택기는 추가하지 않는다.

## L2 설계·계획

- 식별자: 0013-L2, 선행: 0013-L1.
- [계획] 현재 스택과 폴더를 유지하고 초기화 진입점의 정확성·안전성·재검증을 보강한다. 기존 하네스를 그대로 재사용할 수 있고 불필요한 생성기/추상화를 피하기 위함이다.
- 순서: CLI 계약 회귀 테스트를 먼저 실행해 결함 확인 → 최소 수정 → 사용 안내·CI 연결 → 기존 검증과 실제 복사본 검증 → 커밋·PR. 하위 단계는 선행 증적 뒤에 수행한다.
- CLI 사용 흐름: 도움말 → 새 저장소 복제 → 이름·저장소·포트 미리보기 → 적용·검증 → 실패 시 검증만 재실행 → 서비스 실행·첫 제품 요구 작성.
- 검증: 최소 CLI 통합 테스트, 전체 verify, 초기화한 복사본의 의존성 설치·검증·빌드·Compose 기동·API/웹 smoke. 일회성 CLI 실행 시간을 관찰하며 서비스 처리량을 바꾸지 않으므로 부하 벤치마크는 비대상이다.
- 멈춤 조건: 사용자 데이터 손실 위험, 외부 차단 또는 미확정 제품/스택 변경이 필요할 때 종속 작업 중단. 승인·머지·배포는 수행하지 않는다.
- [결정 · AI 판단] 포트는 원본 환경 설정의 키만 수정한다. 문서·테스트의 무관한 숫자 및 컨테이너 내부 포트는 치환하지 않는다.

## 진행 기록

- 2026-10-13: origin/main `a5b988e`와 로컬 main 일치, 기존 변경 없음, 열린 PR 없음. GitHub `isTemplate: true` 확인.
- 2026-10-13: 변경 전 `pnpm verify --fast` 6단계 통과(7.6초). 실제 작업 시작 시각 불명. HIST 기록 연결 후 진행.

- 2026-10-13: L3 구현 증적: `work/0013-project-template-initialization`의 `scripts/init-project.mjs`·계약 테스트·CI·시작 안내. 17개 계약 테스트 중 수정 전 13개 실패 → 수정 후 17개 통과. 저장소 입력 재치환 테스트 1개를 추가해 실패 확인 후 수정, 총 18개 통과.
- 2026-10-13: [진행] 계획 보완: 실제 복사본에서 이름 길이에 따른 Prettier 실패를 확인. 초기화 마무리 명령을 `--finish`로 명명하고 설치 → 서식 → 검증 → 빌드 순서로 구성. 초기화 식별자는 재치환하지 않는다. CI는 이름 최대 길이 40자와 포트 교차 경계값(오프셋 12173)을 사용한다.

## L4 기존 초기화 구현 검증

- 식별자: 0013-L4. 대상: 위 L3의 작업 브랜치 변경. 로컬 Node 22.23.2·pnpm 10.10.0.
- 초기화 계약 테스트 18건 통과. 전체 `pnpm verify` 9단계 통과(18.8초), API 통합 테스트 2 suite/9건 포함. 원본 저장소의 테스트도 이번에 만든 임시 복사본의 격리 DB를 사용.
- 실제 전체 파일 복사본: `project-abcdefghijklmnopqrstuvwxyz-12345`(40자), `example/template-check`, 오프셋 12173. `--no-verify` 적용 후 `--finish`의 frozen 설치·Prettier 정규화·빠른 검증 7단계·API/웹 build 통과. CI template job과 같은 명령 순서.
- 복사본 `make up`으로 PostgreSQL·Valkey·API·웹·Expo 실행. API 통합 테스트 9건, `pnpm smoke` 5건 통과(API liveness/readiness, 웹 렌더링·콘솔·1280/390px 넘침). Expo Metro `/status` 응답 확인.
- `pnpm docs:check`, `pnpm work:check`, `pnpm work:scope 0013`, `git diff --check`, CI YAML 파싱 통과.
- 당시 미실행: iOS/Android 실제 기기·시뮬레이터 UI, OpenDesign 외부 앱 lint(산출물 HTML 없음), 원격 배포·부하 벤치마크, Node 24/26 및 GitHub Actions. 이후 CI 실행 위치는 아래 L1/L2 개정으로 변경.
- 검증 로그: `/tmp/skeleton-init-final.log`, `/tmp/skeleton-copy-final.log`, `/tmp/skeleton-full-verify.log`, `/tmp/skeleton-copy-tests.log`, `/tmp/skeleton-copy-smoke.log`(세션 로컬). 재현은 본문 명령과 CI로 가능.
- 일회성 초기화 CLI 회귀 18건 약 2.2초. 서비스 처리량을 바꾸지 않아 부하 검증은 비대상.

## L5 이전 전달 기록

- 검토 PR: [#1](https://github.com/ai-worker-lab/skeleton-repository/pull/1), base `main`, head `work/0013-project-template-initialization`. 구현 커밋 `cfd7b4c`. 13개 관련 파일이 PR에 포함됨을 확인. 승인·머지·배포는 수행하지 않았다.
- L6 통합·배포 및 L7의 최종 통합 증적은 PR 승인·머지 후 담당자가 기록한다. 로컬 구현·검증·PR 전달은 끝났으나 당시에는 아래 외부 차단으로 `보류/종료`였다. 이후 사용자 요청으로 CI 실행 위치를 변경했으며 현재 상태는 아래 개정 기록이 기준이다.

- 2026-10-13: [외부 차단] [GitHub Actions 실행](https://github.com/ai-worker-lab/skeleton-repository/actions/runs/38356953759)의 6개 job 모두 계정의 결제 실패 또는 지출 한도 사유로 시작되지 못했다. 코드 테스트 실패 결과가 아니며 Node 24/26과 GitHub runner 검증은 미실행이다.
- 당시 재개 조건(아래 L1/L2-v2로 대체됨): 계정 소유자가 GitHub Billing & plans를 확인한 뒤 PR 최신 head의 CI를 재실행하고 성공 여부를 확인. HIST-298은 `보류`, Actual end는 비운다. 로컬 QA 서비스는 `make down`으로 종료하고 DB 볼륨은 보존했다.

## L1/L2 개정: CI 실행과 CD 분리

- 식별자: 0013-L1-v2, 선행: 0013-L0 및 2026-10-13 후속 요청.
- 사용자 원문: “CI 실행은 github actions에서 하지 않는것으로 하자. cd에 대한 primary가 github action인데, CI 때문에 CD가 문제가 생기면 안된다.”
- 의도: CI가 GitHub Actions의 실행 자원·한도를 소모하거나 CD의 workflow 의존성이 되어 배포를 막지 않게 한다.
- 추가 수용 기준: 실행 가능한 CI workflow가 저장소에 없고, 등록된 CI workflow만 비활성화하며, Actions 전체 설정은 활성으로 유지한다. 로컬 검증 명령을 유지하고 실제 CD 미구현 상태를 명확히 한다.
- 식별자: 0013-L2-v2, 선행: 0013-L1-v2. 기존 CI 추가 계획과 Actions 실행 대기는 대체됨. 초기화 CLI 구현·기존 로컬 검증 증적은 유효하며 변경되는 실행 정책·문서 검증 증적은 갱신한다.
- [진행] 계획 변경: `ci.yml` 제거 → CI를 로컬에서 실행하는 절차와 Actions의 CD의 실행 경계/ADR 작성 → 로컬 검사 → CI workflow만 비활성화 → 기존 PR에 전달. 먼저 선언과 검증 증적을 갖춘 뒤 원격 실행을 중지하며 CD 실행 설정은 보존한다.
- [피드백] CI 추가 시 CD 자원과 실행 경계를 확인하지 못했다. 이후 Actions workflow를 추가할 때 CD 용도인지 확인하고 CI는 로컬에서 수행한다.
- [결정 · 사용자 확정] GitHub Actions는 CD용으로 사용하고 CI는 밖에서 실행. 이유는 CI가 CD를 방해하지 않아야 하기 때문. 시점: 2026-10-13.
- 조회 근거: 등록 workflow `CI`(371762183)만 존재, Actions `enabled: true`. CD workflow 없음. ruleset·main 보호 조회는 GitHub 플랜 제한 403으로 확인 불가. 보호/요금 설정은 변경하지 않는다.
- 검증: `pnpm verify --fast`, `pnpm work:scope 0013`, 변경·링크 검사, 실행 가능한 workflow 부재, 원격 CI 상태와 Actions 활성 확인. 런타임·기존 테스트를 바꾸지 않으므로 기기 UI·배포·부하 검증은 반복하지 않는다.

## L3/L4-v2 구현·검증

- 대상: 0013-L2-v2에 따른 현재 작업 브랜치의 CI workflow 제거, ADR 0010 및 연결된 README·AGENTS·검증/배포/이식 안내·PR 템플릿 변경.
- `pnpm verify --fast` 7단계 통과(9.0초, 초기화 회귀 18건 포함). 문서 84개 링크 검사, `pnpm work:scope 0013`, `git diff --check` 통과.
- `.github/workflows/`에 실행 가능한 YAML workflow가 없음을 확인. 로컬 검증 코드·package scripts·제품 코드는 이전 검증 커밋과 차이 없음.
- 원격 CI workflow 371762183만 비활성화 후 `disabled_manually` 확인. 저장소 Actions 설정은 `enabled: true`, 기존에 CD workflow가 없어 변경한 CD 정의도 없음.
- CI의 Actions 재실행은 더 이상 수용 기준이 아니다. 이전 빌링 차단은 이 작업의 완료 조건에서 제외하되 계정 문제를 해결했다고 주장하지 않는다. 실제 CD 구현·실행, 계정 요금·보호 설정 변경, 머지·배포는 미수행.
- 저장소 work item의 `검증`은 PR 승인·머지 전 전달 상태다. HIST는 사용자 전역 기준에 따라 검증·커밋·push·PR 전달 확인 후 완료할 수 있다.

## L5-v2 PR 전달

- 2026-10-13: 정책 변경 커밋 `7f2d23c`를 push하고 [PR #1](https://github.com/ai-worker-lab/skeleton-repository/pull/1)의 제목·본문을 최종 범위와 검증 결과로 갱신했다. base `main`, head `work/0013-project-template-initialization`, 상태 `OPEN`, 관련 변경 21개 파일 포함을 확인했다.
- 해당 커밋의 GitHub check run은 0개이며 원격 CI는 `disabled_manually`, Actions 전체는 `enabled: true`다. 로컬 CI 검증 증적과 검토 PR 전달로 수용 기준을 충족한다.
- 실제 CD workflow 구현, PR 승인·머지, 배포는 미수행이다. L6/L7의 통합·배포 증적은 담당자가 해당 작업 후 기록한다.
