import type { Options } from 'tsup';

export const tsup: Options[] = [
  // 환경 상관없이 사용 가능한 기능들 (기본 엔트리)
  {
    entry: ['src/index.ts'],
    splitting: false,
    sourcemap: false,
    clean: true,
    minify: false,
    format: ['cjs', 'esm'],
    dts: true,
    target: 'es2022',
    platform: 'neutral',
  },
  {
    entry: ['src/node.ts'],
    splitting: false,
    sourcemap: false,
    clean: false,
    minify: false,
    format: ['cjs'],
    dts: true,
    outDir: 'dist/node',
    external: ['node:fs', 'node:path', 'fs', 'path', 'typescript'],
    noExternal: ['swagger2openapi', 'oazapfts'],
    target: 'node20',
    platform: 'node',
  },
];
