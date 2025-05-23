import { pascalCase } from 'es-toolkit';
import { TOperation } from '../types';
import { ControllerTypeAdapter } from './adapter';

interface IControllerTypeTemplate {
  dtoImports(operations: TOperation[]): string;
  entityType(operations: TOperation[]): string;
  combined(entityList: string[]): string;
}

class ControllerTypeTemplate implements IControllerTypeTemplate {
  private readonly DTO_IMPORT_PATH = '@/shared/api/dto';

  dtoImports(operations: TOperation[]): string {
    const dtoList = this.#dtoTypes(operations);
    return `import type { ${Array.from(dtoList).join(', ')} } from '${this.DTO_IMPORT_PATH}';`;
  }

  entityType(operations: TOperation[]): string {
    return this.#handlerMethodTypes(operations)
      .map(handler => {
        return `
          ${handler.identifierName}: (info: Parameters<HttpResponseResolver<${handler.pathParams}, ${handler.requestBodyType}>>[0])=> ${handler.responseBodyType} | Promise<${handler.responseBodyType}>;
        `;
      })
      .join('\n');
  }

  combined(entityList: string[]): string {
    return `
      ${this.#formatEntityImports(entityList)}
    
      export type TControllers = ${this.#formatEntityTypeUnion(entityList)}
    `;
  }

  #dtoTypes(operations: TOperation[]): Set<string> {
    return operations.reduce((dtoSet, op) => {
      const adapter = new ControllerTypeAdapter(op);

      adapter.requestDtoTypeName && dtoSet.add(adapter.requestDtoTypeName);

      for (const { responses } of op.response) {
        const responseDtoTypeName = adapter.responseDtoTypeName(responses);
        responseDtoTypeName && dtoSet.add(responseDtoTypeName);
      }

      return dtoSet;
    }, new Set<string>());
  }

  #handlerMethodTypes(operations: TOperation[]) {
    const types: Array<{
      identifierName: string;
      pathParams: string;
      requestBodyType: string;
      responseBodyType: string;
    }> = [];

    for (const op of operations) {
      const adapter = new ControllerTypeAdapter(op);

      for (const response of op.response) {
        types.push({
          identifierName: adapter.handlerIdentifierName(response),
          pathParams: adapter.pathParamsType,
          requestBodyType: adapter.requestDtoTypeName ?? 'null',
          responseBodyType: adapter.responseBodyType(response.responses),
        });
      }
    }

    return types;
  }

  #formatEntityImports(entityList: string[]): string {
    return entityList
      .map(entity => {
        return `import type { ${pascalCase(`T_${entity}_Controllers`)} } from './${entity}.type';`;
      })
      .join('\n');
  }

  #formatEntityTypeUnion(entityList: string[]): string {
    return entityList
      .map(entity => {
        return `Partial<${pascalCase(`T_${entity}_Controllers`)}>`;
      })
      .join(' | ');
  }
}

export { ControllerTypeTemplate };
