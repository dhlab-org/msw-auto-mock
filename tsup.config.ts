import type { Options } from 'tsup';

export const tsup: Options = {
  splitting: false,
  sourcemap: false,
  clean: true,
  minify: false,
  format: ['cjs'],
  dts: true,
  external: ['node:fs', 'node:path', 'fs', 'path'],
  noExternal: ['swagger2openapi', 'oazapfts'],
  target: 'node14',
  platform: 'node',
  entryPoints: ['src/index.ts'],
};
