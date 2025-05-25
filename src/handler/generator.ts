import { isString, mapValues } from 'es-toolkit';
import path from 'path';
import { type IOperation } from '../operation';
import { Swagger } from '../swagger';
import { TOptions } from '../types';
import { writeFile } from '../utils';
import { HandlerTemplate, type IHandlerTemplate, type TContext as TTemplateContext } from './template';

interface IHandlerGenerator {
  generate(targetFolder: string): Promise<void>;
}

class HandlerGenerator implements IHandlerGenerator {
  private readonly options: TOptions;
  private readonly operation: IOperation;
  private readonly swagger: Swagger;
  private readonly OUTPUT_DIR = 'handlers';
  private template: IHandlerTemplate;

  constructor(options: TOptions, operation: IOperation, swagger: Swagger) {
    this.options = options;
    this.operation = operation;
    this.swagger = swagger;
    this.template = new HandlerTemplate();
  }

  async generate(targetFolder: string): Promise<void> {
    await this.#generateHandlersByEntity(targetFolder);
    await this.#generateCombinedHandler(targetFolder);
  }

  async #generateHandlersByEntity(targetFolder: string) {
    const templatesByEntity = mapValues(this.operation.byEntity, (entityOperations, entity) => {
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
    const combinedTemplate = this.template.ofAllCombined(this.operation.entities);

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
