# 🎯 msw-auto-mock

OpenAPI 스펙을 기반으로 MSW(Mock Service Worker) 핸들러를 자동으로 생성해주는 라이브러리입니다.

## ✨ 주요 기능

- 🚀 OpenAPI 스펙 기반 자동 핸들러 생성
- 📁 엔티티별 핸들러 파일 분리
- 🎮 프로그래밍 방식 API 지원
- 🛠 커스텀 컨트롤러를 통한 응답 커스터마이징 (controllers 타입 추론 지원)
- 🔄 다양한 응답 타입 지원 (JSON, Event Stream 등)

## 📦 설치 방법

npm registry에 배포 전이므로, portal 방식으로 link합니다.

### 1️⃣ 프로젝트 구조 설정

먼저 `my-project`와 `msw-auto-mock`을 같은 최상위 디렉토리에 위치시킵니다:

```
/workspace
├── my-project/    # 구현 프로젝트
└── msw-auto-mock/ # 라이브러리
```

### 2️⃣ `msw-auto-mock` 설정

`msw-auto-mock` 디렉토리에서:

```bash
cd msw-auto-mock
pnpm install
pnpm build
```

### 3️⃣ `my-project` 설정

`my-project` 디렉토리에서:

1. `package.json`에 다음 설정을 추가:

```json
{
  "scripts": {
    "generate-msw-mock": "tsx src/app/mocks/mock-generator.ts"
  },
  "devDependencies": {
    "@dataai/msw-auto-mock": "^0.31.0"
  },
  "resolutions": {
    "@dataai/msw-auto-mock": "portal:../msw-auto-mock"
  }
}
```

2. 의존성 설치:

```bash
cd my-project
yarn
```

### 4️⃣ `my-project`에 mock-generator 스크립트 추가

`my-project/src/app/mocks/mock-generator.ts` 파일을 생성:

```ts
import { type TOptions, generateMocks } from '@dataai/msw-auto-mock';
import type { TControllers } from './__types__/index';
import { controllers } from './controllers/index';

async function autoGenerateMocks() {
  try {
    console.log('[MSW] 목 파일 생성 시작...');

    const options: TOptions<TControllers> = {
      controllers,
      input: './swagger/openapi.yml',
      outputDir: './src/app/mocks',
      environment: 'react',
      baseUrl: 'https://api.example.com/api/v1',
    };

    const result = await generateMocks(options);

    console.log('[MSW] 목 파일 생성 완료!');
    console.log('[MSW] 생성된 파일 경로:', result.targetFolder);

    return result;
  } catch (error) {
    console.error('[MSW] 목 파일 생성 중 오류 발생:', error);
    throw error;
  }
}

autoGenerateMocks();
```

### 5️⃣ MSW 핸들러 생성

`my-project` 디렉토리에서:

```bash
yarn generate-msw-mock
```

## 🔧 사용 방법

### 기본 설정

```ts
const options: ProgrammaticOptions = {
  /**
   * OpenAPI 스펙 파일 경로
   * YAML 또는 JSON 형식 지원
   * @required
   */
  input: './swagger/openapi.yml',

  /**
   * 생성된 핸들러 파일이 저장될 디렉토리
   * @optional
   * @default 'src/app/mocks'
   */
  outputDir: './src/app/mocks',

  /**
   * API 기본 URL
   * @optional
   * - string: 지정된 URL을 기본 URL로 사용
   * - true: OpenAPI 스펙의 servers[0].url을 기본 URL로 사용
   */
  baseUrl: 'https://api.example.com',

  /**
   * 생성할 mock 파일의 환경 설정
   * @optional
   * @default 'react'
   * - next: Node.js와 브라우저 환경을 위한 mock 파일 생성
   * - react: 브라우저 환경을 위한 mock 파일 생성
   * - react-native: React Native 환경을 위한 mock 파일 생성
   */
  environment: 'react',

  /**
   * 배열 응답의 최대 길이
   * @optional
   * @default 3
   * faker.js로 생성되는 배열 응답의 최대 아이템 개수를 제한합니다.
   * 예: users 배열이 100개의 아이템을 가질 수 있더라도, maxArrayLength: 3으로 설정하면
   *     최대 3개의 사용자 데이터만 생성됩니다.
   */
  maxArrayLength: 3,

  /**
   * 포함할 API 경로 패턴
   * @optional
   * 예: '/api/v1/*' - /api/v1/로 시작하는 경로만 포함
   */
  includes: '/api/v1/*',

  /**
   * 제외할 API 경로 패턴
   * @optional
   * 예: '/api/v1/health' - /api/v1/health 경로 제외
   */
  excludes: '/api/v1/health',

  /**
   * HTTP 상태 코드
   * @optional
   * 예: '200,201' - 200과 201 상태 코드만 사용
   */
  codes: '200,201',

  /**
   * 정적 응답 사용 여부
   * @optional
   * @default false
   * true: faker.js를 사용하지 않고 정적 응답 생성
   */
  static: false,

  /**
   * 사용자 정의 응답 컨트롤러
   * @optional
   * faker.js를 사용하지 않고 API 엔드포인트별 커스텀 응답 생성
   */
  controllers: {
    getGetUsersUsersGet200Response: () => userList,
    ...
  },

  /**
   * 컨트롤러 import 경로
   * @optional
   * @default '@/app/mocks/controllers'
   */
  controllerPath: '@/app/mocks/controllers',
};
```

## 📁 생성되는 파일 구조

```
src/app/mocks/
├── __types__/
│   ├── users.type.ts
│   ├── chats.type.ts
│   ├── ...
│   ├── index.ts
├── __handlers__/
│   ├── users.handlers.ts
│   ├── chats.handlers.ts
│   └── ...
│   └── index.ts
└── browser.ts
```

## 🔄 지원하는 환경

- 🌐 React (Browser)
- ⚡ Next.js (Node.js + Browser)
- 📱 React Native
