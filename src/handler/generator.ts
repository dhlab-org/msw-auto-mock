import path from "node:path";
import type { ApiEndpointContract } from "../apiEndpoint";
import type { SwaggerContract } from "../swagger";
import type { TOptions } from "../types";
import { writeFile } from "../utils";
import {
  HandlerTemplate,
  type HandlerTemplateContract,
  type TContext as TTemplateContext,
} from "./template";

type GeneratorContract = {
  generate(targetFolder: string): Promise<void>;
};

class HandlerGenerator implements GeneratorContract {
  private readonly options: TOptions;
  private readonly apiEndpoint: ApiEndpointContract;
  private readonly swagger: SwaggerContract;
  private readonly OUTPUT_DIR = "__handlers__";
  private readonly template: HandlerTemplateContract;

  constructor(
    options: TOptions,
    apiEndpoint: ApiEndpointContract,
    swagger: SwaggerContract,
  ) {
    this.options = options;
    this.apiEndpoint = apiEndpoint;
    this.swagger = swagger;
    this.template = new HandlerTemplate();
  }

  async generate(targetFolder: string): Promise<void> {
    await Promise.all([
      this.#generateHandlersByEntity(targetFolder),
      this.#generateCombinedHandler(targetFolder),
    ]);
  }

  async #generateHandlersByEntity(targetFolder: string): Promise<void> {
    await Promise.all(
      Object.entries(this.apiEndpoint.byEntity).map(
        async ([entity, entityOperations]) => {
          const template = this.template.ofEntity(
            entityOperations,
            entity,
            this.#templateContext(),
          );
          const filePath = path.resolve(
            process.cwd(),
            path.join(targetFolder, this.OUTPUT_DIR),
            `${entity}.handlers.ts`,
          );
          await writeFile(filePath, template);
        },
      ),
    );
  }

  async #generateCombinedHandler(targetFolder: string): Promise<void> {
    const template = this.template.ofAllCombined(this.apiEndpoint.entities);
    const filePath = path.resolve(
      process.cwd(),
      path.join(targetFolder, this.OUTPUT_DIR),
      "index.ts",
    );
    await writeFile(filePath, template);
  }

  #templateContext(): TTemplateContext {
    return {
      baseURL:
        typeof this.options.baseUrl === "string"
          ? this.options.baseUrl
          : this.swagger.baseUrl,
      controllerPath: this.options?.controllerPath ?? "@/app/mocks/controllers",
      isStatic: this.options?.static ?? false,
      maxArrayLength: this.options?.maxArrayLength ?? 20,
      controllers: this.options?.controllers ?? {},
    };
  }
}

export { HandlerGenerator };
