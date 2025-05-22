import path from 'path';
import { OpenAPIV3 } from 'openapi-types';
import { compact, groupBy, isString, mapValues } from 'es-toolkit';
import { OperationGenerator } from './generator/operation';
import { getV3Doc } from './swagger';
import {
  browserIntegration,
  combineControllersTypeTemplate,
  combineHandlers,
  controllersTypeTemplate,
  mockTemplate,
  nodeIntegration,
  reactNativeIntegration,
} from './template';
import { TOptions } from './types';
import { writeFile } from './utils';

export async function generate(options: TOptions) {
  const outputFolder = options.outputDir || 'src/app/mocks';
  const targetFolder = path.resolve(process.cwd(), outputFolder);

  const apiDoc = await getV3Doc(options.input);

  const operationCollection = new OperationGenerator(apiDoc, options).generate();

  await writeFile(path.resolve(process.cwd(), targetFolder, 'temp.js'), JSON.stringify(operationCollection, null, 2));

  const groupByEntity = groupBy(operationCollection, it => it.path.split('/')[1]);
  const baseURL = typeof options.baseUrl === 'string' ? options.baseUrl : getServerUrl(apiDoc);
  const codeList = mapValues(groupByEntity, (operationCollection, entity) => {
    return isString(entity) ? mockTemplate(operationCollection, baseURL, options, entity) : null;
  });

  await generateHandlers(codeList, targetFolder);
  generateEnvironmentFiles(options, targetFolder);
  generateCombinedHandler(Object.keys(groupByEntity), targetFolder);

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

async function generateCombinedHandler(entityList: string[], targetFolder: string) {
  const combinedHandlers = combineHandlers(entityList);
  await writeFile(path.resolve(process.cwd(), path.join(targetFolder, 'handlers'), `index.ts`), combinedHandlers);
}

function generateEnvironmentFiles(options: TOptions, targetFolder: string) {
  const generateNodeEnv = () => writeFile(path.resolve(process.cwd(), targetFolder, `node.ts`), nodeIntegration);
  const generateBrowserEnv = () =>
    writeFile(path.resolve(process.cwd(), targetFolder, `browser.ts`), browserIntegration);
  const generateReactNativeEnv = () =>
    writeFile(path.resolve(process.cwd(), targetFolder, `native.ts`), reactNativeIntegration);

  const config = {
    next: [generateNodeEnv, generateBrowserEnv],
    react: [generateBrowserEnv],
    'react-native': [generateReactNativeEnv],
    default: [generateNodeEnv, generateBrowserEnv, generateReactNativeEnv],
  };

  const generate = config[options.environment ?? 'default'];
  generate.forEach(fn => fn());
}

async function generateHandlers(codeList: Record<string, string | null>, targetFolder: string) {
  await Promise.all(
    Object.entries(codeList).map(async ([entity, code]) => {
      if (!code) return;

      await writeFile(path.resolve(process.cwd(), path.join(targetFolder, 'handlers'), `${entity}_handlers.ts`), code);
    }),
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
