import { camelCase, groupBy } from 'es-toolkit';
import ApiGenerator, { isReference } from 'oazapfts/generate';
import { OpenAPIV3 } from 'openapi-types';
import type { SwaggerContract } from './swagger';
import type { TOperation, TOptions } from './types';
import { toExpressLikePath } from './utils.js';

type ApiEndpointContract = {
  collection: TOperation[];
  byEntity: Record<TEntity, TOperation[]>;
  entities: TEntity[];
};

class ApiEndpoint implements ApiEndpointContract {
  private readonly swagger: SwaggerContract;
  private readonly options: TOptions;
  private readonly apiGenerator: ApiGenerator;

  constructor(swagger: SwaggerContract, options: TOptions) {
    this.swagger = swagger;
    this.options = options;
    this.apiGenerator = new ApiGenerator(swagger.apiDoc, {});
  }

  get collection() {
    const operationDefinitions = this.#getOperationDefinitions();
    return operationDefinitions
      .filter(op => this.#shouldIncludeOperation(op))
      .map(op => this.#codeFilter(op))
      .map(definition => this.#toOperation(definition));
  }

  get byEntity() {
    const operations = this.collection;
    return groupBy(operations, op => op.path.split('/')[this.options.entityPathIndex ?? 1]);
  }

  get entities() {
    return Object.keys(this.byEntity);
  }

  #getOperationDefinitions(): TOperationDefinition[] {
    const operationKeys = Object.values(OpenAPIV3.HttpMethods) as OpenAPIV3.HttpMethods[];
    return Object.entries(this.swagger.apiDoc.paths).flatMap(([path, pathItem]) =>
      !pathItem
        ? []
        : Object.entries(pathItem)
            .filter((arg): arg is [string, OpenAPIV3.OperationObject] => operationKeys.includes(arg[0] as any))
            .map(([verb, operation]) => {
              const id = camelCase(operation.operationId ?? `${verb}/${path}`);
              return {
                path,
                verb,
                id,
                responses: operation.responses,
                requests: operation.requestBody,
                parameters: operation.parameters,
              };
            }),
    );
  }

  #shouldIncludeOperation(operation: TOperationDefinition): boolean {
    const { includes, excludes } = this.options;

    if (!includes && !excludes) {
      return true;
    }

    const allowedPaths = includes?.split(',') ?? [];
    const excludedPaths = excludes?.split(',') ?? [];

    if (allowedPaths.length > 0 && !allowedPaths.includes(operation.path)) {
      return false;
    }

    return !excludedPaths.includes(operation.path);
  }

  #codeFilter(operation: TOperationDefinition): TOperationDefinition {
    const filteredResponses = this.#filteredResponsesByCodes(operation.responses);
    const transformedResponses = this.#responsesToKeyValueObject(filteredResponses);

    return {
      ...operation,
      responses: transformedResponses,
    };
  }

  #filteredResponsesByCodes(responses: OpenAPIV3.ResponsesObject) {
    const rawCodes = this.options?.codes;
    const codes = rawCodes ? (rawCodes.indexOf(',') !== -1 ? rawCodes?.split(',') : [rawCodes]) : null;

    return Object.entries(responses).filter(([code]) => {
      if (codes && !codes.includes(code)) {
        return false;
      }
      return true;
    });
  }

  #responsesToKeyValueObject(filteredResponses: [string, OpenAPIV3.ReferenceObject | OpenAPIV3.ResponseObject][]) {
    return filteredResponses
      .map(([code, response]) => ({
        [code]: response,
      }))
      .reduce((acc, curr) => Object.assign(acc, curr), {} as OpenAPIV3.ResponsesObject);
  }

  #toOperation(definition: TOperationDefinition): TOperation {
    const { verb, path, responses, id, requests, parameters } = definition;

    const responseMap = Object.entries(responses).map(([code, response]) => {
      const content = this.apiGenerator.resolve(response).content;
      if (!content) {
        return { code, id, responses: {} };
      }

      const resolvedResponse = Object.keys(content).reduce(
        (resolved, type) => {
          const schema = content[type].schema;
          if (typeof schema !== 'undefined') {
            resolved[type] = recursiveResolveSchema(schema, this.apiGenerator);
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
    };
  }
}

export { ApiEndpoint, type ApiEndpointContract };

type TEntity = string;

type TOperationDefinition = {
  verb: string;
  path: string;
  requests: OpenAPIV3.OperationObject['requestBody'];
  parameters: OpenAPIV3.OperationObject['parameters'];
  id: string;
  responses: OpenAPIV3.ResponsesObject;
};

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
