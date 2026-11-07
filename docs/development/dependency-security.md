# 보안 의존성 관리

버전·부모별 override·patch의 원본은 루트 `package.json`, 각 앱 `package.json`, `pnpm-lock.yaml`입니다. 현재 감사는 `pnpm audit --prod`(production 경로)와 `pnpm audit`(개발 도구 포함)로 다시 확인합니다. 감사 0건은 알려지지 않은 취약점이나 실제 배포 환경의 안전을 보장하지 않습니다.

## 범위와 호환성

Next15·Nest11·Expo54를 유지합니다. Expo의 RN0.81.5·React19.1.0 조합도 유지합니다. PM2는 수정 버전이 있는7계열로 갱신했습니다.

부모가 취약 버전을 고정하거나 수정판 범위를 허용하지 않는 경우에만 `pnpm.overrides`로 부모 또는 영향 버전 범위를 제한합니다.

- Next와 Expo Metro config의 PostCSS8: 동일 메이저 수정판을 사용합니다.
- Nest platform-express의 multer2: 동일 메이저 수정판을 사용합니다.
- Expo Metro wrapper와 metro-config의 Metro0.83: 취약 image-size에 대한 단독 메이저 override 대신 이미지 parser를 수정한 Metro0.83.8을 사용합니다. image-size2는 파일 경로 입력 API가 달라 직접 바꾸지 않습니다. [Metro 공식 변경](https://github.com/react/metro/releases/tag/v0.83.8).
- glob·minimatch: Expo CLI의 직접 의존성과 권고 영향 범위의 버전만 수정판으로 재해결합니다. `scripts/security-dependencies.test.mjs`는 실제 CLI helper와 패턴 처리 경로를 검사합니다. 전체 lint·Jest·Expo export도 확인합니다.
- PM2의 js-yaml은 같은 메이저의 수정판을 사용합니다. get-uri의 basic-ftp는 부모의5계열 제한을 넘어 수정된6.2.1을 사용합니다. get-uri가 호출하는 Client·access·lastMod·list·downloadTo·close API는 유지됩니다.

## URL decoder 패치

Router6이 사용하는 query-string7은 CommonJS이며 decode-uri-component를 함수로 바로 호출합니다. 수정된 decoder0.5.1은 ESM default export이므로 버전만 바꾸면 호출이 깨집니다.

`patches/query-string@7.1.3.patch`는 해당 require에 `.default`만 붙입니다. 실제 보안 수정 알고리즘은 upstream decoder0.5.1을 사용하며 자체 decoder를 복제하지 않습니다. pnpm의 `patchedDependencies`와 lock hash가 재설치에 이 패치를 적용합니다. synchronous ESM require와 ESLint 도구의 요구사항을 함께 만족하도록 Node 22.13 이상인 22계열·24.3 이상인 24계열·26계열을 지원합니다. 허용 범위의 원본은 루트 `package.json`의 `engines.node`이며, 각 버전의 호환성은 [로컬 CI](verification.md#ci)에서 실제 실행한 결과로 기록합니다.

한글·잘못된 percent 인코딩·반복 값의 처리와 roundtrip은 회귀 테스트에서 확인합니다. [decoder 보안 공지](https://github.com/advisories/GHSA-qr28-fpjm-wq7f).

## 남은 upstream 한계

deepmerge4.3.1은 2026-11-07 공식 권고와 npm registry 기준 수정 버전이 없습니다. Expo 설정 도구(`expo → @expo/config`)와 Nest CLI의 타입 검사 도구(`@nestjs/cli → fork-ts-checker-webpack-plugin`) 경로에 남은 Low 권고는 숨기거나 audit 제외 처리하지 않습니다. [공식 권고](https://github.com/advisories/GHSA-gcqx-w48m-w2h4).

새 수정판·부모 업데이트가 나오면 override와 patch를 함께 재검토하고, 불필요해진 항목을 삭제합니다. 감사 결과는 해당 실행 시점의 근거이며 고정 유효기간을 두지 않습니다.
