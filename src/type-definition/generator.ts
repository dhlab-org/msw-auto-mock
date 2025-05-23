import { compact, isString, mapValues, pascalCase } from 'es-toolkit';
import path from 'path';
import { Operation } from '../operation';
import { writeFile } from '../utils';
import { ControllerTypeTemplate } from './template';

interface ITypeGenerator {
  generate(targetFolder: string): Promise<void>;
}

type TEntityContent = {
  entity: string;
  content: string;
};
class TypeDefinitionGenerator implements ITypeGenerator {
  private readonly operation: Operation;
  private readonly controllerTypeTemplate: ControllerTypeTemplate;
  private readonly OUTPUT_DIR = '__generated__';

  constructor(operation: Operation) {
    this.operation = operation;
    this.controllerTypeTemplate = new ControllerTypeTemplate();
  }

  async generate(targetFolder: string): Promise<void> {
    const entityTypeList: TEntityContent[] = compact(Object.values(this.#entityTypeDefinitions()));
    const outputDir = path.resolve(process.cwd(), path.join(targetFolder, this.OUTPUT_DIR));

    await this.#generateEntityTypeFiles(entityTypeList, outputDir);
    await this.#generateCombinedTypeFile(outputDir);
  }

  #entityTypeDefinitions(): Record<string, TEntityContent | null> {
    return mapValues(this.operation.byEntity, (operations, entity) => {
      if (!isString(entity)) return null;

      return {
        entity,
        content: `
          import type { HttpResponseResolver } from "msw";
          ${this.controllerTypeTemplate.dtoImports(operations)}
          
          export type ${pascalCase(`T_${entity}_Controllers`)} = {
            ${this.controllerTypeTemplate.entityType(operations)}
          }
          `,
      };
    });
  }

  async #generateEntityTypeFiles(entityTypeList: TEntityContent[], outputDir: string): Promise<void> {
    await Promise.all(
      entityTypeList.map(async ({ entity, content }) => {
        await writeFile(path.join(outputDir, `${entity}.type.ts`), content);
      }),
    );
  }

  async #generateCombinedTypeFile(outputDir: string): Promise<void> {
    await writeFile(path.join(outputDir, 'index.ts'), this.controllerTypeTemplate.combined(this.operation.entities));
  }
}

export { TypeDefinitionGenerator };
