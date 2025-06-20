import { camelCase } from 'es-toolkit';
import { match, P } from 'ts-pattern';
import { TOperation, TResponse } from '../types';

type AdapterContract = {
  pathParamsType: string;
  requestDtoTypeName: string | null;
  responseDtoTypeName(responses: TResponse['responses']): string | null;
  responseBodyType(responses: TResponse['responses']): string;
  handlerIdentifierName(response: TResponse): string;
};

class ControllerTypeAdapter implements AdapterContract {
  constructor(private readonly operation: TOperation) {}

  get pathParamsType(): string {
    const pathParamsTypeContents = match(this.operation.parameters)
      .with(
        P.array({ in: P.string, schema: { type: P.union('integer', 'string', 'boolean', 'object', 'number') } }),
        p => p.filter(p => p.in === 'path').map(p => `${camelCase(p.name)}: string`),
      )
      // @TODO 추후 다른 타입도 지원해야 함
      .otherwise(() => [])
      .filter(Boolean)
      .join(',\n');

    return pathParamsTypeContents ? `{${pathParamsTypeContents}}` : 'Record<string, never>';
  }

  get requestDtoTypeName(): string | null {
    return match(this.operation.request)
      .with(
        { content: { ['application/json']: { schema: { $ref: P.string } } } },
        r => `${r.content['application/json'].schema['$ref'].split('/').at(-1)}Dto`,
      )
      .otherwise(() => null);
  }

  responseDtoTypeName(responses: TResponse['responses']): string | null {
    return (
      match(responses)
        .with(
          { 'application/json': { title: P.string, properties: P.nonNullable } },
          r => `${r['application/json'].title}Dto`,
        )
        .with(
          { 'application/json': { title: P.string, items: { title: P.string } } },
          r => `${r['application/json'].items.title}Dto`,
        )
        // @TODO 추후 다른 타입도 지원해야 함
        .otherwise(() => null)
    );
  }

  responseBodyType(responses: TResponse['responses']): string {
    /**
     * 스트리밍 응답 처리 방식
     * - 현재: 외부에서 new ReadableStream을 내려주므로 ReadableStream | Promise<ReadableStream> 반환
     * - 향후: application/json, text/event-stream 외 타입 추가 시 string | Promise<string> 반환 검토 필요 (내부에서 ReadableStream을 처리하도록)
     */
    return match(responses)
      .with(
        { 'application/json': { title: P.string, properties: P.nonNullable } },
        r => `${r['application/json'].title}Dto`,
      )
      .with(
        { 'application/json': { title: P.string, items: { title: P.string } } },
        r => `${r['application/json'].items.title}Dto[]`,
      )
      .with({ 'text/event-stream': P.any }, () => 'ReadableStream')
      .otherwise(() => 'null');
  }

  handlerIdentifierName(response: TResponse): string {
    return camelCase(`get_${response.id}_${response.code}_response`);
  }
}

export { ControllerTypeAdapter };
