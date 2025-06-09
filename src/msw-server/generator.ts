import path from 'path';
import { writeFile } from '../utils';
import { TOptions } from '../types';

type GeneratorContract = {
  generate(targetFolder: string): Promise<void>;
};

class MSWServerGenerator implements GeneratorContract {
  private readonly environment: TOptions['environment'];

  constructor(environment: TOptions['environment']) {
    this.environment = environment;
  }

  async generate(targetFolder: string): Promise<void> {
    const config: Record<NonNullable<TOptions['environment']> | 'default', TServerType[]> = {
      next: ['node', 'browser'],
      react: ['browser'],
      'react-native': ['native'],
      default: ['node', 'browser', 'native'],
    };

    const environments = config[this.environment ?? 'default'];
    await Promise.all(environments.map(env => this.#generateServer(targetFolder, env)));
  }

  async #generateServer(targetFolder: string, type: TServerType): Promise<void> {
    const template = this.#templateOf(type);
    await writeFile(path.resolve(process.cwd(), targetFolder, `${type}.ts`), template);
  }

  #templateOf(type: TServerType): string {
    const config: Record<TServerType, TServerConfig> = {
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
      `import { handlers } from './__handlers__'`,
      `export const ${exportName} = ${importName}(...handlers)`,
    ].join('\n');
  }
}

export { MSWServerGenerator };

type TServerType = 'node' | 'browser' | 'native';

type TServerConfig = {
  import: string;
  from: string;
  export: string;
};
