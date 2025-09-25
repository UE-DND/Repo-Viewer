/**
 * 配置管理器类型定义
 */

// 配置接口定义
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
    search: {
      enabled: boolean;
      basePath: string;
      fallbackRawUrl: string;
      maxResults: number;
      branch: string;
      manifestPath: string;
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

// 配置变更监听器类型
export type ConfigChangeListener = (newConfig: Config, oldConfig: Config) => void;

// 调试信息接口
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
  tokenSources: Array<{key: string; hasValue: boolean; isValid: boolean}>;
}

// 环境变量映射选项
export interface EnvMappingOptions {
  isProdLike?: boolean;
}
