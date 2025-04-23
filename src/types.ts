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
  moduleIndex?: number; // 엔티티 분류에 사용할 URL 경로의 인덱스
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
