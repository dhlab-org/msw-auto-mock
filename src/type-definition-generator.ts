import { camelCase, compact, isString, mapValues, pascalCase } from 'es-toolkit';
import path from 'path';
import { match, P } from 'ts-pattern';
import { getResIdentifierName } from './transform';
import { TOperation } from './types';
import { writeFile } from './utils';

interface ITypeGenerator {
  generate(targetFolder: string): Promise<void>;
}

class TypeDefinitionGenerator implements ITypeGenerator {
  private readonly operationsByEntity: Record<TEntity, TOperation[]>;

  constructor(operationsByEntity: Record<TEntity, TOperation[]>) {
    this.operationsByEntity = operationsByEntity;
  }

  async generate(targetFolder: string): Promise<void> {
    const entityList: TEntity[] = Object.keys(this.operationsByEntity);
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
      this.#combinedTypeDefinition(entityList),
    );
  }

  #entityTypeDefinitions(): Record<TEntity, TEntityContent | null> {
    return mapValues(this.operationsByEntity, (operations, entity) => {
      if (!isString(entity)) return null;

      return {
        entity,
        content: `
          import type { HttpResponseResolver } from "msw";
          ${this.#dtoImportsTemplate(operations)}
          
          export type ${pascalCase(`T_${entity}_Controllers`)} = {
            ${this.#typeDefinitionTemplate(operations)}
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

  #dtoImportsTemplate(operations: TOperation[]) {
    const dtoList = operations.reduce((dtoSet, op) => {
      const requestDtoTypeName = match(op.request)
        .with(
          { content: { ['application/json']: { schema: { $ref: P.string } } } },
          r => `${r.content['application/json'].schema['$ref'].split('/').at(-1)}Dto`,
        )
        .otherwise(() => null);

      requestDtoTypeName && dtoSet.add(requestDtoTypeName);

      for (const response of op.response) {
        const responseBodyTypeName = match(response.responses)
          .with(
            { 'application/json': { title: P.string, properties: P.nonNullable } },
            r => `${r['application/json'].title}Dto`,
          )
          .with(
            { 'application/json': { title: P.string, items: { title: P.string } } },
            r => `${r['application/json'].items.title}Dto`,
          )
          .otherwise(() => null);

        responseBodyTypeName && dtoSet.add(responseBodyTypeName);
      }

      return dtoSet;
    }, new Set<string>());

    return `import type { ${Array.from(dtoList).join(', ')} } from '@/shared/api/dto';`;
  }

  #typeDefinitionTemplate(operations: TOperation[]) {
    const controllers: Array<{
      identifierName: string;
      pathParams: string;
      requestBodyType: string;
      responseBodyType: string;
    }> = [];

    for (const op of operations) {
      const requestDtoTypeName = match(op.request)
        .with(
          { content: { ['application/json']: { schema: { $ref: P.string } } } },
          r => `${r.content['application/json'].schema['$ref'].split('/').at(-1)}Dto`,
        )
        // TODO: 추후에 다른 타입도 지원해야 함
        .otherwise(() => 'null');

      const pathParamsTypeContents = compact(
        match(op.parameters)
          .with(
            P.array({ in: P.string, schema: { type: P.union('integer', 'string', 'boolean', 'object', 'number') } }),
            p => p.filter(p => p.in === 'path').map(p => `${camelCase(p.name)}: string`),
          )
          // @TODO 다른 타입도 지원해야 함
          .otherwise(() => []),
      ).join(',\n');

      const pathParamsInlineType = pathParamsTypeContents ? `{${pathParamsTypeContents}}` : 'Record<string, never>';

      for (const response of op.response) {
        const responseBodyTypeName = match(response.responses)
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

        const identifierName =
          getResIdentifierName(response) || camelCase(`${op.operationId}${op.verb}${response.code}Response`);

        controllers.push({
          identifierName,
          pathParams: pathParamsInlineType,
          requestBodyType: requestDtoTypeName,
          responseBodyType: responseBodyTypeName,
        });
      }
    }

    return controllers
      .map(controller => {
        return `
      ${controller.identifierName}: (info: Parameters<HttpResponseResolver<${controller.pathParams}, ${controller.requestBodyType}>>[0])=> ${controller.responseBodyType} | Promise<${controller.responseBodyType}>;
      `;
      })
      .join('\n');
  }
}

export { TypeDefinitionGenerator };

type TEntity = string;

type TEntityContent = {
  entity: TEntity;
  content: string;
};
