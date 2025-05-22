import path from 'path';
import { TOperation, TOptions } from '../types';
import { writeFile } from '../utils';
import { isString, mapValues } from 'es-toolkit';
import { mockTemplate } from '../template';
import { OpenAPIV3 } from 'openapi-types';
import { Swagger } from '../swagger';

interface IHandler {
  generate(targetFolder: string): Promise<void>;
}

class Handler implements IHandler {
  private readonly options: TOptions;
  private readonly groupByEntity: Record<string, TOperation[]>;
  private readonly entityList: string[];

  constructor(options: TOptions, groupByEntity: Record<string, TOperation[]>) {
    this.options = options;
    this.groupByEntity = groupByEntity;
    this.entityList = Object.keys(groupByEntity);
  }

  async generate(targetFolder: string): Promise<void> {
    await this.#generateHandlersByEntity(targetFolder);
    await this.#generateCombinedHandler(targetFolder);
  }

  async #generateHandlersByEntity(targetFolder: string) {
    await Promise.all(
      Object.entries(this.#codeList).map(async ([entity, code]) => {
        if (!code) return;

        await writeFile(
          path.resolve(process.cwd(), path.join(targetFolder, 'handlers'), `${entity}.handlers.ts`),
          code,
        );
      }),
    );
  }

  async #generateCombinedHandler(targetFolder: string) {
    const combinedHandlers = () => {
      const handlersImport = this.entityList
        .map(entity => {
          return `import { ${entity}Handlers } from './${entity}.handlers';`;
        })
        .join('\n');

      const combineHandlers = `export const handlers = [
        ${this.entityList
          .map(entity => {
            return `...${entity}Handlers, `;
          })
          .join('\n')}
        ]`;

      return [handlersImport, combineHandlers].join('\n\n');
    };

    await writeFile(path.resolve(process.cwd(), path.join(targetFolder, 'handlers'), `index.ts`), combinedHandlers());
  }

  async #codeList() {
    const apiDoc = await new Swagger(this.options.input).document;
    const baseURL = typeof this.options.baseUrl === 'string' ? this.options.baseUrl : this.#getServerUrl(apiDoc);
    return mapValues(this.groupByEntity, (operationCollection, entity) => {
      return isString(entity) ? mockTemplate(operationCollection, baseURL, this.options, entity) : null;
    });
  }

  #getServerUrl(apiDoc: OpenAPIV3.Document) {
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
}

export { Handler };
