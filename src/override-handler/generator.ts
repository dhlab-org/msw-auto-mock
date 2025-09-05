import fs from 'node:fs';
import path from 'node:path';
import { match } from 'ts-pattern';
import type { TScenarioConfig } from '../types';
import { writeFile } from '../utils.cjs';
import { OverrideHandlerAdapter, type OverrideHandlerAdapterContract } from './adapter';
import type { TApiRecorderData } from './api-recorder.types';
import { OverrideHandlerTemplate, type OverrideHandlerTemplateContract } from './template';

type GeneratorContract = {
  generate(targetFolder: string): Promise<void>;
};

class OverrideHandlerGenerator implements GeneratorContract {
  private readonly template: OverrideHandlerTemplateContract;
  private readonly adapter: OverrideHandlerAdapterContract;
  private readonly OUTPUT_DIR = '__handlers__/override';

  constructor() {
    this.template = new OverrideHandlerTemplate();
    this.adapter = new OverrideHandlerAdapter();
  }

  async generate(targetFolder: string): Promise<void> {
    const scenarios = await this.#scenarios(targetFolder);
    if (!scenarios) return;

    await Promise.all([
      this.#generateHandlersByScenario(targetFolder, scenarios),
      this.#generateCombinedHandler(targetFolder, scenarios),
    ]);
  }

  async #scenarios(targetFolder: string) {
    const scenarioFilePath = path.resolve(process.cwd(), targetFolder, 'scenarios.ts');
    if (!fs.existsSync(scenarioFilePath)) return null;

    const scenarioModule = await import(scenarioFilePath);

    if (!scenarioModule.scenarios) {
      console.error(
        `❌ 시나리오 파일 형식 오류: ${scenarioFilePath}
   'scenarios' 객체가 존재하지 않습니다.
   올바른 형식: export const scenarios = { ... };
   파일을 확인하고 수정한 후 다시 시도해주세요.`,
      );
      return null;
    }

    return scenarioModule.scenarios;
  }

  async #generateHandlersByScenario(targetFolder: string, scenarios: TScenarioConfig): Promise<void> {
    await Promise.all(
      Object.entries(scenarios).map(([scenarioId, scenario]) =>
        match(scenario)
          .with({ type: 'api-recorder' }, ({ demoData }) => {
            const requestGroups = this.adapter.requestGroups(demoData as TApiRecorderData[]);
            const template = this.template.ofScenario(scenarioId, requestGroups);
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
