import fs from 'node:fs';
import path from 'node:path';
import { writeFile } from '../utils';
import { ScenarioTemplate, type ScenarioTemplateContract } from './template';

type GeneratorContract = {
  generate(targetFolder: string): Promise<void>;
};

class ScenarioGenerator implements GeneratorContract {
  private readonly template: ScenarioTemplateContract;

  constructor() {
    this.template = new ScenarioTemplate();
  }

  async generate(targetFolder: string): Promise<void> {
    await this.#generateScenarioIfNotExists(targetFolder);
  }

  async #generateScenarioIfNotExists(targetFolder: string): Promise<void> {
    const scenarioFilePath = path.resolve(process.cwd(), targetFolder, 'scenarios.ts');

    // 시나리오 파일이 이미 존재하면 생성하지 않음
    if (fs.existsSync(scenarioFilePath)) {
      return;
    }

    const template = this.template.generate();
    await writeFile(scenarioFilePath, template);
  }
}

export { ScenarioGenerator };
