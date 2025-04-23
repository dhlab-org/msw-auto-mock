import type { Options } from 'tsup';

export const tsup: Options = {
  splitting: false,
  sourcemap: false,
  clean: true,
  minify: false,
  format: ['cjs', 'esm'],
  dts: true,
  external: ['node:fs', 'node:path', 'fs', 'path'],
  noExternal: ['swagger2openapi', 'oazapfts'],
  entryPoints: ['src/index.ts'],
};
