import { generate } from './generate';
import { ProgrammaticOptions } from './types';

/**
 * 프로그래밍 방식으로 MSW 핸들러를 생성합니다.
 *
 * @param options OpenAPI 문서 경로 및 출력 설정
 * @returns 생성된 핸들러 정보
 */
async function generateMocks(options: ProgrammaticOptions) {
  if (!options) {
    throw new Error('Options parameter is required');
  }
  
  const { input, outputDir = 'src/app/mocks', ...rest } = options;
  
  return generate(input, {
    input,
    outputDir,
    ...rest
  });
}

export { generateMocks };

export type { ProgrammaticOptions };

