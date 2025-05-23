import { camelCase, pascalCase } from 'es-toolkit';
import { match, P } from 'ts-pattern';
import { getResIdentifierName } from '../transform';
import { TOperation } from '../types';

interface IControllerTypeTemplate {
  dtoImports(operations: TOperation[]): string;
  typeDefinition(operations: TOperation[]): string;
  combinedTypeDefinition(entityList: string[]): string;
}

class ControllerTypeTemplate implements IControllerTypeTemplate {
  constructor() {}

  dtoImports(operations: TOperation[]): string {
    const dtoList = operations.reduce((dtoSet, op) => {
      const requestDtoTypeName = this.#requestDtoTypeName(op);
      requestDtoTypeName && dtoSet.add(requestDtoTypeName);

      for (const response of op.response) {
        const responseBodyTypeName = this.#responseDtoTypeName(response);
        responseBodyTypeName && dtoSet.add(responseBodyTypeName);
      }

      return dtoSet;
    }, new Set<string>());

    return `import type { ${Array.from(dtoList).join(', ')} } from '@/shared/api/dto';`;
  }

  typeDefinition(operations: TOperation[]): string {
    const controllers = this.#controllerTypes(operations);

    return controllers
      .map(controller => {
        return `
          ${controller.identifierName}: (info: Parameters<HttpResponseResolver<${controller.pathParams}, ${controller.requestBodyType}>>[0])=> ${controller.responseBodyType} | Promise<${controller.responseBodyType}>;
        `;
      })
      .join('\n');
  }

  combinedTypeDefinition(entityList: string[]): string {
    return `
      ${this.#entityTypeImports(entityList)}
    
      export type TControllers = ${this.#entityTypeUnion(entityList)}
    `;
  }

  #entityTypeImports(entityList: string[]): string {
    return entityList
      .map(entity => {
        return `import type { ${pascalCase(`T_${entity}_Controllers`)} } from './${entity}.type';`;
      })
      .join('\n');
  }

  #entityTypeUnion(entityList: string[]): string {
    return entityList
      .map(entity => {
        return `Partial<${pascalCase(`T_${entity}_Controllers`)}>`;
      })
      .join(' | ');
  }

  #requestDtoTypeName(operation: TOperation): string | null {
    return match(operation.request)
      .with(
        { content: { ['application/json']: { schema: { $ref: P.string } } } },
        r => `${r.content['application/json'].schema['$ref'].split('/').at(-1)}Dto`,
      )
      .otherwise(() => null);
  }

  #responseDtoTypeName(response: TOperation['response'][number]): string | null {
    return match(response.responses)
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

  #controllerTypes(operations: TOperation[]) {
    const controllers: Array<{
      identifierName: string;
      pathParams: string;
      requestBodyType: string;
      responseBodyType: string;
    }> = [];

    for (const op of operations) {
      const requestDtoTypeName = this.#requestDtoTypeName(op) ?? 'null';
      const pathParamsType = this.#pathParamsType(op);

      for (const response of op.response) {
        const responseBodyTypeName = this.#responseBodyType(response);
        const identifierName = this.#handlerIdentifierName(op, response);

        controllers.push({
          identifierName,
          pathParams: pathParamsType,
          requestBodyType: requestDtoTypeName,
          responseBodyType: responseBodyTypeName,
        });
      }
    }

    return controllers;
  }

  #pathParamsType(operation: TOperation): string {
    const pathParamsTypeContents = match(operation.parameters)
      .with(
        P.array({ in: P.string, schema: { type: P.union('integer', 'string', 'boolean', 'object', 'number') } }),
        p => p.filter(p => p.in === 'path').map(p => `${camelCase(p.name)}: string`),
      )
      .otherwise(() => [])
      .filter(Boolean)
      .join(',\n');

    return pathParamsTypeContents ? `{${pathParamsTypeContents}}` : 'Record<string, never>';
  }

  #responseBodyType(response: TOperation['response'][number]): string {
    return match(response.responses)
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

  #handlerIdentifierName(operation: TOperation, response: TOperation['response'][number]): string {
    return (
      getResIdentifierName(response) || camelCase(`${operation.operationId}${operation.verb}${response.code}Response`)
    );
  }
}

export { ControllerTypeTemplate };
