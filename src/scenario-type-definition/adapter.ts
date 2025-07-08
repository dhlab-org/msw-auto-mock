import type { TOperation } from '../types';

type AdapterContract = {
  pathsWithMethods: Record<string, string[]>;
  apiEndpointsType: string;
  pathsWithStatusCodes: Record<string, Record<string, number[]>>;
  statusCodesType: string;
  allPaths: string[];
  allMethods: string[];
};

class ScenarioTypeAdapter implements AdapterContract {
  constructor(private readonly operations: TOperation[]) {}

  get pathsWithMethods(): Record<string, string[]> {
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

  get pathsWithStatusCodes(): Record<string, Record<string, number[]>> {
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

  get allPaths(): string[] {
    return Object.keys(this.pathsWithMethods);
  }

  get allMethods(): string[] {
    const allMethods = new Set<string>();
    for (const methods of Object.values(this.pathsWithMethods)) {
      for (const method of methods) {
        allMethods.add(method);
      }
    }
    return Array.from(allMethods);
  }
}

export { ScenarioTypeAdapter };
