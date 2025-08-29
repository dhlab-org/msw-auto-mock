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
    const hasStreamingResponse = this.#hasStreamingResponse(requestGroups);
    const streamingUtils = hasStreamingResponse ? this.#streamingUtils() : '';

    const streamingImport = hasStreamingResponse ? `import type { TStreamingEvent } from '@dhlab/msw-auto-mock';` : '';

    return `
      ${streamingImport}
      import { HttpResponse, http } from 'msw';

      ${streamingUtils}
      
      export const ${this.#scenarioName(scenarioId)}Handlers = [
        ${handlers.join('\n').trimEnd()}
      ]
    `;
  }

  ofAllCombined(scenarios: string[]): string {
    const handlersImport =
      scenarios.length > 0
        ? scenarios
            .map(scenario => `import { ${this.#scenarioName(scenario)}Handlers } from './${scenario}.handlers';`)
            .join('\n')
        : '';

    const combineHandlers = `export const overrideHandlers = {
      ${scenarios.map(scenario => `"${scenario}": ${this.#scenarioName(scenario)}Handlers,`).join('\n')}
    }`;

    return scenarios.length > 0 ? [handlersImport, combineHandlers].join('\n\n') : combineHandlers;
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
    const status = restData.response?.status ?? 200;
    const options = {
      status,
      ...(restData.response?.headers && { headers: restData.response.headers }),
    };
    return `new HttpResponse(JSON.stringify(${JSON.stringify(restData.response?.body)}), ${JSON.stringify(options)})`;
  }

  #streamResponse(streamData: THTTPStream): string {
    const body = `createStreamingResponse(${JSON.stringify(streamData.parsedStreamEvents)})`;
    const status = streamData.response?.status ?? 200;
    const options = {
      status,
      ...(streamData.response?.headers && { headers: streamData.response.headers }),
    };
    return `new HttpResponse(${body}, ${JSON.stringify(options)})`;
  }

  #streamingUtils(): string {
    return `
      // streaming response utility
      function createStreamingResponse(messages: TStreamingEvent[]) {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            for (const chunk of messages) {
              if (chunk.delay) {
                await new Promise((resolve) => setTimeout(resolve, chunk.delay));
              }
              controller.enqueue(
                encoder.encode(\`event: \${chunk.event}\\n\${chunk.data ? \`data: \${chunk.data}\\n\` : ''}\\n\`)
              );
            }
            controller.close();
          },
        });
        return stream;
      }
    `;
  }

  #hasStreamingResponse(requestGroups: TRequestGroup[]): boolean {
    return requestGroups.some(group => group.responses.some(data => data.type === 'http-stream'));
  }
}

export { OverrideHandlerTemplate, type TemplateContract as OverrideHandlerTemplateContract };
