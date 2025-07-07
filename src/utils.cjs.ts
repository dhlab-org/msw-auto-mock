import fs from 'node:fs/promises';
import path from 'node:path';
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

export const writeFile = async (filePath: string, content: string) => {
  const prettifiedContent = await prettify(content);
  const directory = path.dirname(filePath);
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(filePath, prettifiedContent);
};
