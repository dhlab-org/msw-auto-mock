import path from 'path';
import { TOperation } from '../types';
import { writeFile } from '../utils';

interface IHandler {
  generate(): Promise<void>;
}

class Handler implements IHandler {
  private readonly targetFolder: string;
  private readonly codeList: Record<string, string | null>;
  private readonly entityList: string[];

  constructor(
    targetFolder: string,
    codeList: Record<string, string | null>,
    groupByEntity: Record<string, TOperation[]>,
  ) {
    this.targetFolder = targetFolder;
    this.codeList = codeList;
    this.entityList = Object.keys(groupByEntity);
  }

  async generate(): Promise<void> {
    await this.#generateHandlersByEntity();
    await this.#generateCombinedHandler();
  }

  async #generateHandlersByEntity() {
    await Promise.all(
      Object.entries(this.codeList).map(async ([entity, code]) => {
        if (!code) return;

        await writeFile(
          path.resolve(process.cwd(), path.join(this.targetFolder, 'handlers'), `${entity}.handlers.ts`),
          code,
        );
      }),
    );
  }

  async #generateCombinedHandler() {
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

    await writeFile(
      path.resolve(process.cwd(), path.join(this.targetFolder, 'handlers'), `index.ts`),
      combinedHandlers(),
    );
  }
}

export { Handler };
