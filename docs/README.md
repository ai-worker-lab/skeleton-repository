# 문서 인덱스

언어·문서 배치·동기화 등 공통 정책은 [루트 AGENTS.md](../AGENTS.md)가 기준입니다. 해당 영역 작업 시 루트에서 연결한 하위 `AGENTS.md`의 추가 규칙도 함께 확인합니다.

## 주요 문서

- [로컬 개발 환경](development/local-environment.md) — PostgreSQL/Valkey Compose와 로컬 웹·모바일 앱·API 실행
- [환경과 비밀값 관리](development/environment-secrets.md) — local/dev/prod 격리와 서비스별 설정 소유권
- [영역별 병렬 개발](development/parallel-work.md) — 자동 발견되는 OMP 역할, `jev_route` 직접 라우팅, 복합 작업의 `orchestrator` 통합
- [디자인 토큰 사용법](../packages/design-tokens/docs/usage.md) — `@app-skeleton/design-tokens` 원본 수정·생성·검사와 웹·앱 사용 방법
- [ADR 0001 디자인 토큰 단일 원본](adr/0001-design-tokens.md) — 디자인·웹·앱이 한 토큰 원본과 컴포넌트 규칙을 쓰는 결정
- [인프라 관리](../infra/README.md) — 환경별 설정 위치와 원격 구성 상태
- [ALM 운영 기준](alm/workflow.md) — 요구사항·work item·검증·배포·운영 피드백을 연결하는 도구 중립 절차
- [작업 관리](work/README.md) — 에픽·티켓·하위 티켓 work item의 형식·필드·검사 규칙과 `pnpm work` 명령
- [ADR 0002 work item을 저장소 문서로 관리](adr/0002-work-items-in-repository.md) — GitHub Issues 대신 `docs/work/`를 쓰는 결정
- [ADR 0003 work item 3단계](adr/0003-work-item-hierarchy.md) — 에픽·티켓·하위 티켓 구조와 "티켓" 용어를 정한 결정
- [ADR 0004 lint·format](adr/0004-lint-format.md) — ESLint + Prettier 선택과 ESLint 9 사용 이유
- [ADR 0005 로컬 인프라에 Valkey 유지](adr/0005-keep-valkey-local-infra.md) — API 연결은 용도가 생길 때 추가
- [외부 서비스·도구 의존](architecture/external-dependencies.md) — 현재 사용 중이거나 계획된 외부 SaaS·도구와 기준 위치
- [자주 묻는 질문](faq.md) — 저장소 구조, 개발 도구, 로컬 실행, 배포 목표, 언어 정책
- [배포 대상 아키텍처](architecture/deployment-target.md) — Vercel, Supabase, Oracle ARM 목표 구성 및 미구현 범위
- [NestJS API 구조와 구현 기준](architecture/nestjs-api.md) · [Next.js 웹 구조와 구현 기준](architecture/nextjs-web.md) · [Expo 모바일 구조와 구현 기준](architecture/expo-mobile.md) — 프레임워크별 구조와 현재 골격
- [Redis와 Valkey 비교](references/redis-vs-valkey.md) — 프로젝트 역사, 라이선스, 호환성, 기능 비교 자료
- [CHANGELOGS](../CHANGELOGS.md) — 공개 여부와 무관한 내부 전체 변경 기록. 영역별 로그는 `infra/` 및 `apps/` 아래에 있음
- [RELEASES](../RELEASES.md) — 사용자에게 공개한 릴리스 노트

제품 요구 문서는 아직 없습니다. 서비스를 시작하면 `product`가 `docs/product/`에 초안을 만들고, 제품 소개는 [루트 README](../README.md)에 둡니다.

## 문서 위치

- 제품·여러 영역 공통 문서: `docs/`
- 여러 영역에 영향을 주는 ADR: `docs/adr/`
- 백엔드 전용 문서와 ADR: `apps/api/docs/`, `apps/api/docs/adr/`
- 모바일 앱 전용 문서와 ADR: `apps/app/docs/`, `apps/app/docs/adr/`
- 브라우저 웹 전용 문서와 ADR: `apps/web/docs/`, `apps/web/docs/adr/`
- 인프라 전용 문서와 ADR: `infra/docs/`, `infra/docs/adr/`
- 디자인 전용 문서와 ADR: `design/docs/`, `design/docs/adr/`
- 공용 패키지 전용 문서: `packages/<name>/docs/`
- 외부 기술·라이선스 비교 자료: `docs/references/`

하위 문서 폴더는 해당 범위의 첫 문서가 생길 때 만듭니다.
