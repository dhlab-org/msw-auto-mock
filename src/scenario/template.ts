type TemplateContract = {
  ofConfig(): string;
};

class ScenarioTemplate implements TemplateContract {
  ofConfig(): string {
    return `import type { TScenarioConfig } from './__types__/scenarios/scenarios.type';

/**
 * MSW 시나리오 설정
 * 
 * 두 가지 시나리오 타입을 지원합니다:
 * 
 * ## 1. Custom Status 타입 (Base Handler 사용)
 * - 헤더 'x-scenario'를 통해 특정 시나리오를 활성화
 * - 브라우저에서 쿼리 파라미터로 시나리오 변경 시, 각 프로젝트에서 interceptor 설정 필요
 * 
 * 예시:
 * - 기본 (헤더 없음): 성공 응답 (200-299)
 * - curl -H "x-scenario: TC-1.1" /api/users
 * - curl -H "x-scenario: TC-1.2" /api/users
 * 
 * allowCustomStatus: true를 사용하면 OpenAPI 명세에 없는 status 코드도 사용 가능합니다.
 * 
 * ## 2. API Recorder 타입 (Override Handler 사용)
 * - 브라우저 URL 쿼리 파라미터로 시나리오 동적 변경 가능
 * - api-recorder와 msw-auto-mock 통합 사용
 * - worker.use로 동적으로 핸들러 추가되는 방식
 * - demoData에 api-recorder로 export한 JSON 데이터를 넣어주세요
 * 
 * 예시:
 * - ?scenario=login-success
 * - ?scenario=api-error
 * 
 */
export const scenarios: TScenarioConfig = {
  // 예시 시나리오들 (필요에 따라 수정/추가)
  'TC-1.1': {
    description: '성공 시나리오',
    type: 'custom-status',
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
    type: 'custom-status',
    api: {
      // "/users": {
      //   "GET": { status: 500 },
      //   "POST": { status: 400 }
      // },
      // 커스텀 status 코드 사용 예시
      // "/users/:id": {
      //   "GET": { status: 418, allowCustomStatus: true }
      // }
    }
  },
  'login-success': {
    description: '로그인 성공 데모',
    type: 'api-recorder',
    demoData: []
  }
};
`;
  }
}

export { ScenarioTemplate, type TemplateContract as ScenarioTemplateContract };
