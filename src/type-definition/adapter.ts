import { match, P } from 'ts-pattern';
import { TOperation, TResponseMap } from '../types';
import { camelCase } from 'es-toolkit';
import { getResIdentifierName } from '../transform';

interface IControllerTypeAdapter {
  pathParamsType: string;
  requestDtoTypeName: string | null;
  responseDtoTypeName(responses: TResponseMap['responses']): string | null;
  responseBodyType(responses: TResponseMap['responses']): string;
  handlerIdentifierName(response: TResponseMap): string;
}

class ControllerTypeAdapter implements IControllerTypeAdapter {
  constructor(private readonly operation: TOperation) {}

  get pathParamsType(): string {
    const pathParamsTypeContents = match(this.operation.parameters)
      .with(
        P.array({ in: P.string, schema: { type: P.union('integer', 'string', 'boolean', 'object', 'number') } }),
        p => p.filter(p => p.in === 'path').map(p => `${camelCase(p.name)}: string`),
      )
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

  responseDtoTypeName(responses: TResponseMap['responses']): string | null {
    return match(responses)
      .with(
        { 'application/json': { title: P.string, properties: P.nonNullable } },
        r => `${r['application/json'].title}Dto`,
      )
      .with(
        { 'application/json': { title: P.string, items: { title: P.string } } },
        r => `${r['application/json'].items.title}Dto`,
      )
      .otherwise(() => null);
  }

  responseBodyType(responses: TResponseMap['responses']): string {
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

  handlerIdentifierName(response: TResponseMap): string {
    return (
      getResIdentifierName(response) ||
      camelCase(`${this.operation.operationId}_${this.operation.verb}_${response.code}_Response`)
    );
  }
}

export { ControllerTypeAdapter };
