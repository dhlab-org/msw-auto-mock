import fs from 'node:fs';
import path from 'node:path';
import { writeFile } from '../utils.cjs.js';
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
    const scenarioFilePath = path.resolve(process.cwd(), targetFolder, 'scenarios.ts');

    if (fs.existsSync(scenarioFilePath)) {
      // 시나리오 파일이 이미 존재하면 생성하지 않음
      return;
    }

    const template = this.template.ofConfig();
    await writeFile(scenarioFilePath, template);
  }
}

export { ScenarioGenerator };
