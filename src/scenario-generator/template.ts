type TemplateContract = {
  generate(): string;
};

class ScenarioTemplate implements TemplateContract {
  generate(): string {
    return `import type { TScenarioConfig } from '@dataai/msw-auto-mock';

/**
 * MSW 시나리오 설정
 * 
 * 헤더 'x-scenario'를 통해 특정 시나리오를 활성화할 수 있습니다.
 * 
 * 예시:
 * - 기본 (헤더 없음): 성공 응답 (200-299)
 * - curl -H "x-scenario: success" /api/users
 * - curl -H "x-scenario: error" /api/users
 */
export const scenarios: TScenarioConfig = {
  // 예시 시나리오들 (필요에 따라 수정/추가)
  'TC-1.1': {
    description: '성공 시나리오',
    api: {
      // "/users": {
      //   "GET": { status: 200 },
      //   "POST": { status: 201 }
      // },
      // "/users/{id}": {
      //   "GET": { status: 200 },
      //   "PUT": { status: 200 },
      //   "DELETE": { status: 204 }
      // }
    }
  },
  'TC-1.2': {
    description: '오류 시나리오',
    api: {
      // "/users": {
      //   "GET": { status: 500 },
      //   "POST": { status: 400 }
      // }
    }
  }
};
`;
  }
}

export { ScenarioTemplate, type TemplateContract as ScenarioTemplateContract };
