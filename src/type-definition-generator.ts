import { compact, isString, mapValues, pascalCase } from 'es-toolkit';
import path from 'path';
import { transformToControllersType, transformToDtoImportCode } from './transform';
import { TOperation } from './types';
import { writeFile } from './utils';

interface ITypeGenerator {
  generate(targetFolder: string): Promise<void>;
}

class TypeDefinitionGenerator implements ITypeGenerator {
  private readonly operationsByEntity: Record<string, TOperation[]>;

  constructor(operationsByEntity: Record<string, TOperation[]>) {
    this.operationsByEntity = operationsByEntity;
  }

  async generate(targetFolder: string): Promise<void> {
    const entityTypeDefinitions = compact(Object.values(this.#entityTypeDefinitions()));

    // 각 엔티티의 타입 정의 파일을 생성합니다
    await Promise.all(
      entityTypeDefinitions.map(async ({ entity, content }) => {
        await writeFile(
          path.resolve(process.cwd(), path.join(targetFolder, '__generated__'), `${entity}.type.ts`),
          content,
        );
      }),
    );

    // 모든 엔티티의 타입 정의를 포함하는 모듈 파일을 생성합니다
    await writeFile(
      path.resolve(process.cwd(), path.join(targetFolder, '__generated__'), `index.ts`),
      this.#combinedTypeDefinition(entityTypeDefinitions.map(({ entity }) => entity)),
    );
  }

  #entityTypeDefinitions(): Record<string, TEntityTypeMetadata | null> {
    return mapValues(this.operationsByEntity, (operations, entity) => {
      if (!isString(entity)) return null;

      return {
        entity,
        content: `
          import type { HttpResponseResolver } from "msw";
          ${transformToDtoImportCode(operations)}
          
          export type ${pascalCase(`T_${entity}_Controllers`)} = {
            ${transformToControllersType(operations)}
          }
          `,
      };
    });
  }

  #combinedTypeDefinition(entityList: string[]) {
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

export { TypeDefinitionGenerator };

type TEntityTypeMetadata = {
  entity: string;
  content: string;
};
