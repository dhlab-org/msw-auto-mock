import { pascalCase } from 'es-toolkit';
import { TOperation } from '../types';
import { ControllerTypeAdapter } from './adapter';

type TemplateContract = {
  ofEntity(operations: TOperation[], entity: string): string;
  ofAllCombined(entityList: string[]): string;
};

class ControllerTypeTemplate implements TemplateContract {
  private readonly DTO_IMPORT_PATH = '@/shared/api/dto';

  ofEntity(operations: TOperation[], entity: string): string {
    const imports = `import type { ${Array.from(this.#dtoTypes(operations)).join(', ')} } from '${this.DTO_IMPORT_PATH}';`;
    const entityType = this.#handlerMethodTypes(operations)
      .map(handler => {
        return `
        ${handler.identifierName}: (info: Parameters<HttpResponseResolver<${handler.pathParams}, ${handler.requestBodyType}>>[0])=> ${handler.responseBodyType} | Promise<${handler.responseBodyType}>;
      `;
      })
      .join('\n');

    return `
      import type { HttpResponseResolver } from "msw";
      ${imports}
      
      export type ${pascalCase(`T_${entity}_Controllers`)} = {
        ${entityType}
      }
    `;
  }

  ofAllCombined(entityList: string[]): string {
    const imports = entityList
      .map(entity => {
        return `import type { ${pascalCase(`T_${entity}_Controllers`)} } from './${entity}.type';`;
      })
      .join('\n');

    const entityTypeUnion = entityList
      .map(entity => {
        return `Partial<${pascalCase(`T_${entity}_Controllers`)}>`;
      })
      .join(' | ');

    return `
      ${imports}
    
      export type TControllers = ${entityTypeUnion}
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
}

export { ControllerTypeTemplate, type TemplateContract as ControllerTypeTemplateContract };
