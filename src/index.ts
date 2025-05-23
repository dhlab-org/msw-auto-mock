import { groupBy } from 'es-toolkit';
import path from 'path';
import { TypeDefinitionGenerator } from './type-definition-generator';
import { HandlerGenerator } from './handler-generator';
import { MSWServerGenerator } from './msw-server-generator';
import { Operation } from './operation';
import { Swagger } from './swagger';
import { TOptions } from './types';

/**
 * 프로그래밍 방식으로 MSW 핸들러를 생성합니다.
 *
 * @param options OpenAPI 문서 경로 및 출력 설정
 * @returns 생성된 핸들러 정보
 */
async function generateMocks(options: TOptions) {
  if (!options) {
    throw new Error('Options parameter is required');
  }

  const apiDoc = await new Swagger(options.input).document;
  const operationCollection = new Operation(apiDoc, options).collection();
  const operationsByEntity = groupBy(operationCollection, it => it.path.split('/')[1]);

  const outputFolder = options.outputDir || 'src/app/mocks';
  const targetFolder = path.resolve(process.cwd(), outputFolder);

  await new HandlerGenerator(options, operationsByEntity, apiDoc).generate(targetFolder);
  await new MSWServerGenerator(options.environment).generate(targetFolder);
  await new TypeDefinitionGenerator(operationsByEntity).generate(targetFolder);

  return {
    operationCollection,
    targetFolder,
  };
}

export { generateMocks };

export type { TOptions };
