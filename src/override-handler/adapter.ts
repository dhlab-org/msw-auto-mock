import { match } from 'ts-pattern';
import type { TApiRecorderData, THTTPStream } from './api-recorder.types';

type AdapterContract = {
  requestGroups(apiRecorderJson: TApiRecorderData[]): TRequestGroup[];
};

class OverrideHandlerAdapter implements AdapterContract {
  requestGroups(apiRecorderJson: TApiRecorderData[]): TRequestGroup[] {
    const groups = new Map<string, TApiRecorderData[]>();

    for (const data of apiRecorderJson) {
      if (data.type !== 'http-rest' && data.type !== 'http-stream') {
        continue;
      }
      const key = `${data.request.method}:${data.request.url}`;
      const group = groups.get(key) || [];
      const finalData = match(data)
        .with({ type: 'http-stream' }, streamData => ({
          ...streamData,
          parsedStreamEvents: this.#parseStreamData(streamData),
        }))
        .with({ type: 'http-rest' }, restData => restData)
        .otherwise(() => null);
      if (finalData) {
        group.push(finalData);
        groups.set(key, group);
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
