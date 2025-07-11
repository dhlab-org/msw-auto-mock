import type { TOperation } from '../types';

type AdapterContract = {
  apiEndpointsType: string;
  statusCodesType: string;
};

class ScenarioTypeAdapter implements AdapterContract {
  constructor(private readonly operations: TOperation[]) {}

  get apiEndpointsType(): string {
    return Object.entries(this.#pathsWithMethods)
      .map(([path, methods]) => `  '${path}': ${methods.map(m => `'${m}'`).join(' | ')}`)
      .join(';\n');
  }

  get statusCodesType(): string {
    const entries = Object.entries(this.#pathsWithStatusCodes);

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

  get #pathsWithMethods(): Record<string, string[]> {
    return this.operations.reduce(
      (acc, op) => {
        if (!acc[op.path]) {
          acc[op.path] = [];
        }
        const method = op.verb.toUpperCase();
        if (!acc[op.path].includes(method)) {
          acc[op.path].push(method);
        }
        return acc;
      },
      {} as Record<string, string[]>,
    );
  }

  get #pathsWithStatusCodes(): Record<string, Record<string, number[]>> {
    return this.operations.reduce(
      (acc, op) => {
        if (!acc[op.path]) {
          acc[op.path] = {};
        }
        const method = op.verb.toUpperCase();
        if (!acc[op.path][method]) {
          acc[op.path][method] = [];
        }

        for (const res of op.response) {
          const statusCode = Number.parseInt(res.code, 10);
          if (!acc[op.path][method].includes(statusCode)) {
            acc[op.path][method].push(statusCode);
          }
        }

        return acc;
      },
      {} as Record<string, Record<string, number[]>>,
    );
  }
}

export { ScenarioTypeAdapter };
