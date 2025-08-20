import { match } from 'ts-pattern';
import type { TRequestGroup } from './adapter';
import type { TApiRecorderData, THTTPRest, THTTPStream } from './api-recorder.types';

type TemplateContract = {
  ofScenario(scenarioId: string, requestGroups: TRequestGroup[]): string;
  ofAllCombined(templates: string[]): string;
};

class OverrideHandlerTemplate implements TemplateContract {
  ofScenario(scenarioId: string, requestGroups: TRequestGroup[]): string {
    const handlers = requestGroups.map(group => this.#handler(group.method, group.url, group.responses));

    return `
      import { HttpResponse, http } from 'msw';
      
      export const ${this.#scenarioName(scenarioId)}Handlers = [
        ${handlers.join('\n').trimEnd()}
      ]
    `;
  }

  ofAllCombined(scenarios: string[]): string {
    const handlersImport = scenarios
      .map(scenario => `import { ${this.#scenarioName(scenario)}Handlers } from './${scenario}.handlers';`)
      .join('\n');

    const combineHandlers = `export const overrideHandlers = {
      ${scenarios.map(scenario => `"${scenario}": ${this.#scenarioName(scenario)}Handlers,`).join('\n')}
    }`;

    return [handlersImport, combineHandlers].join('\n\n');
  }

  #scenarioName(scenarioId: string): string {
    return scenarioId.replace(/[^a-zA-Z0-9]/g, '');
  }

  #handler(method: string, url: string, groupData: TApiRecorderData[]): string {
    const responses = groupData
      .map(data => {
        return match(data)
          .with({ type: 'http-rest' }, restData => this.#restResponse(restData))
          .with({ type: 'http-stream' }, streamData => this.#streamResponse(streamData))
          .otherwise(() => '');
      })
      .filter(Boolean);

    const responseArray = `[${responses.join(', ')}]`;

    return `
        (() => {
          let requestCount = 0;
          return http.${method.toLowerCase()}(
            '${url}',
            () => {
              const responses = ${responseArray};
              const responseIndex = Math.min(requestCount, responses.length - 1);
              requestCount++;
              return responses[responseIndex];
            },
          );
        })(),\n
    `;
  }

  #restResponse(restData: THTTPRest): string {
    return `new HttpResponse(JSON.stringify(${JSON.stringify(restData.response?.body)}), {
      status: ${restData.response?.status},
      headers: ${JSON.stringify(restData.response?.headers)},
    })`;
  }

  #streamResponse(streamData: THTTPStream): string {
    const body = `createStreamingResponse(${JSON.stringify(streamData.streamEvents)})`;
    return `new HttpResponse(${body}, {
      status: ${streamData.response?.status},
      headers: ${JSON.stringify(streamData.response?.headers)},
    })`;
  }
}

export { OverrideHandlerTemplate, type TemplateContract as OverrideHandlerTemplateContract };
