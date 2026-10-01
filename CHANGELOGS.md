# 변경 기록

내부 참고용 전체 변경 기록입니다. 공개·배포 여부와 관계없이 모든 변경을 기록합니다. 이 파일에는 전용 로그가 없는 `design/`, `packages/`, `docs/`, `.github/`, 루트 설정·정책 변경과 여러 영역에 걸친 작업의 요약을 둡니다. 영역별 세부 변경은 [인프라](infra/CHANGELOGS.md), [백엔드 API](apps/api/CHANGELOGS.md), [웹](apps/web/CHANGELOGS.md), [앱](apps/app/CHANGELOGS.md) 로그에 있습니다.

공개 릴리스 노트는 [RELEASES](RELEASES.md)에 있습니다. 작성 규칙은 [루트 AGENTS.md의 변경 기록](AGENTS.md#변경-기록)을 따릅니다.

## 2026-10-01

- who-when 저장소의 검증된 구조에서 서비스 고유 내용을 걷어내 초기 뼈대 구성: pnpm workspace, 공통 정책(`AGENTS.md`), OMP agent 정의(`.omp/`), work item 규칙과 검사(`docs/work/`, `scripts/work.mjs`), ADR 0001~0005, GitHub Actions CI(Node 22·24·26), ESLint + Prettier, 공유 계약 `@app-skeleton/shared`(liveness·readiness·`ApiError`), 디자인 토큰 `@app-skeleton/design-tokens`, 새 서비스 초기화 스크립트(`scripts/init-project.mjs`). 영역별 세부는 [인프라](infra/CHANGELOGS.md)·[API](apps/api/CHANGELOGS.md)·[웹](apps/web/CHANGELOGS.md)·[앱](apps/app/CHANGELOGS.md) 로그.
