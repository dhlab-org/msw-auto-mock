import vm from 'node:vm';
import { OpenAPIV3 } from 'openapi-types';
import merge from 'lodash/merge';
import { camelCase } from 'es-toolkit/string';
import { faker } from '@faker-js/faker';
import { ProgrammaticOptions } from './types';
import { isValidRegExp } from './utils';
import { match, P } from 'ts-pattern';
import { compact } from 'lodash';

const MAX_STRING_LENGTH = 42;

export interface ResponseMap {
  code: string;
  id: string;
  responses?: Record<string, OpenAPIV3.SchemaObject>;
}

export interface Operation {
  verb: string;
  path: string;
  response: ResponseMap[];
  request: OpenAPIV3.OperationObject['requestBody'];
  parameters: OpenAPIV3.OperationObject['parameters'];
  operationId: OpenAPIV3.OperationObject['operationId'];
}

export type OperationCollection = Operation[];

export function getResIdentifierName(res: ResponseMap) {
  if (!res.id) {
    return '';
  }
  return camelCase(`get ${res.id}${res.code}Response`);
}

export function transformToGenerateResultFunctions(
  operationCollection: OperationCollection,
  baseURL: string,
  options?: ProgrammaticOptions,
) {
  const context = {
    faker,
    MAX_STRING_LENGTH,
    MAX_ARRAY_LENGTH: options?.maxArrayLength ?? 20,
    baseURL: baseURL ?? '',
    result: null,
  };
  vm.createContext(context);

  return operationCollection
    .map(op =>
      op.response
        .map(r => {
          const name = getResIdentifierName(r);
          if (!name) {
            return '';
          }

          if (!r.responses) {
            return;
          }

          const isCustomResponse = Object.keys(options?.controllers ?? {}).includes(name);
          if (isCustomResponse) {
            return [
              `export function ${name}(info: Parameters<HttpResponseResolver>[0]) {`,
              `  return controllers.${name}(info);`,
              `};\n`,
            ].join('\n');
          }

          const jsonResponseKey = Object.keys(r.responses).filter(r => r.startsWith('application/json'))[0];
          const fakerResult = transformJSONSchemaToFakerCode(r.responses?.[jsonResponseKey]);
          if (options?.static) {
            vm.runInContext(`result = ${fakerResult};`, context);
          }

          return [
            `export function `,
            `${name}() { `,
            `return ${options?.static ? JSON.stringify(context.result) : fakerResult} `,
            `};\n`,
          ].join('\n');
        })
        .join('\n'),
    )
    .join('\n');
}

export function transformToHandlerCode(operationCollection: OperationCollection): string {
  return operationCollection
    .map(op => {
      return `http.${op.verb}(\`\${baseURL}${op.path}\`, async (info) => {
        const resultArray = [${op.response.map(response => {
          const identifier = getResIdentifierName(response);
          const status = parseInt(response?.code!);
          const responseType = response.responses ? Object.keys(response.responses)[0] : 'application/json';
          const result = `{
            status: ${status},
            responseType: ${status === 204 ? 'undefined' : `'${responseType}'`},
            body: ${status === 204 ? 'undefined' : `${identifier ? `await ${identifier}(info)` : 'undefined'}`}
          }`;

          return result;
        })}];

        const selectedResult = resultArray[next(\`${op.verb} ${op.path}\`) % resultArray.length]
        
        return new HttpResponse(JSON.stringify(selectedResult.body), {
          status: selectedResult.status,
          headers: {
            'Content-Type': selectedResult.responseType
          }
        })
      }),\n`;
    })
    .join('  ')
    .trimEnd();
}

export function transformToDtoImportCode(operationCollectionList: OperationCollection) {
  const dtoList = operationCollectionList.reduce((dtoSet, op)=>{
    const requestDtoTypeName = match(op.request)
      .with(
        { content: { ['application/json']: { schema: { $ref: P.string } } } },
        r => `${r.content['application/json'].schema['$ref'].split('/').at(-1)}Dto`,
      )
      .otherwise(() => null);
    
    requestDtoTypeName && dtoSet.add(requestDtoTypeName)

    for (const response of op.response) {
      const responseBodyTypeName = match(response.responses)
        .with({ 'application/json': { title: P.string, properties: P.nonNullable } }, r => `${r['application/json'].title}Dto`)
        .with({ 'application/json': { title: P.string, items: { title: P.string } } }, r => `${r['application/json'].items.title}Dto`)
        .otherwise(() => null);

      responseBodyTypeName && dtoSet.add(responseBodyTypeName)
    }

    return dtoSet
  }, new Set<string>())

  return `import type { ${Array.from(dtoList).join(', ')} } from '@/shared/api/dto';`;
}

export function transformToControllersType(operationCollectionList: OperationCollection) {
  const controllers: Array<{
    identifierName: string;
    pathParams: string;
    requestBodyType: string;
    responseBodyType: string;
  }> = [];

  for (const op of operationCollectionList) {
    const requestDtoTypeName = match(op.request)
      .with(
        { content: { ['application/json']: { schema: { $ref: P.string } } } },
        r => `${r.content['application/json'].schema['$ref'].split('/').at(-1)}Dto`,
      )
      // TODO: 추후에 다른 타입도 지원해야 함
      .otherwise(() => 'null');

    const mappingType = {
      integer: 'number',
      string: 'string',
      boolean: 'boolean',
      object: 'object',
      number: 'number',
    };

    const pathParamsTypeContents = compact(
      match(op.parameters)
        .with(
          P.array({ in: P.string, schema: { type: P.union('integer', 'string', 'boolean', 'object', 'number') } }),
          p => p.filter(p => p.in === 'path').map(p => `${p.name}: string`),
        )
        // @TODO 다른 타입도 지원해야 함
        .otherwise(() => []),
    ).join(',\n');

    const pathParamsInlineType = pathParamsTypeContents ? `{${pathParamsTypeContents}}` : 'Record<string, never>';

    for (const response of op.response) {
      const responseBodyTypeName = match(response.responses)
        .with({ 'application/json': { title: P.string, properties: P.nonNullable } }, r => `${r['application/json'].title}Dto`)
        .with({ 'application/json': { title: P.string, items: { title: P.string } } }, r => `${r['application/json'].items.title}Dto[]`)
        .otherwise(() => 'null');

      const identifierName = getResIdentifierName(response) || camelCase(`${op.operationId}${op.verb}${response.code}Response`);

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

export function transformJSONSchemaToFakerCode(jsonSchema?: OpenAPIV3.SchemaObject, key?: string): string {
  if (!jsonSchema) {
    return 'null';
  }

  if (jsonSchema.example) {
    if (jsonSchema.example.$ref) {
    }
    return JSON.stringify(jsonSchema.example);
  }

  if (Array.isArray(jsonSchema.type)) {
    return `faker.helpers.arrayElement([${jsonSchema.type
      .map(type => transformJSONSchemaToFakerCode({ ...jsonSchema, type }))
      .join(',')}])`;
  }

  if (jsonSchema.enum) {
    return `faker.helpers.arrayElement(${JSON.stringify(jsonSchema.enum)})`;
  }

  if (jsonSchema.allOf) {
    const { allOf, ...rest } = jsonSchema;
    return transformJSONSchemaToFakerCode(merge({}, ...allOf, rest));
  }

  if (jsonSchema.oneOf) {
    const schemas = jsonSchema.oneOf as OpenAPIV3.SchemaObject[];
    return `faker.helpers.arrayElement([${schemas.map(i => transformJSONSchemaToFakerCode(i))}])`;
  }

  if (jsonSchema.anyOf) {
    const schemas = jsonSchema.anyOf as OpenAPIV3.SchemaObject[];
    return `faker.helpers.arrayElement([${schemas.map(i => transformJSONSchemaToFakerCode(i))}])`;
  }

  switch (jsonSchema.type) {
    case 'string':
      return transformStringBasedOnFormat(jsonSchema, key);
    case 'number':
    case 'integer':
      const params = JSON.stringify({ min: jsonSchema.minimum, max: jsonSchema.maximum });
      if (jsonSchema.minimum || jsonSchema.maxItems) {
        return `faker.number.int(${params})`;
      }
      return `faker.number.int()`;
    case 'boolean':
      return `faker.datatype.boolean()`;
    case 'object':
      if (!jsonSchema.properties && typeof jsonSchema.additionalProperties === 'object') {
        return `[...new Array(5).keys()].map(_ => ({ [faker.lorem.word()]: ${transformJSONSchemaToFakerCode(
          jsonSchema.additionalProperties as OpenAPIV3.SchemaObject,
        )} })).reduce((acc, next) => Object.assign(acc, next), {})`;
      }

      return `{
        ${Object.entries(jsonSchema.properties ?? {})
          .map(([k, v]) => {
            return `${JSON.stringify(k)}: ${transformJSONSchemaToFakerCode(v as OpenAPIV3.SchemaObject, k)}`;
          })
          .join(',\n')}
    }`;
    case 'array':
      return `[...(new Array(faker.number.int({ min: ${jsonSchema.minItems ?? 1}, max: ${
        jsonSchema.maxItems ?? 'MAX_ARRAY_LENGTH'
      } }))).keys()].map(_ => (${transformJSONSchemaToFakerCode(jsonSchema.items as OpenAPIV3.SchemaObject)}))`;
    default:
      return 'null';
  }
}

/**
 * See https://json-schema.org/understanding-json-schema/reference/string.html#built-in-formats
 */
function transformStringBasedOnFormat(schema: OpenAPIV3.NonArraySchemaObject, key?: string) {
  const { format, minLength, maxLength, pattern } = schema;
  if (format === 'date-time' || key?.toLowerCase().endsWith('_at')) {
    return `faker.date.past()`;
  } else if (format === 'time') {
    return `new Date().toISOString().substring(11, 16)`;
  } else if (format === 'date') {
    return `faker.date.past().toISOString().substring(0,10)`;
  } else if (format === 'uuid' || key?.toLowerCase() === 'id' || key?.toLowerCase().endsWith('id')) {
    return `faker.string.uuid()`;
  } else if (['idn-email', 'email'].includes(format ?? '') || key?.toLowerCase().includes('email')) {
    return `faker.internet.email()`;
  } else if (['hostname', 'idn-hostname'].includes(format ?? '')) {
    return `faker.internet.domainName()`;
  } else if (format === 'ipv4') {
    return `faker.internet.ip()`;
  } else if (format === 'ipv6') {
    return `faker.internet.ipv6()`;
  } else if (
    ['uri', 'uri-reference', 'iri', 'iri-reference', 'uri-template'].includes(format ?? '') ||
    key?.toLowerCase().includes('url')
  ) {
    if (['photo', 'image', 'picture'].some(image => key?.toLowerCase().includes(image))) {
      return `faker.image.url()`;
    }
    return `faker.internet.url()`;
  } else if (key?.toLowerCase().endsWith('name')) {
    return `faker.person.fullName()`;
  } else if (key?.toLowerCase().includes('street')) {
    return `faker.location.streetAddress()`;
  } else if (key?.toLowerCase().includes('city')) {
    return `faker.location.city()`;
  } else if (key?.toLowerCase().includes('state')) {
    return `faker.location.state()`;
  } else if (key?.toLowerCase().includes('zip')) {
    return `faker.location.zipCode()`;
  }

  if (minLength && maxLength) {
    return `faker.string.alpha({ length: { min: ${minLength}, max: ${maxLength} }})`;
  } else if (minLength) {
    return `faker.string.alpha({ length: { min: ${minLength}, max: MAX_STRING_LENGTH }})`;
  } else if (maxLength) {
    return `faker.string.alpha({ length: { min: 0, max: ${maxLength} }})`;
  }

  if (pattern && isValidRegExp(pattern)) {
    return `faker.helpers.fromRegExp(${pattern})`;
  }

  return `faker.lorem.words()`;
}
