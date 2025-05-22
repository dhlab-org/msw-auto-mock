import { HttpResponseResolver } from "msw";

export type ProgrammaticOptions<TControllers =Record<string, (info: Parameters<HttpResponseResolver>[0]) => Object | null>> = {
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
};