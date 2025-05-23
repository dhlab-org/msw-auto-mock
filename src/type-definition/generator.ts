import { compact, isString, mapValues, pascalCase } from 'es-toolkit';
import path from 'path';
import { Operation } from '../operation';
import { writeFile } from '../utils';
import { ControllerTypeTemplate } from './template';

interface ITypeGenerator {
  generate(targetFolder: string): Promise<void>;
}

class TypeDefinitionGenerator implements ITypeGenerator {
  private readonly operation: Operation;
  private readonly controllerTypeTemplate: ControllerTypeTemplate;

  constructor(operation: Operation) {
    this.operation = operation;
    this.controllerTypeTemplate = new ControllerTypeTemplate();
  }

  async generate(targetFolder: string): Promise<void> {
    const entityTypeList: TEntityContent[] = compact(Object.values(this.#entityTypeDefinitions()));

    // 각 엔티티의 타입 정의 파일을 생성합니다
    await Promise.all(
      entityTypeList.map(async ({ entity, content }) => {
        await writeFile(
          path.resolve(process.cwd(), path.join(targetFolder, '__generated__'), `${entity}.type.ts`),
          content,
        );
      }),
    );

    // 모든 엔티티의 타입 정의를 포함하는 모듈 파일을 생성합니다
    await writeFile(
      path.resolve(process.cwd(), path.join(targetFolder, '__generated__'), `index.ts`),
      this.controllerTypeTemplate.combined(this.operation.entities),
    );
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
            ${this.controllerTypeTemplate.entityTypes(operations)}
          }
          `,
      };
    });
  }
}

export { TypeDefinitionGenerator };

type TEntityContent = {
  entity: string;
  content: string;
};
