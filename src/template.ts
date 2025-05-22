import { pascalCase } from 'es-toolkit';
import { transformToControllersType, transformToDtoImportCode } from './transform';
import { TOperation } from './types';

export const controllersTypeTemplate = (entity: string, operations: TOperation[]) => {
  const template = `
  import type { HttpResponseResolver } from "msw";
  ${transformToDtoImportCode(operations)}
  
  export type ${pascalCase(`T_${entity}_Controllers`)} = {
    ${transformToControllersType(operations)}
  }
  `;

  return template;
};

export const combineControllersTypeTemplate = (entityList: string[]) => {
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
};
