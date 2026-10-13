# ADR 0010: CI는 로컬에서 실행하고 GitHub Actions는 CD에 사용

- 날짜: 2026-10-13
- 상태: 승인 (사용자 확정)
- 범위: 저장소 검증·프로젝트 템플릿·배포 실행 환경

## 배경

기존 템플릿은 PR과 main push마다 GitHub Actions에서 검사·빌드·테스트를 실행했다. 사용자는 GitHub Actions를 CD의 기본 실행 환경으로 정했으며 CI의 실행 자원·한도·의존성 때문에 CD가 영향을 받아서는 안 된다고 확정했다.

## 결정

1. CI는 로컬 개발자·에이전트 환경에서 실행한다. 기존 `pnpm verify`, `pnpm smoke`, `pnpm work:scope`와 초기화 복사본 검증을 유지한다.
2. GitHub Actions에 CI workflow를 두지 않고 기존 CI만 제거·비활성화한다. Actions 전체 설정과 프로젝트별 CD workflow는 보존한다.
3. CD는 승인된 배포 트리거로 실행하고 CI workflow 실행·check 성공·CI artifact에 의존하지 않는다. 배포에 필요한 빌드·패키징·배포 후 상태 확인은 CD 범위다.
4. 검증 증적과 사람의 승인 절차는 유지한다. Actions 상태를 로컬 검증의 대체 근거로 사용하지 않는다.

구체 명령과 운영 경계는 [검증 루프](../development/verification.md#ci), 배포 구성 상태는 [배포 대상 아키텍처](../architecture/deployment-target.md)가 원본이다.

## 결과·트레이드오프

CI가 Actions의 실행량·대기열을 소모하지 않는다. 대신 검증한 변경과 실행 환경·결과를 PR에 기록할 책임은 개발자·에이전트에게 있다. Node 버전별 자동 matrix 검사는 없어지므로 실행하지 않은 버전의 호환성을 통과로 주장하지 않는다.

이 결정은 GitHub 계정의 기존 결제·한도 문제 자체를 해소하지 않으며 CD 성공을 보장하지 않는다. 현재 템플릿에는 실제 CD workflow가 없다. 프로젝트별 배포 구현과 운영 검증은 대상이 확정된 뒤 수행한다.
