# app-skeleton

<!-- template:start -->
서비스를 시작하기 위한 에이전트 친화 모노레포 뼈대입니다. pnpm workspace에 NestJS API, Next.js App Router 웹, Expo + React Native 앱, 공유 TypeScript 계약, 디자인 토큰, PostgreSQL·Valkey 로컬 인프라와 개발·운영 규칙(work item, ADR, CI), 그리고 코딩 에이전트가 혼자 검증하고 일할 수 있는 하네스(worktree별 로컬 인스턴스, `pnpm verify`·`pnpm smoke`, 규칙 검사, work item 실행기)를 담고 있습니다. 제품 기능은 없습니다.

## 이 템플릿으로 새 서비스 만들기

필요한 도구는 아래 [요구사항](#요구사항)을 봅니다.

1. 새 저장소를 만듭니다. GitHub에서는 이 저장소의 **Use this template**로 만들어 clone합니다. 템플릿 기능을 쓸 수 없으면 이력 없이 복사합니다.

   ```sh
   git clone --depth 1 <이 저장소 URL> my-service && cd my-service
   rm -rf .git && git init -b main && git add -A
   ```

2. 이름과 로컬 포트를 바꿉니다. 이름은 소문자 kebab-case이며 패키지 범위(`@<이름>/*`), DB·Compose·PM2 이름에 쓰입니다.

   ```sh
   corepack enable
   node scripts/init-project.mjs --name my-service --repo ai-worker-lab/my-service --port-offset 0
   ```

   `--port-offset`은 같은 PC에서 여러 서비스를 함께 실행할 때 겹치지 않도록 기본 포트(API 3000, 웹 5173, Expo 8081, PostgreSQL 5432, Valkey 6379)에 더할 값입니다. 스크립트는 이름·저장소·포트를 바꾸고, 템플릿 값으로 만든 로컬 설정(`.local/instance.env`, `.env` 파일)을 지운 뒤 `pnpm install`, `pnpm verify --fast`, `pnpm build`로 결과를 확인합니다. 이 안내 블록을 서비스 소개 자리로 바꾸고 `CHANGELOGS.md`에 시작 기록을 남긴 뒤 스스로를 지웁니다.
3. 실행과 검증을 확인하고 첫 커밋을 만듭니다.

   ```sh
   pnpm exec playwright install chromium   # smoke용 브라우저, 처음 한 번
   make up && pnpm verify && pnpm smoke
   git add -A && git commit -m "my-service로 초기화"
   ```

4. README 첫 부분에 서비스 소개를 적고, 첫 work item(예: MVP 범위)을 [docs/work/TEMPLATE.md](docs/work/TEMPLATE.md)로 만들어 `pnpm work:check`·`pnpm work:next`로 확인합니다. 에이전트에게 맡길 때는 티켓을 `준비`로 두고 `pnpm work:run`을 띄우거나([work item 실행기](docs/development/agent-runner.md)), 대화형 세션에서 티켓 경로를 알려 줍니다. 에이전트는 [AGENTS.md](AGENTS.md)를 지도로 씁니다.

<!-- template:end -->

현재 웹·앱 화면과 health endpoint는 실행 확인용 시작점이며 제품 기능이 아닙니다.

## 구조

- `docs/` — 여러 영역에 걸친 개발 문서. [문서 인덱스](docs/README.md)를 참고하세요.
- [CHANGELOGS](CHANGELOGS.md) — 내부 전체 변경 기록. 영역별 기록은 각 구성요소 디렉터리에 있음 / [RELEASES](RELEASES.md) — 공개 릴리스 노트
- `design/` — OpenDesign 프로젝트 파일과 디자인 산출물.
- `apps/app/` — Expo + React Native 모바일 앱.
- `apps/web/` — 앱 설치 없이 이용하기 위한 Next.js App Router 웹 클라이언트.
- `apps/api/` — NestJS + TypeScript API.
- `infra/` — [local·dev·prod 인프라 관리](infra/README.md). 현재 실행 가능한 구성은 local입니다.
- `packages/shared/` — 클라이언트와 API가 공유하는 TypeScript 계약.
- `packages/design-tokens/` — 디자인·웹·앱이 함께 쓰는 디자인 토큰 원본과 생성물. [사용법](packages/design-tokens/docs/usage.md)
- `scripts/` — 저장소 도구: work item 검사·착수 목록·소유 범위·실행기(`work.mjs`, `work-scope.mjs`, `runner.mjs`), 검증(`verify.mjs`, `smoke.mjs`, `docs-check.mjs`), 로컬 인스턴스·로그(`instance.mjs`, `logs.mjs`).
- `tests/smoke/` — 실행 중인 API·웹을 확인하는 Playwright smoke 테스트.
- [WORKFLOW.md](WORKFLOW.md) — work item 실행기의 정책과 에이전트 프롬프트.

에이전트용 지도는 [루트 AGENTS.md](AGENTS.md), 공통 정책 원문은 [저장소 공통 정책](docs/development/repository-policy.md), 영역별 추가 규칙은 각 하위 `AGENTS.md`가 기준입니다.

## 요구사항

- Node.js: 22·24·26 LTS를 지원하며 CI가 세 버전을 모두 검사합니다. 로컬 개발 기본 버전은 [`.nvmrc`](.nvmrc)입니다(`nvm use` 또는 `fnm use`).
- pnpm: 루트 `package.json`의 `packageManager` 값(`corepack enable` 후 자동 사용)
- Docker Engine/Desktop과 Compose v2 (로컬 PostgreSQL·Valkey용)
- make, PM2(`pnpm install` 시 함께 설치)

## 명령어

```sh
pnpm install
make up            # 로컬 인스턴스 설정 생성 후 인프라·API·웹·Expo 실행
make status        # 컨테이너 및 개발 서버 상태
make down          # 전체 종료(데이터 볼륨 유지)
make infra-restart # 인프라만 재시작 (api-·web-·app-restart도 같은 형식)
pnpm instance      # 이 checkout의 포트·주소·Compose project 출력
pnpm logs api      # 서비스 최근 로그 (api|web|app|infra, --lines N, --follow)
pnpm verify        # CI와 같은 전체 검증: 토큰·work item·문서·lint·타입·빌드·테스트
pnpm verify --fast # 빌드·테스트를 뺀 빠른 검증
pnpm smoke         # 실행 중인 API·웹에 Playwright smoke 테스트
pnpm format        # Prettier 서식 적용 후 ESLint 자동 수정
pnpm tokens:generate # 디자인 토큰 원본에서 CSS 변수·앱 객체·디자인 tokens.css 생성
pnpm work          # work item 트리(에픽 → 티켓 → 하위 티켓)와 진행률
pnpm work:next     # 지금 착수할 수 있는 work item
pnpm work:scope    # 현재 티켓 브랜치의 변경이 역할 소유 경로 안인지 검사
pnpm work:run      # WORKFLOW.md 정책으로 티켓마다 worktree와 코딩 에이전트 실행
```

`make up`은 없는 로컬 설정 파일(`infra/local/.env`, `apps/api/.env`, `apps/web/.env.local`, `apps/app/.env`)을 예시에서 만듭니다. 주 checkout의 로컬 주소는 API `http://localhost:13000/api/health`(DB 포함 준비 상태는 `/api/health/ready`), 웹 `http://localhost:15173`, Expo Metro `http://localhost:18081`, PostgreSQL `15432`, Valkey `16379`이고, 각 포트는 기본 포트(API 3000, 웹 5173, Expo 8081, PostgreSQL 5432, Valkey 6379)에 같은 오프셋을 더한 값입니다. git worktree는 슬롯마다 100씩 더한 포트와 별도 DB를 씁니다.

OMP의 역할 위임, 격리 실행, 계약 기반 mock 및 통합 절차는 [영역별 병렬 개발](docs/development/parallel-work.md)을 참고하세요.
자세한 내용은 [로컬 개발 환경](docs/development/local-environment.md), [검증 루프](docs/development/verification.md), [work item 실행기](docs/development/agent-runner.md), [환경과 비밀값 관리](docs/development/environment-secrets.md), [배포 대상 아키텍처](docs/architecture/deployment-target.md), [CHANGELOGS](CHANGELOGS.md)를 참고하세요.

디자인 산출물은 `design/`에 두고, 앱·API 소스는 이 폴더에 두지 않습니다.
