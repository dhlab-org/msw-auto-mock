import type { HttpResponseResolver } from 'msw';
import type { TScenarioConfig } from './types';

// 응답 객체 타입 정의
export type ResponseObject = {
  status: number;
  responseType: string | undefined;
  body: string | undefined;
};

// 시나리오 기반 응답 선택 함수 (인덱스 반환)
export function selectResponseByScenario(
  verb: string,
  path: string,
  resultArray: ResponseObject[],
  info: Parameters<HttpResponseResolver<Record<string, never>, null>>[0],
  scenarios?: TScenarioConfig,
): number {
  const scenarioId = info.request.headers.get('x-scenario') || 'default';

  // 기본 시나리오에서는 가장 낮은 상태 코드(성공 응답) 선택
  if (scenarioId === 'default' || !scenarios) {
    const successIndex = resultArray.findIndex(r => r.status >= 200 && r.status < 300);
    return successIndex !== -1 ? successIndex : 0;
  }

  // 시나리오 설정에서 매칭
  const scenario = scenarios[scenarioId];

  if (!scenario?.api?.[path]?.[verb]) {
    // 시나리오에 정의되지 않은 경우 기본 응답
    const successIndex = resultArray.findIndex(r => r.status >= 200 && r.status < 300);
    return successIndex !== -1 ? successIndex : 0;
  }

  const targetStatus = scenario.api[path][verb].status;
  const matchedIndex = resultArray.findIndex(r => r.status === targetStatus);
  return matchedIndex !== -1 ? matchedIndex : 0;
}
