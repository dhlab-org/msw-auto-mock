import { compact, isString, mapValues, pascalCase } from 'es-toolkit';
import path from 'path';
import { transformToControllersType, transformToDtoImportCode } from './transform';
import { TOperation } from './types';
import { writeFile } from './utils';

interface IControllerType {
  generate(targetFolder: string): Promise<void>;
}

class ControllerType implements IControllerType {
  private readonly groupByEntity: Record<string, TOperation[]>;

  constructor(groupByEntity: Record<string, TOperation[]>) {
    this.groupByEntity = groupByEntity;
  }

  async generate(targetFolder: string): Promise<void> {
    const controllersTypeList = compact(Object.values(this.#controllersTypeList()));

    await Promise.all(
      controllersTypeList.map(async ({ entity, content }) => {
        await writeFile(
          path.resolve(process.cwd(), path.join(targetFolder, '__generated__'), `${entity}.type.ts`),
          content,
        );
      }),
    );
    await writeFile(
      path.resolve(process.cwd(), path.join(targetFolder, '__generated__'), `index.ts`),
      this.#combinedControllersTypeTemplate(controllersTypeList.map(({ entity }) => entity)),
    );
  }

  #controllersTypeList() {
    return mapValues(this.groupByEntity, (operationCollection, entity) => {
      if (!isString(entity)) return null;

      return {
        entity,
        content: this.#controllersTypeTemplate(entity, operationCollection),
      };
    });
  }

  #controllersTypeTemplate(entity: string, operations: TOperation[]) {
    const template = `
    import type { HttpResponseResolver } from "msw";
    ${transformToDtoImportCode(operations)}
    
    export type ${pascalCase(`T_${entity}_Controllers`)} = {
      ${transformToControllersType(operations)}
    }
    `;

    return template;
  }

  #combinedControllersTypeTemplate(entityList: string[]) {
    const template = `
    ${entityList
      .map(entity => {
        return `import type { ${pascalCase(`T_${entity}_Controllers`)} } from './${entity}.type';`;
      })
      .join('\n')}
  
    export type TControllers = ${entityList
      .map(entity => {
        return `Partial<${pascalCase(`T_${entity}_Controllers`)}>`;
      })
      .join(' | ')}
    `;

    return template;
  }
}

export { ControllerType };
