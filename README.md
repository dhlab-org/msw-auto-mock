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

## 🚀 ESM 지원 및 기술적 해결 방안

### Node.js 전용 기능이 CommonJS인 이유

`generateMocks` 함수는 다음과 같은 이유로 CommonJS로만 빌드됩니다:

1. **의존성 제약**: `@apidevtools/swagger-parser`, `swagger2openapi` 등의 핵심 의존성이 ESM을 지원하지 않음
2. **파일 시스템 접근**: Node.js의 `fs`, `path` 모듈을 직접 사용하여 파일 생성 작업 수행
3. **안정성**: CommonJS 환경에서 검증된 라이브러리들과의 호환성 보장

### React 프로젝트에서 ESM 사용 가능

React 프로젝트에서는 다음과 같은 방식으로 ESM을 완전히 지원합니다:

```typescript
// ✅ React 환경에서 ESM 사용 가능
import { selectResponseByScenario, transformJSONSchemaToFakerCode } from '@dataai/msw-auto-mock';

// ✅ Node.js 빌드 스크립트에서 CommonJS 사용
// (예: React 프로젝트의 scripts/mock-generator.ts)
import { generateMocks } from '@dataai/msw-auto-mock/node';
```

### 이중 패키지 구조의 장점

```
@dataai/msw-auto-mock
├── dist/
│   ├── index.js      # ESM (브라우저, React 등)
│   ├── index.cjs     # CommonJS (Node.js 호환)
│   └── node/
│       └── node.cjs  # Node.js 전용 CommonJS
```

이 구조를 통해:
- **브라우저 환경**: 가벼운 ESM 번들 사용
- **Node.js 환경**: 안정적인 CommonJS 사용  
- **React 프로젝트**: ESM으로 런타임 기능 사용, 빌드 스크립트는 CommonJS로 파일 생성

## 설치

```bash
npm install @dataai/msw-auto-mock
# 또는
yarn add @dataai/msw-auto-mock
# 또는
pnpm add @dataai/msw-auto-mock
```

## 환경별 사용법

### 기본 사용법 (환경 상관없이)

환경에 상관없이 사용할 수 있는 기능들입니다.

```typescript
// 타입 정의, 시나리오 선택, 가짜 데이터 생성 등
import { 
  selectResponseByScenario, 
  transformJSONSchemaToFakerCode,
  type TOptions,
  type TScenarioConfig,
  type ResponseObject
} from '@dataai/msw-auto-mock';
```

### Node.js 환경 (코드 생성)

Node.js 환경에서는 OpenAPI 스키마를 기반으로 MSW 핸들러 파일을 생성할 수 있습니다.

```typescript
// Node.js 전용 기능
import { generateMocks } from '@dataai/msw-auto-mock/node';

// 환경 상관없이 사용 가능한 기능들 (필요시 별도 import)
import { 
  selectResponseByScenario, 
  transformJSONSchemaToFakerCode,
  type TOptions 
} from '@dataai/msw-auto-mock';

await generateMocks({
  input: 'path/to/openapi.json',
  outputDir: 'src/mocks',
  environment: 'react' // 'react', 'next', 'react-native'
});
```

#### React 컴포넌트에서 사용 예제

```typescript
import React, { useState, useEffect } from 'react';
import { http, HttpResponse } from 'msw';
import { selectResponseByScenario, transformJSONSchemaToFakerCode } from '@dataai/msw-auto-mock';

const MyComponent: React.FC = () => {
  const [mockData, setMockData] = useState(null);

  useEffect(() => {
    // 시나리오 설정
    const scenarios = {
      'user-error': {
        description: '사용자 오류 시나리오',
        api: {
          '/api/users': {
            'GET': { status: 400, delay: 1000 }
          }
        }
      },
      'success': {
        description: '성공 시나리오',
        api: {
          '/api/users': {
            'GET': { status: 200, delay: 500 }
          }
        }
      }
    };

    // MSW 핸들러 설정
    const handler = http.get('/api/users', (info) => {
      const responses = [
        { status: 200, responseType: 'application/json', body: JSON.stringify({ users: [] }) },
        { status: 400, responseType: 'application/json', body: JSON.stringify({ error: 'Bad Request' }) },
        { status: 500, responseType: 'application/json', body: JSON.stringify({ error: 'Server Error' }) }
      ];

      const selectedIndex = selectResponseByScenario('GET', '/api/users', responses, info, scenarios);
      const selectedResponse = responses[selectedIndex];
      
      return HttpResponse.json(
        JSON.parse(selectedResponse.body || '{}'),
        { status: selectedResponse.status }
      );
    });

    // 가짜 데이터 생성 예제
    const userSchema = {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
        age: { type: 'integer', minimum: 18, maximum: 100 }
      }
    };

    const fakerCode = transformJSONSchemaToFakerCode(userSchema);
    console.log('Generated faker code:', fakerCode);

  }, []);

  return (
    <div>
      <h1>MSW Auto Mock React Example</h1>
      {/* 컴포넌트 내용 */}
    </div>
  );
};
```

#### Next.js에서 사용 예제

```typescript
// pages/api/mocks/setup.ts 또는 app/api/mocks/setup/route.ts
import { generateMocks } from '@dataai/msw-auto-mock/node';
import type { TOptions } from '@dataai/msw-auto-mock';

export default async function handler(req: any, res: any) {
  if (process.env.NODE_ENV === 'development') {
    const options: TOptions = {
      input: './public/openapi.json',
      outputDir: './src/mocks',
      environment: 'next'
    };
    
    await generateMocks(options);
    
    res.status(200).json({ message: 'Mocks generated successfully' });
  } else {
    res.status(404).json({ message: 'Not found' });
  }
}
```

```typescript
// components/MockProvider.tsx
import React from 'react';
import { selectResponseByScenario } from '@dataai/msw-auto-mock';

export const MockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 브라우저 환경에서 MSW 설정
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      import('../mocks/browser').then(({ worker }) => {
        worker.start();
      });
    }
  }, []);

  return <>{children}</>;
};
```

## API 문서

### 환경 상관없이 사용 가능한 API

#### `selectResponseByScenario`

시나리오 기반으로 응답을 선택하는 함수입니다. 헤더 `x-scenario`를 통해 특정 시나리오를 활성화할 수 있습니다.

```typescript
function selectResponseByScenario(
  verb: string,
  path: string,
  resultArray: ResponseObject[],
  info: Parameters<HttpResponseResolver<Record<string, never>, null>>[0],
  scenarios?: TScenarioConfig
): number
```

**사용 예시:**

```typescript
// 시나리오 설정
const scenarios = {
  'success': {
    description: '성공 시나리오',
    api: {
      '/api/users': { 'GET': { status: 200, delay: 500 } }
    }
  },
  'error': {
    description: '에러 시나리오',
    api: {
      '/api/users': { 'GET': { status: 500, delay: 1000 } }
    }
  }
};

// MSW 핸들러에서 사용
const handler = http.get('/api/users', (info) => {
  const responses = [
    { status: 200, responseType: 'application/json', body: '{"users": []}' },
    { status: 500, responseType: 'application/json', body: '{"error": "Server Error"}' }
  ];
  
  // 헤더 기반 시나리오 선택
  const selectedIndex = selectResponseByScenario('GET', '/api/users', responses, info, scenarios);
  const selectedResponse = responses[selectedIndex];
  
  return HttpResponse.json(JSON.parse(selectedResponse.body), {
    status: selectedResponse.status
  });
});
```

**테스트 시나리오 제어:**

```bash
# 성공 시나리오 테스트
curl -H "x-scenario: success" http://localhost:3000/api/users

# 에러 시나리오 테스트  
curl -H "x-scenario: error" http://localhost:3000/api/users

# 기본 시나리오 (헤더 없음 - 성공 응답 우선)
curl http://localhost:3000/api/users
```

#### `transformJSONSchemaToFakerCode`

OpenAPI 스키마를 Faker.js 코드로 변환하는 함수입니다.

```typescript
function transformJSONSchemaToFakerCode(
  jsonSchema?: OpenAPIV3.SchemaObject,
  key?: string
): string
```

### 타입 정의

```typescript
export type TScenarioConfig = {
  [scenarioId: string]: {
    description: string;
    api: Record<string, Record<string, {
      status: number;
      delay?: number;
    }>>;
  };
};

export type ResponseObject = {
  status: number;
  responseType: string | undefined;
  body: string | undefined;
};
```

## 패키지 구조

이 라이브러리는 기능별로 분리된 패키지로 제공됩니다:

- **기본 (메인 엔트리)**: 환경 상관없이 사용 가능한 기능들
- **Node.js 전용**: 파일 시스템 접근이 필요한 코드 생성 기능

```
@dataai/msw-auto-mock
├── dist/
│   ├── index.js      # 기본 ESM (환경 상관없이)
│   ├── index.cjs     # 기본 CommonJS (환경 상관없이)
│   └── node/
│       ├── node.js   # Node.js 전용 ESM
│       └── node.cjs  # Node.js 전용 CommonJS
```

## 사용법 요약

- **환경 상관없이 사용 가능**: `import { ... } from '@dataai/msw-auto-mock'`
- **Node.js 전용 기능**: `import { generateMocks } from '@dataai/msw-auto-mock/node'`

### 실제 사용 예시

```typescript
// React/Vue/Angular 등 모든 환경에서
import { selectResponseByScenario, transformJSONSchemaToFakerCode } from '@dataai/msw-auto-mock';

// Node.js에서 파일 생성 기능이 필요한 경우
import { generateMocks } from '@dataai/msw-auto-mock/node';

// 둘 다 필요하면 각각 import
import { selectResponseByScenario } from '@dataai/msw-auto-mock';
import { generateMocks } from '@dataai/msw-auto-mock/node';
```

## 라이선스

MIT
