# app-skeleton 웹

Next.js App Router와 TypeScript 기반 웹 클라이언트입니다. 서버 컴포넌트는 서버 전용 `API_INTERNAL_URL`로 Nest API를 직접 읽고, 브라우저 요청은 same-origin BFF(`/api/backend`)를 거쳐 Nest API로 전달합니다. BFF는 허용 목록에 있는 요청만 전달하며 현재는 `GET /api/health`만 허용합니다.

현재 시작 화면(서비스 이름, 한 줄 컨셉, API·DB 준비 상태 표시)은 초기 시작점이며 제품 기능이 아닙니다.

저장소 루트에서 `pnpm dev:web` 또는 `pnpm --filter @app-skeleton/web start`로 개발 서버를 `http://localhost:15173`에서 실행하고, `pnpm --filter @app-skeleton/web build`로 프로덕션 빌드를 생성합니다. API는 `http://127.0.0.1:13000`을 사용합니다.

`make up`(또는 `pnpm instance`)이 `apps/web/.env.local`이 없으면 `.env.example`에서 만들고 `API_INTERNAL_URL`을 이 checkout 인스턴스의 API 주소(주 checkout은 `http://127.0.0.1:13000`)로 채웁니다. `make web-up`으로 띄우면 인스턴스 값이 파일 값보다 우선합니다([로컬 개발 환경](../../docs/development/local-environment.md#인스턴스와-포트)). `.env.local`에는 실제 비밀값을 저장하지 말고 서버 비밀값도 `NEXT_PUBLIC_*`로 설정하지 않습니다.
