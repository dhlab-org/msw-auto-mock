import type { HttpResponseResolver } from 'msw';
import type { TScenarioConfig } from './types';

export type ResponseObject = {
  status: number;
  responseType: string | undefined;
  body: string | undefined;
};

export function selectResponseByScenario(
  verb: string,
  path: string,
  resultArray: ResponseObject[],
  info: Parameters<HttpResponseResolver<Record<string, never>, null>>[0],
  scenarios?: TScenarioConfig,
): number {
  const getDefaultScenario = () => {
    const successIndex = resultArray.findIndex(r => r.status >= 200 && r.status < 300);
    return successIndex !== -1 ? successIndex : 0;
  };

  const scenarioId = info.request.headers.get('x-scenario') || 'default';

  if (scenarioId === 'default' || !scenarios) {
    return getDefaultScenario();
  }

  const scenario = scenarios[scenarioId];
  const apiConfig = scenario.api[path]?.[verb.toUpperCase()];

  if (!apiConfig) {
    return getDefaultScenario();
  }

  const { status: targetStatus, allowCustomStatus = false } = apiConfig;

  const matchedIndex = resultArray.findIndex(r => r.status === targetStatus);

  // 일치하는 응답이 있으면 해당 인덱스 반환
  if (matchedIndex !== -1) {
    return matchedIndex;
  }

  // allowCustomStatus가 true이면 동적으로 응답 객체 생성
  if (allowCustomStatus) {
    const customResponse: ResponseObject = {
      status: targetStatus,
      responseType: 'application/json',
      body: JSON.stringify({
        error: targetStatus >= 500 ? 'Internal Server Error' : 'Client Error',
        status: targetStatus,
      }),
    };

    // resultArray에 커스텀 응답 추가하고 해당 인덱스 반환
    resultArray.push(customResponse);
    return resultArray.length - 1;
  }

  // 그 외의 경우 기본 시나리오 반환
  return getDefaultScenario();
}
