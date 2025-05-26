import path from 'path';
import { HandlerGenerator } from './handler/generator';
import { MSWServerGenerator } from './msw-server/generator';
import { TypeDefinitionGenerator } from './type-definition/generator';
import { ApiEndpoint } from './apiEndpoint';
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

  const swagger = await Swagger.load(options.input);
  const apiEndpoint = new ApiEndpoint(swagger, options);

  const outputFolder = options.outputDir || 'src/app/mocks';
  const targetFolder = path.resolve(process.cwd(), outputFolder);

  await new HandlerGenerator(options, apiEndpoint, swagger).generate(targetFolder);
  await new MSWServerGenerator(options.environment).generate(targetFolder);
  await new TypeDefinitionGenerator(apiEndpoint).generate(targetFolder);

  return {
    apiEndpoint,
    targetFolder,
  };
}

export { generateMocks, type TOptions };
