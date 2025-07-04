import type { TOperation } from '../types';

type AdapterContract = {
  pathsWithMethods: Record<string, string[]>;
  apiEndpointsType: string;
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

  get apiEndpointsType(): string {
    return Object.entries(this.pathsWithMethods)
      .map(([path, methods]) => `  '${path}': ${methods.map(m => `'${m}'`).join(' | ')}`)
      .join(';\n');
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
