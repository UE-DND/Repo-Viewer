export interface Config {
  site: {
    title: string;
    description: string;
    keywords: string;
    ogImage: string;
  };
  github: {
    repoOwner: string;
    repoName: string;
    repoBranch: string;
  };
  features: {
    homepageFilter: {
      enabled: boolean;
      allowedFolders: string[];
      allowedFileTypes: string[];
    };
    hideDownload: {
      enabled: boolean;
      hiddenFolders: string[];
    };
  };
  proxy: {
    imageProxyUrl: string;
    imageProxyUrlBackup1: string;
    imageProxyUrlBackup2: string;
    healthCheckTimeout: number;
    validationTimeout: number;
    healthCheckInterval: number;
    recoveryTime: number;
  };
  access: {
    useTokenMode: boolean;
  };
  developer: {
    mode: boolean;
    consoleLogging: boolean;
  };
  runtime: {
    isDev: boolean;
    isProd: boolean;
  };
  tokens: {
    githubPATs: string[];
    totalCount: number;
  };
}

export type ConfigChangeListener = (newConfig: Config, oldConfig: Config) => void;
export interface ConfigDebugInfo {
  loadedAt: string;
  environment: 'development' | 'production';
  configSummary: {
    siteTitle: string;
    repoOwner: string;
    repoName: string;
    developerMode: boolean;
    tokenMode: boolean;
    tokenCount: number;
  };
  envVarStatus: Record<string, boolean>;
  tokenSources: {key: string; hasValue: boolean; isValid: boolean}[];
}
export interface EnvMappingOptions {
  isProdLike?: boolean;
}
