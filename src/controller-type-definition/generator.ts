import path from 'node:path';
import { compact } from 'es-toolkit';
import type { ApiEndpointContract } from '../api-endpoint';
import { writeFile } from '../utils.cjs';
import { ControllerTypeTemplate, type ControllerTypeTemplateContract } from './template';

type GeneratorContract = {
  generate(targetFolder: string): Promise<void>;
};

class ControllerTypeDefinitionGenerator implements GeneratorContract {
  private readonly apiEndpoint: ApiEndpointContract;
  private readonly template: ControllerTypeTemplateContract;
  private readonly OUTPUT_DIR = '__types__/controllers';

  constructor(apiEndpoint: ApiEndpointContract) {
    this.apiEndpoint = apiEndpoint;
    this.template = new ControllerTypeTemplate();
  }

  async generate(targetFolder: string): Promise<void> {
    await Promise.all([this.#generateEntityTypeFiles(targetFolder), this.#generateCombinedTypeFile(targetFolder)]);
  }

  async #generateEntityTypeFiles(targetFolder: string): Promise<void> {
    const entityTypeList = compact(
      Object.entries(this.apiEndpoint.byEntity).map(([entity, operations]) => {
        return {
          entity,
          template: this.template.ofEntity(operations, entity),
        };
      }),
    );

    await Promise.all(
      entityTypeList.map(async ({ entity, template }) => {
        const filePath = path.resolve(process.cwd(), path.join(targetFolder, this.OUTPUT_DIR), `${entity}.type.ts`);
        await writeFile(filePath, template);
      }),
    );
  }

  async #generateCombinedTypeFile(targetFolder: string): Promise<void> {
    const filePath = path.resolve(process.cwd(), path.join(targetFolder, this.OUTPUT_DIR), 'index.ts');
    const template = this.template.ofAllCombined(this.apiEndpoint.entities);
    await writeFile(filePath, template);
  }
}

export { ControllerTypeDefinitionGenerator };
