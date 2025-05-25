import { isString, mapValues } from 'es-toolkit';
import path from 'path';
import { type ApiEndpointContract } from '../apiEndpoint';
import { type SwaggerContract } from '../swagger';
import { TOptions } from '../types';
import { writeFile } from '../utils';
import { HandlerTemplate, type HandlerTemplateContract, type TContext as TTemplateContext } from './template';

type GeneratorContract = {
  generate(targetFolder: string): Promise<void>;
};

class HandlerGenerator implements GeneratorContract {
  private readonly options: TOptions;
  private readonly apiEndpoint: ApiEndpointContract;
  private readonly swagger: SwaggerContract;
  private readonly OUTPUT_DIR = 'handlers';
  private template: HandlerTemplateContract;

  constructor(options: TOptions, apiEndpoint: ApiEndpointContract, swagger: SwaggerContract) {
    this.options = options;
    this.apiEndpoint = apiEndpoint;
    this.swagger = swagger;
    this.template = new HandlerTemplate();
  }

  async generate(targetFolder: string): Promise<void> {
    await this.#generateHandlersByEntity(targetFolder);
    await this.#generateCombinedHandler(targetFolder);
  }

  async #generateHandlersByEntity(targetFolder: string) {
    const templatesByEntity = mapValues(this.apiEndpoint.byEntity, (entityOperations, entity) => {
      return isString(entity) ? this.template.ofEntity(entityOperations, entity, this.#templateContext()) : null;
    });

    await Promise.all(
      Object.entries(templatesByEntity).map(async ([entity, template]) => {
        if (!template) return;

        await writeFile(
          path.resolve(process.cwd(), path.join(targetFolder, this.OUTPUT_DIR), `${entity}.handlers.ts`),
          template,
        );
      }),
    );
  }

  async #generateCombinedHandler(targetFolder: string) {
    const combinedTemplate = this.template.ofAllCombined(this.apiEndpoint.entities);

    await writeFile(
      path.resolve(process.cwd(), path.join(targetFolder, this.OUTPUT_DIR), `index.ts`),
      combinedTemplate,
    );
  }

  #templateContext(): TTemplateContext {
    return {
      baseURL: typeof this.options.baseUrl === 'string' ? this.options.baseUrl : this.swagger.baseUrl,
      controllerPath: this.options?.controllerPath ?? '@/app/mocks/controllers',
      isStatic: this.options?.static ?? false,
      maxArrayLength: this.options?.maxArrayLength ?? 20,
      controllers: this.options?.controllers ?? {},
    };
  }
}

export { HandlerGenerator };
