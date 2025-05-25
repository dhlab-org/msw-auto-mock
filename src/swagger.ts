import SwaggerParser from '@apidevtools/swagger-parser';
import type { OpenAPIV3 } from 'openapi-types';
// @ts-ignore lack of d.ts file
import converter from 'swagger2openapi';
import { TOptions } from './types';

type SwaggerContract = {
  apiDoc: OpenAPIV3.Document;
  baseUrl: string;
};

class Swagger implements SwaggerContract {
  private readonly document: OpenAPIV3.Document;

  private constructor(document: OpenAPIV3.Document) {
    this.document = document;
  }

  get apiDoc(): OpenAPIV3.Document {
    return this.document;
  }

  get baseUrl() {
    const server = this.document.servers?.at(0);
    if (!server) return '';

    return Object.entries(server.variables || {}).reduce(
      (url, [key, value]) => url.replace(`{${key}}`, value.default),
      server.url,
    );
  }

  static async load(rawFile: TOptions['input']): Promise<Swagger> {
    const document = await Swagger.#openApiV3Doc(rawFile);
    return new Swagger(document);
  }

  static async #openApiV3Doc(rawFile: TOptions['input']): Promise<OpenAPIV3.Document> {
    const doc = await SwaggerParser.bundle(rawFile);
    const isOpenApiV3 = 'openapi' in doc && doc.openapi.startsWith('3');

    return isOpenApiV3
      ? (doc as OpenAPIV3.Document)
      : ((await converter.convertObj(doc, {})).openapi as OpenAPIV3.Document);
  }
}

export { Swagger, type SwaggerContract };
