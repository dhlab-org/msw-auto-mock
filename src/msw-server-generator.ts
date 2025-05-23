import path from 'path';
import { writeFile } from './utils';
import { TOptions } from './types';

interface IMSWServerGenerator {
  generate(targetFolder: string): Promise<void>;
}

class MSWServerGenerator implements IMSWServerGenerator {
  private readonly environment: TOptions['environment'];

  constructor(environment: TOptions['environment']) {
    this.environment = environment;
  }

  async generate(targetFolder: string): Promise<void> {
    const config: Record<NonNullable<TOptions['environment']> | 'default', ServerType[]> = {
      next: ['node', 'browser'],
      react: ['browser'],
      'react-native': ['native'],
      default: ['node', 'browser', 'native'],
    };

    const environments = config[this.environment ?? 'default'];
    await Promise.all(environments.map(env => this.#generateServer(targetFolder, env)));
  }

  async #generateServer(targetFolder: string, type: ServerType): Promise<void> {
    const content = this.#getServerContent(type);
    await writeFile(path.resolve(process.cwd(), targetFolder, `${type}.ts`), content);
  }

  #getServerContent(type: ServerType): string {
    const config: Record<ServerType, ServerConfig> = {
      node: {
        import: 'setupServer',
        from: 'msw/node',
        export: 'server',
      },
      browser: {
        import: 'setupWorker',
        from: 'msw/browser',
        export: 'worker',
      },
      native: {
        import: 'setupServer',
        from: 'msw/native',
        export: 'server',
      },
    };

    const { import: importName, from, export: exportName } = config[type];
    return [
      `import { ${importName} } from '${from}'`,
      `import { handlers } from './handlers'`,
      `export const ${exportName} = ${importName}(...handlers)`,
    ].join('\n');
  }
}

export { MSWServerGenerator };

type ServerType = 'node' | 'browser' | 'native';
type ServerConfig = {
  import: string;
  from: string;
  export: string;
};
