import { compact, groupBy, isString, mapValues } from 'es-toolkit';
import { OpenAPIV3 } from 'openapi-types';
import path from 'path';
import { Handler } from './generator/handler';
import { MSWServer } from './generator/msw-server';
import { Operation } from './generator/operation';
import { getV3Doc } from './swagger';
import { combineControllersTypeTemplate, controllersTypeTemplate, mockTemplate } from './template';
import { TOptions } from './types';
import { writeFile } from './utils';

export async function generate(options: TOptions) {
  const apiDoc = await getV3Doc(options.input);
  const operationCollection = new Operation(apiDoc, options).collection();
  const groupByEntity = groupBy(operationCollection, it => it.path.split('/')[1]);

  const outputFolder = options.outputDir || 'src/app/mocks';
  const targetFolder = path.resolve(process.cwd(), outputFolder);
  const baseURL = typeof options.baseUrl === 'string' ? options.baseUrl : getServerUrl(apiDoc);

  const codeList = mapValues(groupByEntity, (operationCollection, entity) => {
    return isString(entity) ? mockTemplate(operationCollection, baseURL, options, entity) : null;
  });

  // await writeFile(path.resolve(process.cwd(), targetFolder, 'temp.js'), JSON.stringify(operationCollection, null, 2));

  await new Handler(codeList, groupByEntity).generate(targetFolder);
  await new MSWServer(options.environment).generate(targetFolder);

  const controllersTypeList = mapValues(groupByEntity, (operationCollection, entity) => {
    if (!isString(entity)) return null;

    return {
      entity,
      content: controllersTypeTemplate(entity, operationCollection),
    };
  });
  await generateControllersType(compact(Object.values(controllersTypeList)), targetFolder);

  return {
    codeList,
    operationCollection,
    baseURL,
    targetFolder,
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

function getServerUrl(apiDoc: OpenAPIV3.Document) {
  let server = apiDoc.servers?.at(0);
  let url = '';
  if (server) {
    url = server.url;
  }
  if (server?.variables) {
    Object.entries(server.variables).forEach(([key, value]) => {
      url = url.replace(`{${key}}`, value.default);
    });
  }

  return url;
}
