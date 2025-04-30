export interface ProgrammaticOptions {
  input: string;
  outputDir?: string;
  maxArrayLength?: number;
  includes?: string;
  excludes?: string;
  baseUrl?: string | true;
  codes?: string;
  static?: boolean;
  typescript?: boolean;
  /**
   * 엔티티 분류에 사용할 URL 경로의 인덱스
   */
  moduleIndex?: number;
  /**
   * 생성할 mock 파일의 환경 설정
   * - next: node.js와 브라우저 환경을 위한 mock 파일 생성
   * - react: 브라우저 환경을 위한 mock 파일 생성
   * - react-native: React Native 환경을 위한 mock 파일 생성
   */
  environment?: 'next' | 'react' | 'react-native';
}

export type ConfigOptions = ProgrammaticOptions & {
  typescript?: boolean;
  ai?: {
    enable?: boolean;
    provider: 'openai' | 'azure' | 'anthropic';
    openai?: {
      baseURL?: string;
      /**
       * defaults to `OPENAI_API_KEY`
       */
      apiKey?: string;
      model?: string;
    };
    azure?: {
      /**
       * defaults to `AZURE_API_KEY`
       */
      apiKey?: string;
      resource?: string;
      deployment?: string;
    };
    anthropic?: {
      /**
       * defaults to `ANTHROPIC_API_KEY`
       */
      apiKey?: string;
      model?: string;
    };
  };
};

export type FileExtension = '.ts' | '.js';
