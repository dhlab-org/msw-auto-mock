import { HttpResponseResolver } from 'msw';
import { OpenAPIV3 } from 'openapi-types';

export type TOptions<TControllers = Record<string, (info: Parameters<HttpResponseResolver>[0]) => Object | null>> = {
  input: string;
  outputDir?: string;
  maxArrayLength?: number;
  includes?: string;
  excludes?: string;
  baseUrl?: string | true;
  codes?: string;
  static?: boolean;
  /**
   * 생성할 mock 파일의 환경 설정
   * - next: node.js와 브라우저 환경을 위한 mock 파일 생성
   * - react: 브라우저 환경을 위한 mock 파일 생성
   * - react-native: React Native 환경을 위한 mock 파일 생성
   */
  environment?: 'next' | 'react' | 'react-native';

  /**
   * 사용자 정의 응답 컨트롤러
   * 컨트롤러 안에 응답 함수의 이름과 일치하는 함수가 있는 경우, fake.js 응답 대신 컨트롤러 함수를 호출
   */
  controllers?: TControllers;
  /**
   * 컨트롤러 import시 사용될 경로
   * default: '@/app/mocks/controllers'
   */
  controllerPath?: string;
  /**
   * 엔티티 분류에 사용할 URL 경로 인덱스
   * default: 1
   */
  entityPathIndex?: number;
  /**
   * 실제 API 서버로 요청을 우선 시도하고, 404 에러인 경우에만 모킹 응답을 반환
   * true인 경우 실제 서버 응답을 우선으로 사용하고, 404일 때만 mock 데이터 사용
   * default: false
   */
  bypass?: boolean;
};

export type TOperation = {
  verb: string;
  path: string;
  request: OpenAPIV3.OperationObject['requestBody'];
  parameters: OpenAPIV3.OperationObject['parameters'];
  response: TResponse[];
};

export type TResponse = {
  code: string;
  id: string;
  responses?: Record<string, OpenAPIV3.SchemaObject>;
};
