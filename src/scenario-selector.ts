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
): ResponseObject {
  const getDefaultScenario = (): ResponseObject => {
    const successIndex = resultArray.findIndex(r => r.status >= 200 && r.status < 300);
    return resultArray[successIndex !== -1 ? successIndex : 0];
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

  const matchedResponse = resultArray.find(r => r.status === targetStatus);

  if (matchedResponse) {
    return matchedResponse;
  }

  if (allowCustomStatus) {
    return {
      status: targetStatus,
      responseType: 'application/json',
      body: JSON.stringify({
        error: targetStatus >= 500 ? 'Internal Server Error' : 'Client Error',
        status: targetStatus,
      }),
    };
  }

  return getDefaultScenario();
}
