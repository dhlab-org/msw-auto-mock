import merge from 'lodash/merge';
import type { OpenAPIV3 } from 'openapi-types';
import { isValidRegExp } from './utils';

export const MAX_STRING_LENGTH = 42;

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
    case 'integer': {
      const params = JSON.stringify({
        min: jsonSchema.minimum,
        max: jsonSchema.maximum,
      });
      if (jsonSchema.minimum || jsonSchema.maxItems) {
        return `faker.number.int(${params})`;
      }
      return 'faker.number.int()';
    }
    case 'boolean':
      return 'faker.datatype.boolean()';
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
    return 'faker.date.past()';
  }
  if (format === 'time') {
    return 'new Date().toISOString().substring(11, 16)';
  }
  if (format === 'date') {
    return 'faker.date.past().toISOString().substring(0,10)';
  }
  if (format === 'uuid' || key?.toLowerCase() === 'id' || key?.toLowerCase().endsWith('id')) {
    return 'faker.string.uuid()';
  }
  if (['idn-email', 'email'].includes(format ?? '') || key?.toLowerCase().includes('email')) {
    return 'faker.internet.email()';
  }
  if (['hostname', 'idn-hostname'].includes(format ?? '')) {
    return 'faker.internet.domainName()';
  }
  if (format === 'ipv4') {
    return 'faker.internet.ip()';
  }
  if (format === 'ipv6') {
    return 'faker.internet.ipv6()';
  }
  if (
    ['uri', 'uri-reference', 'iri', 'iri-reference', 'uri-template'].includes(format ?? '') ||
    key?.toLowerCase().includes('url')
  ) {
    if (['photo', 'image', 'picture'].some(image => key?.toLowerCase().includes(image))) {
      return 'faker.image.url()';
    }
    return 'faker.internet.url()';
  }
  if (key?.toLowerCase().endsWith('name')) {
    return 'faker.person.fullName()';
  }
  if (key?.toLowerCase().includes('street')) {
    return 'faker.location.streetAddress()';
  }
  if (key?.toLowerCase().includes('city')) {
    return 'faker.location.city()';
  }
  if (key?.toLowerCase().includes('state')) {
    return 'faker.location.state()';
  }
  if (key?.toLowerCase().includes('zip')) {
    return 'faker.location.zipCode()';
  }

  if (minLength && maxLength) {
    return `faker.string.alpha({ length: { min: ${minLength}, max: ${maxLength} }})`;
  }
  if (minLength) {
    return `faker.string.alpha({ length: { min: ${minLength}, max: MAX_STRING_LENGTH }})`;
  }
  if (maxLength) {
    return `faker.string.alpha({ length: { min: 0, max: ${maxLength} }})`;
  }

  if (pattern && isValidRegExp(pattern)) {
    return `faker.helpers.fromRegExp(${pattern})`;
  }

  return 'faker.lorem.words()';
}
