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
    return match(responses)
      .with(
        { 'application/json': { title: P.string, properties: P.nonNullable } },
        r => `${r['application/json'].title}Dto`,
      )
      .with(
        { 'application/json': { title: P.string, items: { title: P.string } } },
        r => `${r['application/json'].items.title}Dto[]`,
      )
      .with({ 'text/event-stream': { type: P.string } }, r => r['text/event-stream'].type)
      .otherwise(() => 'null');
  }

  handlerIdentifierName(response: TResponse): string {
    return (
      camelCase(`get_${response.id}_${response.code}_response`) ||
      camelCase(`${this.operation.operationId}_${this.operation.verb}_${response.code}_Response`)
    );
  }
}

export { ControllerTypeAdapter };
