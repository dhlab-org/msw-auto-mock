import SwaggerParser from '@apidevtools/swagger-parser';
import type { OpenAPIV3 } from 'openapi-types';
// @ts-ignore lack of d.ts file
import converter from 'swagger2openapi';
import { TOptions } from './types';

interface ISwagger {
  document: Promise<OpenAPIV3.Document>;
}

class Swagger implements ISwagger {
  private readonly rawFile: TOptions['input'];

  constructor(rawFile: TOptions['input']) {
    this.rawFile = rawFile;
  }

  get document(): Promise<OpenAPIV3.Document> {
    return this.#openApiV3Doc();
  }

  async #openApiV3Doc(): Promise<OpenAPIV3.Document> {
    const doc = await SwaggerParser.bundle(this.rawFile);
    const isOpenApiV3 = 'openapi' in doc && doc.openapi.startsWith('3');

    return isOpenApiV3
      ? (doc as OpenAPIV3.Document)
      : ((await converter.convertObj(doc, {})).openapi as OpenAPIV3.Document);
  }
}

export { Swagger };
