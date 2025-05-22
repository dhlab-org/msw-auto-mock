import { groupBy } from 'es-toolkit';
import path from 'path';
import { ControllerType } from './generator/controller-type';
import { Handler } from './generator/handler';
import { MSWServer } from './generator/msw-server';
import { Operation } from './generator/operation';
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
  const groupByEntity = groupBy(operationCollection, it => it.path.split('/')[1]);

  const outputFolder = options.outputDir || 'src/app/mocks';
  const targetFolder = path.resolve(process.cwd(), outputFolder);

  await new Handler(options, groupByEntity, apiDoc).generate(targetFolder);
  await new MSWServer(options.environment).generate(targetFolder);
  await new ControllerType(groupByEntity).generate(targetFolder);

  return {
    operationCollection,
    targetFolder,
  };
}

export { generateMocks };

export type { TOptions };
