# ADR 0010: API 백엔드를 NestJS 또는 FastAPI로 선택

- 날짜: 2026-10-15
- 상태: 제안 (사용자의 Python + FastAPI 선택 지원 요청에 따른 구현안)
- 범위: 저장소 전체 (API 구현, 개발·검증 명령, 템플릿 초기화)

## 배경

기존 템플릿은 NestJS + TypeScript API만 제공하며 실행·검증·초기화 도구도 `apps/api`에 연결되어 있습니다. 사용자는 NestJS를 유지하면서 선택적으로 Python + FastAPI API를 구성할 수 있는 구조와 PR을 요청했습니다. 웹·Expo 앱의 기존 HTTP 계약과 worktree별 로컬 인스턴스를 유지하면서 언어별 개발 도구를 분리할 필요가 있습니다.

## 결정

이 PR에서 검토할 구현안은 다음과 같습니다. 별도의 설계 승인을 받은 것으로 간주하지 않습니다.

1. `apps/api`는 기존 NestJS 기본 구현으로 유지하고 FastAPI는 `apps/api-python`에 둡니다. 한 실행 환경에서 하나만 선택합니다.
2. 추적 파일 `api.config.json`의 `backend`를 기본 선택으로 삼고 `API_BACKEND` 환경변수가 우선합니다. `init-project --api`가 새 서비스의 선택을 저장합니다.
3. `pnpm api`가 언어별 설치·실행·검사 명령을 연결합니다. 루트 빌드·검증, Makefile·PM2는 같은 선택 함수를 사용합니다. 인스턴스 설정은 두 API에 같은 포트·DB 연결 값을 준비합니다. 선택하지 않은 Python 도구는 기본 NestJS 사용에 필요하지 않습니다.
4. Python 의존성은 `pyproject.toml`·`uv.lock`으로 관리하고 Python 3.12에서 확인합니다. JS/TS의 pnpm lockfile과 Python의 uv lockfile은 각각의 도구가 갱신합니다.
5. 두 API는 기존 HTTP 경로·JSON 응답·오류·환경변수 계약을 지킵니다. `packages/shared`의 TypeScript 계약을 Python에서 직접 import하지 않으며 Python 모델·테스트를 함께 유지합니다.
6. CI는 NestJS의 지원 Node 조합과 FastAPI의 Python 조합을 검사하고 같은 API·웹 smoke를 두 백엔드에서 실행합니다.

실행 가능한 설정과 사용법의 기준은 [API 백엔드 선택](../development/api-backends.md), 검증 범위는 [검증 루프](../development/verification.md)입니다.

## 검토한 대안

- 기존 API를 FastAPI로 교체하면 NestJS를 사용하는 서비스의 호환성과 사용자의 선택 요구를 충족하지 못합니다.
- 한 프로세스 구성에서 두 API를 동시에 띄우면 포트·도메인 책임·데이터 쓰기 주체가 늘어납니다. 현재 요청은 하나의 API 구현 선택입니다.
- Python 서비스를 pnpm 패키지처럼 포장하면 공통 명령을 연결하기 쉽지만 Python 의존성의 실제 원본을 흐립니다. 공통 명령은 저장소 스크립트에 두고 Python 설치·잠금은 uv가 맡습니다.

## 결과와 트레이드오프

- 기존 NestJS 사용자는 기본값으로 같은 실행 흐름을 사용하고 Python 사용자는 공통 로컬 인프라·검증·클라이언트를 재사용합니다.
- 두 언어의 구현과 HTTP 계약 일치를 유지해야 합니다. 공유 계약 변경은 두 백엔드의 통합 테스트와 smoke로 확인합니다.
- 백엔드 선택은 구현을 골라 실행하는 기능입니다. 제품별 비즈니스 로직이나 migration·데이터를 다른 언어로 변환하는 기능은 제공하지 않습니다.
- Python의 build는 컴파일 가능성 확인이며 배포 패키지 생성과 다릅니다. 실제 배포 구성과 운영 자원 검증은 [배포 대상 아키텍처](../architecture/deployment-target.md)에 따른 후속 작업입니다.
