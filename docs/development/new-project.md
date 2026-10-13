# 새 프로젝트 시작 안내

모든 프로젝트는 NestJS API·Next.js 웹·Expo 앱과 공유 계약·디자인 토큰을 함께 사용합니다. 구성의 원본은 루트 `package.json`, `pnpm-workspace.yaml`, `apps/*/package.json`입니다. 초기화는 이 구성을 줄이거나 프레임워크를 교체하지 않습니다.

## 복제와 초기화

GitHub **Use this template**로 새 저장소를 만들고 clone하는 방법은 [README](../../README.md)에 있습니다. 프로젝트마다 별도 저장소와 고유한 이름을 씁니다. 초기화는 새 복사본에서 `make up` 전에 실행합니다.

```sh
node scripts/init-project.mjs --help
node scripts/init-project.mjs --name my-service --repo my-org/my-service --port-offset 2000 --dry-run
node scripts/init-project.mjs --name my-service --repo my-org/my-service --port-offset 2000
```

`--repo`는 새 GitHub `origin`(HTTPS·SSH)이 설정되어 있으면 생략할 수 있습니다. 원격이 없거나 템플릿 원격이면 명시해야 합니다. 이 옵션은 파일 속 저장소 식별자만 바꾸며 Git 원격·GitHub 저장소를 만들거나 수정하지 않습니다. `git remote -v`로 새 저장소를 가리키는지 확인하세요.

GitHub 템플릿 기능을 쓸 수 없으면 기존 템플릿 checkout에서 추적 파일만 새 빈 폴더로 복사합니다. 개인 `.env`, `.git`, 설치된 의존성은 복사하지 않습니다.

```sh
# 템플릿 checkout에서 실행. 목적지 폴더는 새 경로여야 합니다.
mkdir ../my-service
git archive HEAD | tar -x -C ../my-service
cd ../my-service
git init -b main
git add -A
node scripts/init-project.mjs --name my-service --repo my-org/my-service --dry-run
node scripts/init-project.mjs --name my-service --repo my-org/my-service
# GitHub에 빈 프로젝트 저장소를 만든 후 설정합니다.
git remote add origin https://github.com/my-org/my-service.git
```

## 바뀌는 값과 보호하는 파일

| 대상 | 동작 |
| --- | --- |
| 프로젝트 이름 | 패키지 범위, DB 사용자/이름 예시, Compose·PM2·Expo 이름/scheme, 디자인 시스템과 문서의 템플릿 식별자를 치환 |
| 저장소 | 템플릿 `owner/name`을 새 값으로 치환. 소유자는 추정하지 않음 |
| 로컬 포트 | `infra/local/.env.example`의 다섯 키만 기본 포트 + 오프셋으로 수정. 다른 숫자와 컨테이너 내부 포트는 유지 |
| 기존 로컬 설정·추적 파일 수정 | 적용 전 실패. 내용을 출력하거나 자동 삭제/덮어쓰기하지 않음 |
| 바이너리·심볼릭 링크·추적되지 않은 파일 | 치환하지 않음 |
| 초기화 도구·계약 테스트 | 원본 템플릿 식별자를 유지. `--finish` 마무리 재시도와 회귀 검사를 위해 보존 |

`--dry-run`은 적용 예정 파일과 설정만 보여 주며 파일·설치 상태를 바꾸지 않습니다. 전체 파일을 읽고 입력을 검사한 뒤 적용하므로 잘못된 입력은 일부 파일만 바뀐 상태로 남기지 않습니다. 디스크 쓰기 실패나 강제 종료까지 트랜잭션으로 복구하지는 않으므로 그런 경우 새 복사본에서 다시 시작합니다.

오프셋은 자동 포트 예약이 아닙니다. 다른 프로젝트와 연결 worktree가 사용하는 포트를 확인하고 고유한 값을 정하세요. worktree는 이 프로젝트의 슬롯 0 포트에 슬롯당 100을 더합니다([로컬 환경](local-environment.md#인스턴스와-포트)).

## 실패 복구와 검증

초기화가 적용된 후 설치·검증이 실패하면 원인을 해결하고 다음 명령을 실행합니다. 같은 이름으로 초기화를 반복하지 않습니다. 이름 치환으로 달라진 코드 줄 길이를 맞추기 위해 설치 후 Prettier 서식을 정규화하며, 재시도에서도 현재 파일의 서식을 정규화합니다.

```sh
node scripts/init-project.mjs --finish
```

이 명령은 이름·포트를 다시 치환하지 않고 `pnpm install --frozen-lockfile`, `pnpm exec prettier --write .`, `pnpm verify --fast`, `pnpm build`를 실행합니다. `--no-verify`로 적용만 한 경우에도 이 검증이 남아 있습니다. 초기화 전에 로컬 설정이 생겼다면 서비스를 중지하고 설정을 별도로 보관하거나 새 clone을 사용하세요.

```sh
pnpm exec playwright install chromium
make up
pnpm verify
pnpm smoke
make status
git add -A
git commit -m "프로젝트 초기화"
```

이 검증은 로컬 개발자·에이전트 환경에서 실행합니다. GitHub Actions에는 CI를 등록하지 않고 프로젝트의 CD 용도로 사용합니다([실행 경계](verification.md#ci)). 전체 검증에는 실제 PostgreSQL을 쓰는 API 테스트가 포함됩니다. Expo는 타입 검사와 개발 서버 시작까지 확인하고, iOS·Android 실제 동작은 [기기 테스트](../../apps/app/docs/device-testing.md)로 별도 확인합니다. 종료할 때 `make down`은 DB 볼륨을 보존합니다.

## 프로젝트별로 정할 내용

- README 서비스 소개·대상 사용자·제품 요구사항. 다음 작업은 [제품 탐색과 PRD](../product/README.md) 절차를 따릅니다.
- Expo 배포용 iOS bundle identifier·Android application ID, 서명·스토어 계정·EAS 프로젝트. `app.json`의 이름·scheme 치환만으로 배포 등록이 완료되지는 않습니다.
- 환경별 비밀값·도메인·배포 대상. [배포 대상 문서](../architecture/deployment-target.md)는 미구현 계획이며 모든 프로젝트의 클라우드 선택을 확정하지 않습니다.
- 원본에서 물려받은 work item·ADR·변경 기록은 템플릿의 이력입니다. 새 제품의 구현·배포 실적으로 취급하지 않고 첫 제품 work item부터 새 기록을 남깁니다.

템플릿의 후속 수정은 파생 저장소에 자동 반영되지 않습니다. 필요한 커밋만 검토해 적용하고 프로젝트 자체 검증을 다시 실행합니다. 이미 운영 중인 다른 저장소에 하네스만 넣는 경우에는 [하네스 적용 안내](adopting-harness.md)를 따릅니다.
