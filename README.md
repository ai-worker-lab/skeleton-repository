# app-skeleton

<!-- template:start -->
서비스를 시작하기 위한 모노레포 뼈대입니다. pnpm workspace에 NestJS API, Next.js App Router 웹, Expo + React Native 앱, 공유 TypeScript 계약, 디자인 토큰, PostgreSQL·Valkey 로컬 인프라와 개발·운영 규칙(work item, ADR, CI)을 담고 있습니다. 제품 기능은 없습니다.

## 이 템플릿으로 새 서비스 만들기

1. GitHub에서 이 저장소를 템플릿으로 새 저장소를 만들고 clone합니다.
2. 이름과 로컬 포트를 바꿉니다. 이름은 소문자 kebab-case이며 패키지 범위(`@<이름>/*`), DB·Compose·PM2 이름에 쓰입니다.

   ```sh
   node scripts/init-project.mjs --name my-service --repo ai-worker-lab/my-service --port-offset 0
   ```

   `--port-offset`은 같은 PC에서 여러 서비스를 함께 실행할 때 겹치지 않도록 기본 포트(API 3000, 웹 5173, Expo 8081, PostgreSQL 5432, Valkey 6379)에 더할 값입니다. 스크립트는 바꾼 뒤 `pnpm install`과 `tokens:check`·`work:check`·`lint`·`typecheck`·`build`를 실행해 결과를 확인합니다.
3. 스크립트는 이 안내 블록을 서비스 소개 자리로 바꾸고 `CHANGELOGS.md`에 시작 기록을 남긴 뒤 스스로를 지웁니다. README 첫 부분에 서비스 소개를 적습니다.
4. 첫 work item(예: MVP 범위)을 [docs/work/](docs/work/README.md)에 만들고 `pnpm work:check`로 확인합니다.

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
- `scripts/` — work item 검사(`work.mjs`).

문서 배치와 공통 작업 정책은 [루트 AGENTS.md](AGENTS.md), 영역별 추가 규칙은 해당 파일에서 연결한 하위 `AGENTS.md`가 기준입니다.

## 요구사항

- Node.js: 22·24·26 LTS를 지원하며 CI가 세 버전을 모두 검사합니다. 로컬 개발 기본 버전은 [`.nvmrc`](.nvmrc)입니다(`nvm use` 또는 `fnm use`).
- pnpm: 루트 `package.json`의 `packageManager` 값(`corepack enable` 후 자동 사용)
- Docker Engine/Desktop과 Compose v2 (로컬 PostgreSQL·Valkey용)
- make, PM2(`pnpm install` 시 함께 설치)

## 명령어

```sh
pnpm install
cp -n infra/local/.env.example infra/local/.env
chmod 600 infra/local/.env
cp -n apps/api/.env.example apps/api/.env
chmod 600 apps/api/.env
make up            # 인프라·API·웹·Expo 실행
make status        # 컨테이너 및 개발 서버 상태
make down          # 전체 종료(데이터 볼륨 유지)
make infra-restart # 인프라만 재시작
make api-restart   # API만 재시작
make web-restart   # 웹만 재시작
make app-restart   # Expo만 재시작
pnpm build         # 토큰 생성물 검사, 공용 패키지, API, 웹 빌드
pnpm typecheck     # 토큰 생성물 검사, 공용 패키지 빌드 후 전체 타입 검사
pnpm lint          # ESLint와 Prettier 검사
pnpm format        # Prettier 서식 적용 후 ESLint 자동 수정
pnpm test          # 통합 테스트(먼저 make infra-up)
pnpm tokens:generate # 디자인 토큰 원본에서 CSS 변수·앱 객체·디자인 tokens.css 생성
pnpm work          # work item 트리(에픽 → 티켓 → 하위 티켓)와 진행률
pnpm work:check    # work item 규칙 검사
```

로컬 주소는 API `http://localhost:13000/api/health`(DB 포함 준비 상태는 `/api/health/ready`), 웹 `http://localhost:15173`, Expo Metro `http://localhost:18081`이고, PostgreSQL은 호스트 포트 `15432`, Valkey는 `16379`를 사용합니다. 각 포트는 기본 포트(API 3000, 웹 5173, Expo 8081, PostgreSQL 5432, Valkey 6379)에 같은 오프셋을 더한 값입니다.

OMP의 infra·api·web·app·designer 역할 위임, 격리 실행, 계약 기반 mock 및 통합 절차는 [영역별 병렬 개발](docs/development/parallel-work.md)을 참고하세요.
자세한 내용은 [로컬 개발 환경](docs/development/local-environment.md), [환경과 비밀값 관리](docs/development/environment-secrets.md), [배포 대상 아키텍처](docs/architecture/deployment-target.md), [CHANGELOGS](CHANGELOGS.md)를 참고하세요.

디자인 산출물은 `design/`에 두고, 앱·API 소스는 이 폴더에 두지 않습니다.
