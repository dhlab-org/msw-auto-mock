import fs from 'node:fs/promises';
import path from 'node:path';
import { camelCase } from 'es-toolkit';
import prettier from 'prettier';

async function prettify(content: string): Promise<string> {
  const config = await prettier.resolveConfig(process.cwd(), {
    useCache: true,
    editorconfig: true,
  });

  try {
    return prettier.format(content, {
      parser: 'typescript',
      ...config,
      plugins: [],
    });
  } catch (_e) {
    // ignore error
    return content;
  }
}

export const toExpressLikePath = (path: string) =>
  // use `.+?` for lazy match
  path.replace(/{(.+?)}/g, (_match, p1: string) => `:${camelCase(p1)}`);

export const isValidRegExp = (pattern: string): boolean => {
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
};

export const writeFile = async (filePath: string, content: string) => {
  const prettifiedContent = await prettify(content);
  const directory = path.dirname(filePath);
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(filePath, prettifiedContent);
};
