import fs from 'node:fs';
import path from 'node:path';
import { match } from 'ts-pattern';
import type { TScenarioConfig } from '../types';
import { writeFile } from '../utils.cjs';
import type { TApiRecorderData } from './api-recorder.types';
import { OverrideHandlerTemplate, type OverrideHandlerTemplateContract } from './template';

type GeneratorContract = {
  generate(targetFolder: string): Promise<void>;
};

class OverrideHandlerGenerator implements GeneratorContract {
  private readonly template: OverrideHandlerTemplateContract;
  private readonly OUTPUT_DIR = '__handlers__/override';

  constructor() {
    this.template = new OverrideHandlerTemplate();
  }

  async generate(targetFolder: string): Promise<void> {
    const scenarioFilePath = path.resolve(process.cwd(), targetFolder, 'scenarios.ts');
    if (!fs.existsSync(scenarioFilePath)) return;

    const { scenarios } = await import(scenarioFilePath);

    await Promise.all([
      this.#generateHandlersByScenario(targetFolder, scenarios),
      this.#generateCombinedHandler(targetFolder, scenarios),
    ]);
  }

  async #generateHandlersByScenario(targetFolder: string, scenarios: TScenarioConfig): Promise<void> {
    await Promise.all(
      Object.entries(scenarios).map(([scenarioId, scenario]) =>
        match(scenario)
          .with({ type: 'api-recorder' }, ({ demoData }) => {
            const template = this.template.ofScenario(scenarioId, demoData as TApiRecorderData[]);
            const filePath = path.resolve(
              process.cwd(),
              path.join(targetFolder, this.OUTPUT_DIR),
              `${scenarioId}.handlers.ts`,
            );
            return writeFile(filePath, template);
          })
          .otherwise(() => []),
      ),
    );
  }

  async #generateCombinedHandler(targetFolder: string, scenarios: TScenarioConfig) {
    const overrideScenarioIds = Object.entries(scenarios)
      .filter(([_, scenario]) => scenario.type === 'api-recorder')
      .map(([scenarioId]) => scenarioId);

    const template = this.template.ofAllCombined(overrideScenarioIds);
    const filePath = path.resolve(process.cwd(), path.join(targetFolder, this.OUTPUT_DIR), 'index.ts');
    await writeFile(filePath, template);
  }
}

export { OverrideHandlerGenerator };
