import type { TApiRecorderData, THTTPStream } from './api-recorder.types';

type AdapterContract = {
  requestGroups(apiRecorderJson: TApiRecorderData[]): TRequestGroup[];
};

class OverrideHandlerAdapter implements AdapterContract {
  requestGroups(apiRecorderJson: TApiRecorderData[]): TRequestGroup[] {
    const groups = new Map<string, TApiRecorderData[]>();

    for (const data of apiRecorderJson) {
      if (data.type === 'http-rest' || data.type === 'http-stream') {
        const key = `${data.request.method}:${data.request.url}`;

        if (!groups.has(key)) {
          groups.set(key, []);
        }
        const group = groups.get(key);
        if (group) {
          if (data.type === 'http-stream') {
            group.push({
              ...data,
              parsedStreamEvents: this.#parseStreamData(data),
            });
          } else {
            group.push(data);
          }
        }
      }
    }

    return Array.from(groups.entries()).map(([key, responses]) => {
      const colonIndex = key.indexOf(':');
      if (colonIndex === -1) {
        throw new Error(`유효하지 않은 요청 키 형식: ${key}`);
      }

      const method = key.substring(0, colonIndex);
      const url = key.substring(colonIndex + 1);

      return {
        method,
        url,
        responses,
      };
    });
  }

  #parseStreamData(streamData: THTTPStream): THTTPStream['parsedStreamEvents'] {
    return streamData.streamEvents.map(chunk => {
      return {
        event: (chunk.type || 'message_delta') as 'message_start' | 'message_delta' | 'message_end',
        data: typeof chunk.data === 'string' ? chunk.data : JSON.stringify(chunk.data),
        delay: chunk.delay,
      };
    });
  }
}

export { OverrideHandlerAdapter, type AdapterContract as OverrideHandlerAdapterContract };

export type TRequestGroup = {
  method: string;
  url: string;
  responses: TApiRecorderData[];
};
