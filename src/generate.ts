import { compact, groupBy, isString, mapValues } from 'es-toolkit';
import path from 'path';
import { ControllerType } from './generator/controller-type';
import { Handler } from './generator/handler';
import { MSWServer } from './generator/msw-server';
import { Operation } from './generator/operation';
import { Swagger } from './swagger';
import { combineControllersTypeTemplate, controllersTypeTemplate } from './template';
import { TOptions } from './types';
import { writeFile } from './utils';

export async function generate(options: TOptions) {
  const apiDoc = await new Swagger(options.input).document;
  const operationCollection = new Operation(apiDoc, options).collection();
  const groupByEntity = groupBy(operationCollection, it => it.path.split('/')[1]);

  const outputFolder = options.outputDir || 'src/app/mocks';
  const targetFolder = path.resolve(process.cwd(), outputFolder);

  await new Handler(options, groupByEntity, apiDoc).generate(targetFolder);
  await new MSWServer(options.environment).generate(targetFolder);
  await new ControllerType().generate(targetFolder);

  const controllersTypeList = mapValues(groupByEntity, (operationCollection, entity) => {
    if (!isString(entity)) return null;

    return {
      entity,
      content: controllersTypeTemplate(entity, operationCollection),
    };
  });
  await generateControllersType(compact(Object.values(controllersTypeList)), targetFolder);

  return {
    operationCollection,
    outputFolder: targetFolder,
  };
}

async function generateControllersType(
  controllersTypeList: { entity: string; content: string }[],
  targetFolder: string,
) {
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
    combineControllersTypeTemplate(controllersTypeList.map(({ entity }) => entity)),
  );
}
