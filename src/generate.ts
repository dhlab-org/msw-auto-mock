import path from 'path';

import ApiGenerator, { isReference } from 'oazapfts/generate';
import { OpenAPIV3 } from 'openapi-types';
import { camelCase } from 'es-toolkit/string';

import { getV3Doc } from './swagger';
import { toExpressLikePath, writeFile } from './utils';
import { Operation } from './transform';
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
import { compact, groupBy, isString, mapValues } from 'es-toolkit';

export function generateOperationCollection(apiDoc: OpenAPIV3.Document, options: TOptions) {
  const apiGen = new ApiGenerator(apiDoc, {});
  const operationDefinitions = getOperationDefinitions(apiDoc);

  return operationDefinitions
    .filter(op => operationFilter(op, options))
    .map(op => codeFilter(op, options))
    .map(definition => toOperation(definition, apiGen));
}

export async function generate(spec: string, options: TOptions) {
  const outputFolder = options.outputDir || './mocks';
  const targetFolder = path.resolve(process.cwd(), outputFolder);

  const apiDoc = await getV3Doc(spec);
  const operationCollection = generateOperationCollection(apiDoc, options);

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

const operationKeys = Object.values(OpenAPIV3.HttpMethods) as OpenAPIV3.HttpMethods[];

type OperationDefinition = {
  path: string;
  verb: string;
  responses: OpenAPIV3.ResponsesObject;
  id: string;
  requests: OpenAPIV3.OperationObject['requestBody'];
  parameters: OpenAPIV3.OperationObject['parameters'];
  operationId: OpenAPIV3.OperationObject['operationId'];
};

function getOperationDefinitions(v3Doc: OpenAPIV3.Document): OperationDefinition[] {
  return Object.entries(v3Doc.paths).flatMap(([path, pathItem]) =>
    !pathItem
      ? []
      : Object.entries(pathItem)
          .filter((arg): arg is [string, OpenAPIV3.OperationObject] => operationKeys.includes(arg[0] as any))
          .map(([verb, operation]) => {
            const id = camelCase(operation.operationId ?? verb + '/' + path);
            return {
              path,
              verb,
              id,
              responses: operation.responses,
              requests: operation.requestBody,
              parameters: operation.parameters,
              operationId: operation.operationId,
            };
          }),
  );
}

function operationFilter(operation: OperationDefinition, options: TOptions): boolean {
  const includes = options?.includes?.split(',') ?? null;
  const excludes = options?.excludes?.split(',') ?? null;

  if (includes && !includes.includes(operation.path)) {
    return false;
  }
  if (excludes?.includes(operation.path)) {
    return false;
  }
  return true;
}

function codeFilter(operation: OperationDefinition, options: TOptions): OperationDefinition {
  const rawCodes = options?.codes;

  const codes = rawCodes ? (rawCodes.indexOf(',') !== -1 ? rawCodes?.split(',') : [rawCodes]) : null;

  const responses = Object.entries(operation.responses)
    .filter(([code]) => {
      if (codes && !codes.includes(code)) {
        return false;
      }
      return true;
    })
    .map(([code, response]) => ({
      [code]: response,
    }))
    .reduce((acc, curr) => Object.assign(acc, curr), {} as OpenAPIV3.ResponsesObject);

  return {
    ...operation,
    responses,
  };
}

function toOperation(definition: OperationDefinition, apiGen: ApiGenerator): Operation {
  const { verb, path, responses, id, requests, parameters, operationId } = definition;

  const responseMap = Object.entries(responses).map(([code, response]) => {
    const content = apiGen.resolve(response).content;
    if (!content) {
      return { code, id: '', responses: {} };
    }

    const resolvedResponse = Object.keys(content).reduce(
      (resolved, type) => {
        const schema = content[type].schema;
        if (typeof schema !== 'undefined') {
          resolved[type] = recursiveResolveSchema(schema, apiGen);
        }

        return resolved;
      },
      {} as Record<string, OpenAPIV3.SchemaObject>,
    );

    return {
      code,
      id,
      responses: resolvedResponse,
    };
  });

  return {
    verb,
    path: toExpressLikePath(path),
    response: responseMap,
    request: requests,
    parameters: parameters,
    operationId: operationId,
  };
}

const resolvingRefs: string[] = [];

function autoPopRefs<T>(cb: () => T) {
  const n = resolvingRefs.length;
  const res = cb();
  resolvingRefs.length = n;
  return res;
}

function resolve(schema: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject, apiGen: ApiGenerator) {
  if (isReference(schema)) {
    if (resolvingRefs.includes(schema.$ref)) {
      console.warn(`circular reference for path ${[...resolvingRefs, schema.$ref].join(' -> ')} found`);
      return {};
    }
    resolvingRefs.push(schema.$ref);
  }
  return { ...apiGen.resolve(schema) };
}

function recursiveResolveSchema(schema: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject, apiGen: ApiGenerator) {
  return autoPopRefs(() => {
    const resolvedSchema = resolve(schema, apiGen) as OpenAPIV3.SchemaObject;

    if (resolvedSchema.type === 'array') {
      resolvedSchema.items = resolve(resolvedSchema.items, apiGen);
      resolvedSchema.items = recursiveResolveSchema(resolvedSchema.items, apiGen);
    } else if (resolvedSchema.type === 'object') {
      if (!resolvedSchema.properties && typeof resolvedSchema.additionalProperties === 'object') {
        if (isReference(resolvedSchema.additionalProperties)) {
          resolvedSchema.additionalProperties = recursiveResolveSchema(
            resolve(resolvedSchema.additionalProperties, apiGen),
            apiGen,
          );
        }
      }

      if (resolvedSchema.properties) {
        resolvedSchema.properties = Object.entries(resolvedSchema.properties).reduce(
          (resolved, [key, value]) => {
            resolved[key] = recursiveResolveSchema(value, apiGen);
            return resolved;
          },
          {} as Record<string, OpenAPIV3.SchemaObject>,
        );
      }
    }

    if (resolvedSchema.allOf) {
      resolvedSchema.allOf = resolvedSchema.allOf.map(item => recursiveResolveSchema(item, apiGen));
    } else if (resolvedSchema.oneOf) {
      resolvedSchema.oneOf = resolvedSchema.oneOf.map(item => recursiveResolveSchema(item, apiGen));
    } else if (resolvedSchema.anyOf) {
      resolvedSchema.anyOf = resolvedSchema.anyOf.map(item => recursiveResolveSchema(item, apiGen));
    }

    return resolvedSchema;
  });
}
