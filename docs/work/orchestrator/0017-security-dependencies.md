# 0017 보안 수정 의존성 반영

- 단계: 티켓
- 역할: orchestrator
- 상태: 검증
- 종류: 유지보수
- 우선순위: P1 (AI 제안)
- 작성일: 2026-11-07

## 목적

새 서비스가 알려진 취약 버전으로 시작하지 않도록 웹·API·앱 의존성과 lockfile을 보안 수정 버전으로 갱신한다.

## 수용 기준

- [x] Next.js의 알려진 Critical을 포함해 수정 가능한 production 의존성 취약점을 해소하고 남은 한계를 명시한다.
- [x] 기존 프레임워크 메이저와 앱 SDK 호환성을 유지한다.
- [x] 전체 검증·API/웹 smoke·앱 번들 검증으로 주요 실행 경로를 확인한다.
- [ ] 변경·검증·원격 PR 상태를 기록하고 기존 play-laptop 초안을 보존한다.

## 범위

- 포함: 직접 의존성 최소 버전·간접 의존성 해소·lockfile·관련 변경 기록.
- 제외: 제품 기능, 인증 구현, 운영 배포, 사용자 데이터 변경.

## 위험·복구

간접 의존성 수정이 API·번들러와 충돌할 수 있어 실제 검증한다. 문제 발생 시 이 변경의 manifest와 lockfile을 함께 되돌린다. 기존 DB 볼륨은 삭제하지 않는다.

## 연결

- [검증 기준](../../development/verification.md)
- [공통 정책](../../development/repository-policy.md)

## 진행 기록

- 2026-11-07: 사용자 보안 수정·반영 요청으로 시작. 이전 pnpm production audit 집계 Critical1/High19/Moderate15/Low4를 현재 lockfile 기준으로 재확인하고 수정한다.
- 2026-11-07: production·개발 도구 포함 audit 모두 Critical0/High0/Moderate0/Low1. 남은 deepmerge4.3.1은 upstream 수정판이 없으며 제외하지 않았다. 별도 play-laptop 초기 초안은 npm audit 전체0건이라 보존했다.
- 2026-11-07: Node26.13.0에서 pnpm verify8단계 통과(스크립트15개·API9개 테스트 포함). iOS·Android Expo export 모두 성공. 실제 모바일 기기 실행은 하지 않았다.
- 2026-11-07: 독립 코드 검토에서 Node 최소 버전 안내와 basic-ftp 메이저 변경 설명을 정정했다. Node22/24/26의 query-string 연결·Expo 경로 생성·Babel 변환을 임시 검증했고 최종 의존성으로 frozen install·문서 검사를 통과했다.
- 2026-11-07: PM2 7.0.4로 API·웹을 기동하고 PostgreSQL 연결을 포함한 pnpm smoke5개 통과(Chromium, 웹1280px·390px). 최초 실행은 서버 준비 전 연결과 브라우저 실행 파일 부재로 중단돼 준비 완료·Chromium 설치 후 재실행했다.
- 2026-11-07: 새 임시 사본을 play-laptop/NestJS/port-offset30000으로 초기화해 설치·fast verify6단계·API/Web build·보안 회귀4개를 통과했다. 패치가 보존·적용되고 lockfile은 패키지 namespace만 바뀌는 것을 확인했다. 긴 이름에서 발견한 별도 서식 문제는0018에 분리했다.
- 2026-11-07: 검증용 API·웹·이 저장소의 PostgreSQL/Valkey를 종료했다. DB 볼륨과 다른 프로젝트의 실행 서비스는 보존했다.
