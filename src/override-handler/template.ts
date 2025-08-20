import { match } from 'ts-pattern';
import type { TApiRecorderData, THTTPRest, THTTPStream } from './api-recorder.types';

type TemplateContract = {
  ofScenario(scenarioId: string, apiRecorderJson: TApiRecorderData[]): string;
  ofAllCombined(templates: string[]): string;
};

class OverrideHandlerTemplate implements TemplateContract {
  ofScenario(scenarioId: string, apiRecorderJson: TApiRecorderData[]): string {
    const imports = this.#imports();
    const handlers = apiRecorderJson.map(apiRecorderData => {
      return match(apiRecorderData)
        .with({ type: 'http-rest' }, restData => this.#ofHttpRest(restData))
        .with({ type: 'http-stream' }, streamData => this.#ofHttpStream(streamData))
        .with({ type: 'socketio' }, () => '')
        .exhaustive();
    });

    return `
      ${imports}
      
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

  #imports(): string {
    return [`import { HttpResponse, http } from 'msw';`].join('\n');
  }

  #ofHttpRest(restData: THTTPRest): string {
    return `
      http.${restData.request.method.toLowerCase()}(
        '${restData.request.url}',
        () => {
          return new HttpResponse(${JSON.stringify(restData.response?.body)}, {
            status: ${restData.response?.status},
            headers: ${JSON.stringify(restData.response?.headers)},
          });
        },
      ),\n
    `;
  }

  #ofHttpStream(streamData: THTTPStream): string {
    const body = `createStreamingResponse(${JSON.stringify(streamData.streamEvents)})`;
    return `
      http.${streamData.request.method.toLowerCase()}(
        '${streamData.request.url}',
        () => {
          return new HttpResponse(${body}, {
            status: ${streamData.response?.status},
            headers: ${JSON.stringify(streamData.response?.headers)},
          });
        },
      ),\n
    `;
  }
}

export { OverrideHandlerTemplate, type TemplateContract as OverrideHandlerTemplateContract };
