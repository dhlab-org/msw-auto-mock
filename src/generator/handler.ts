import path from 'path';
import { TOperation } from '../types';
import { writeFile } from '../utils';

interface IHandler {
  generate(targetFolder: string): Promise<void>;
}

class Handler implements IHandler {
  private readonly codeList: Record<string, string | null>;
  private readonly entityList: string[];

  constructor(codeList: Record<string, string | null>, groupByEntity: Record<string, TOperation[]>) {
    this.codeList = codeList;
    this.entityList = Object.keys(groupByEntity);
  }

  async generate(targetFolder: string): Promise<void> {
    await this.#generateHandlersByEntity(targetFolder);
    await this.#generateCombinedHandler(targetFolder);
  }

  async #generateHandlersByEntity(targetFolder: string) {
    await Promise.all(
      Object.entries(this.codeList).map(async ([entity, code]) => {
        if (!code) return;

        await writeFile(
          path.resolve(process.cwd(), path.join(targetFolder, 'handlers'), `${entity}.handlers.ts`),
          code,
        );
      }),
    );
  }

  async #generateCombinedHandler(targetFolder: string) {
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

    await writeFile(path.resolve(process.cwd(), path.join(targetFolder, 'handlers'), `index.ts`), combinedHandlers());
  }
}

export { Handler };
