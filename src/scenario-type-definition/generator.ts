import path from 'node:path';
import type { ApiEndpointContract } from '../apiEndpoint';
import { writeFile } from '../utils';
import { ScenarioTypeTemplate, type ScenarioTypeTemplateContract } from './template';

type GeneratorContract = {
  generate(targetFolder: string): Promise<void>;
};

class ScenarioTypeDefinitionGenerator implements GeneratorContract {
  private readonly apiEndpoint: ApiEndpointContract;
  private readonly template: ScenarioTypeTemplateContract;
  private readonly OUTPUT_DIR = '__types__/scenarios';

  constructor(apiEndpoint: ApiEndpointContract) {
    this.apiEndpoint = apiEndpoint;
    this.template = new ScenarioTypeTemplate();
  }

  async generate(targetFolder: string): Promise<void> {
    await this.#generateScenarioTypeFile(targetFolder);
  }

  async #generateScenarioTypeFile(targetFolder: string): Promise<void> {
    const template = this.template.ofAllEndpoints(this.apiEndpoint.collection);
    const filePath = path.resolve(process.cwd(), path.join(targetFolder, this.OUTPUT_DIR), 'scenarios.type.ts');
    await writeFile(filePath, template);
  }
}

export { ScenarioTypeDefinitionGenerator };
