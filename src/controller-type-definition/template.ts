import { pascalCase } from 'es-toolkit';
import pkg from '../../package.json';
import type { TOperation } from '../types';
import { ControllerTypeAdapter } from './adapter';

type TemplateContract = {
  ofEntity(operations: TOperation[], entity: string): string;
  ofAllCombined(entityList: string[]): string;
};

class ControllerTypeTemplate implements TemplateContract {
  private readonly DTO_IMPORT_PATH = '@/shared/api/dto';

  ofEntity(operations: TOperation[], entity: string): string {
    const dtoTypes = this.#dtoTypes(operations);
    const hasStreamingResponse = this.#hasStreamingResponse(operations);

    const dtoImports =
      dtoTypes.size > 0 ? `import type { ${Array.from(dtoTypes).join(', ')} } from '${this.DTO_IMPORT_PATH}';` : '';
    const streamingImport = hasStreamingResponse ? `import type { TStreamingEvent } from '${pkg.name}';` : '';

    const imports = [dtoImports, streamingImport].filter(Boolean).join('\n');

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

    const entityTypeIntersection = entityList
      .map(entity => {
        return pascalCase(`T_${entity}_Controllers`);
      })
      .join(' & ');

    return `
      ${imports}
    
      export type TControllers = Partial<
        ${entityTypeIntersection}
      >;
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

  #hasStreamingResponse(operations: TOperation[]): boolean {
    return operations.some(op =>
      op.response.some(response => response.responses && Object.keys(response.responses).includes('text/event-stream')),
    );
  }
}

export { ControllerTypeTemplate, type TemplateContract as ControllerTypeTemplateContract };
