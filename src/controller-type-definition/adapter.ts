import { camelCase } from 'es-toolkit';
import { P, isMatching, match } from 'ts-pattern';
import type { TOperation, TResponse } from '../types';

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
        P.array({
          in: P.string,
          schema: {
            type: P.union('integer', 'string', 'boolean', 'object', 'number'),
          },
        }),
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
        { content: { 'application/json': { schema: { $ref: P.string } } } },
        r => `${r.content['application/json'].schema.$ref.split('/').at(-1)}Dto`,
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
          { 'application/json': { title: P.string, type: 'array', items: { title: P.string } } },
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
        { 'application/json': { title: P.string, type: 'array', items: { title: P.string } } },
        r => `${r['application/json'].items.title}Dto[]`,
      )
      .with({ 'application/json': { type: 'object', properties: P.nonNullable } }, r =>
        this.#generateInlineType(r['application/json']),
      )
      .with(
        { 'application/json': { type: 'array', items: { type: 'object', properties: P.nonNullable } } },
        r => `${this.#generateInlineType(r['application/json'].items)}[]`,
      )
      .with({ 'text/event-stream': P.any }, () => 'TStreamingEvent[]')
      .otherwise(() => 'null');
  }

  #generateInlineType(schema: unknown): string {
    if (isMatching({ title: P.string }, schema)) {
      return `${schema.title}Dto`;
    }

    if (isMatching({ properties: P.nonNullable }, schema)) return 'object';

    return isMatching({ properties: P.nonNullable }, schema)
      ? `{ ${Object.entries(schema.properties)
          .map(([key, value]: [string, unknown]) => {
            const type = this.#getPropertyType(value);
            return `${key}: ${type}`;
          })
          .join('; ')} }`
      : 'object';
  }

  #getPropertyType(property: unknown): string {
    if (isMatching({ title: P.string }, property)) {
      return `${property.title}Dto`;
    }

    if (isMatching({ type: 'array', items: P.any }, property)) {
      if (isMatching({ title: P.string }, property.items)) {
        return `${property.items.title}Dto[]`;
      }
      if (isMatching({ type: P.string }, property.items)) {
        return `${this.#getPropertyType(property.items)}[]`;
      }
      return 'any[]';
    }

    if (isMatching({ type: 'object', properties: P.nonNullable }, property)) {
      return this.#generateInlineType(property);
    }

    switch (
      match(property)
        .with({ type: P.union('string', 'number', 'integer', 'boolean', 'object') }, p => p.type)
        .otherwise(() => 'any')
    ) {
      case 'string':
        return 'string';
      case 'number':
      case 'integer':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'object':
        return 'object';
      default:
        return 'any';
    }
  }

  handlerIdentifierName(response: TResponse): string {
    return camelCase(`get_${response.id}_${response.code}_response`);
  }
}

export { ControllerTypeAdapter };
