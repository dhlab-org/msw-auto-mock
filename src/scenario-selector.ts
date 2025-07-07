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
  const targetStatus = scenario.api[path][verb.toUpperCase()].status;

  if (!targetStatus) {
    return getDefaultScenario();
  }

  const matchedIndex = resultArray.findIndex(r => r.status === targetStatus);
  return matchedIndex !== -1 ? matchedIndex : 0;
}
