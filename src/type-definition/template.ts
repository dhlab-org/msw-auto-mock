import { pascalCase } from 'es-toolkit';
import { TOperation } from '../types';
import { ControllerTypeAdapter } from './adapter';

interface IControllerTypeTemplate {
  dtoImports(operations: TOperation[]): string;
  entityTypes(operations: TOperation[]): string;
  combined(entityList: string[]): string;
}

class ControllerTypeTemplate implements IControllerTypeTemplate {
  dtoImports(operations: TOperation[]): string {
    const dtoList = operations.reduce((dtoSet, op) => {
      const adapter = new ControllerTypeAdapter(op);

      adapter.requestDtoTypeName && dtoSet.add(adapter.requestDtoTypeName);

      for (const { responses } of op.response) {
        const responseDtoTypeName = adapter.responseDtoTypeName(responses);
        responseDtoTypeName && dtoSet.add(responseDtoTypeName);
      }

      return dtoSet;
    }, new Set<string>());

    return `import type { ${Array.from(dtoList).join(', ')} } from '@/shared/api/dto';`;
  }

  entityTypes(operations: TOperation[]): string {
    const handlerMethodTypes: Array<{
      identifierName: string;
      pathParams: string;
      requestBodyType: string;
      responseBodyType: string;
    }> = [];

    for (const op of operations) {
      const adapter = new ControllerTypeAdapter(op);

      for (const response of op.response) {
        handlerMethodTypes.push({
          identifierName: adapter.handlerIdentifierName(response),
          pathParams: adapter.pathParamsType,
          requestBodyType: adapter.requestDtoTypeName ?? 'null',
          responseBodyType: adapter.responseBodyType(response.responses),
        });
      }
    }

    return handlerMethodTypes
      .map(handler => {
        return `
            ${handler.identifierName}: (info: Parameters<HttpResponseResolver<${handler.pathParams}, ${handler.requestBodyType}>>[0])=> ${handler.responseBodyType} | Promise<${handler.responseBodyType}>;
          `;
      })
      .join('\n');
  }

  combined(entityList: string[]): string {
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
}

export { ControllerTypeTemplate };
