import type { TOperation } from '../types';

type AdapterContract = {
  apiEndpointsType: string;
  statusCodesType: string;
};

class ScenarioTypeAdapter implements AdapterContract {
  private readonly pathsWithMethods: Record<string, string[]> = {};
  private readonly pathsWithStatusCodes: Record<string, Record<string, number[]>> = {};

  constructor(private readonly operations: TOperation[]) {
    for (const op of operations) {
      const { path, verb, response } = op;
      const method = verb.toUpperCase();

      // ① pathsWithMethods
      this.pathsWithMethods[path] ??= [];
      if (!this.pathsWithMethods[path].includes(method)) {
        this.pathsWithMethods[path].push(method);
      }

      // ② pathsWithStatusCodes
      this.pathsWithStatusCodes[path] ??= {};
      this.pathsWithStatusCodes[path][method] ??= [];
      const statusList = this.pathsWithStatusCodes[path][method];

      for (const res of response) {
        const code = Number.parseInt(res.code, 10);
        statusList.includes(code) || statusList.push(code);
      }
    }
  }

  get apiEndpointsType(): string {
    return Object.entries(this.pathsWithMethods)
      .map(([path, methods]) => `  '${path}': ${methods.map(m => `'${m}'`).join(' | ')}`)
      .join(';\n');
  }

  get statusCodesType(): string {
    const entries = Object.entries(this.pathsWithStatusCodes);

    return entries
      .map(([path, methods]) => {
        const methodEntries = Object.entries(methods);
        const methodTypes = methodEntries
          .map(([method, statusCodes]) => {
            const statusUnion = statusCodes.join(' | ');
            return `    '${method}': ${statusUnion};`;
          })
          .join('\n');

        return `  '${path}': {\n${methodTypes}\n  };`;
      })
      .join('\n');
  }
}

export { ScenarioTypeAdapter };
