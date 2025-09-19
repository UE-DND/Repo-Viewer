/**
 * 配置管理器
 * 统一管理所有应用配置
 */

// 环境变量映射配置
// 定义哪些变量需要映射到VITE_前缀
const ENV_MAPPING = {
  // 站点配置
  SITE_TITLE: 'VITE_SITE_TITLE',
  SITE_DESCRIPTION: 'VITE_SITE_DESCRIPTION',
  SITE_KEYWORDS: 'VITE_SITE_KEYWORDS',
  SITE_OG_IMAGE: 'VITE_SITE_OG_IMAGE',

  // GitHub仓库配置
  GITHUB_REPO_OWNER: 'VITE_GITHUB_REPO_OWNER',
  GITHUB_REPO_NAME: 'VITE_GITHUB_REPO_NAME',
  GITHUB_REPO_BRANCH: 'VITE_GITHUB_REPO_BRANCH',

  // 功能配置
  HOMEPAGE_FILTER_ENABLED: 'VITE_HOMEPAGE_FILTER_ENABLED',
  HOMEPAGE_ALLOWED_FOLDERS: 'VITE_HOMEPAGE_ALLOWED_FOLDERS',
  HOMEPAGE_ALLOWED_FILETYPES: 'VITE_HOMEPAGE_ALLOWED_FILETYPES',
  HIDE_MAIN_FOLDER_DOWNLOAD: 'VITE_HIDE_MAIN_FOLDER_DOWNLOAD',
  HIDE_DOWNLOAD_FOLDERS: 'VITE_HIDE_DOWNLOAD_FOLDERS',

  // 代理配置
  DOWNLOAD_PROXY_URL: 'VITE_DOWNLOAD_PROXY_URL',
  DOWNLOAD_PROXY_URL_BACKUP1: 'VITE_DOWNLOAD_PROXY_URL_BACKUP1',
  DOWNLOAD_PROXY_URL_BACKUP2: 'VITE_DOWNLOAD_PROXY_URL_BACKUP2',

  // 访问配置
  USE_TOKEN_MODE: 'VITE_USE_TOKEN_MODE',

  // 开发者配置
  DEVELOPER_MODE: 'VITE_DEVELOPER_MODE',
  CONSOLE_LOGGING: 'VITE_CONSOLE_LOGGING'
} as const;

// 配置默认值
const CONFIG_DEFAULTS = {
  // 站点配置
  SITE_TITLE: 'Repo-Viewer',
  SITE_DESCRIPTION: '基于MD3设计语言的GitHub仓库浏览应用',
  SITE_KEYWORDS: 'GitHub, 仓库, 浏览器, 代码, 查看器',
  SITE_OG_IMAGE: '/icon.svg',

  // GitHub仓库配置
  GITHUB_REPO_OWNER: 'UE-DND',
  GITHUB_REPO_NAME: 'Repo-Viewer',
  GITHUB_REPO_BRANCH: 'master',

  // 代理配置
  DOWNLOAD_PROXY_URL: 'https://gh-proxy.com',
  DOWNLOAD_PROXY_URL_BACKUP1: 'https://ghproxy.com',
  DOWNLOAD_PROXY_URL_BACKUP2: 'https://raw.staticdn.net',

  // PAT配置
  PAT_PREFIXES: ['GITHUB_PAT', 'VITE_GITHUB_PAT'] as const,
  MAX_PAT_NUMBER: 10,
} as const;

const runtimeProcessEnv: Record<string, string | undefined> | undefined =
  typeof process !== 'undefined' && process.env ? process.env : undefined;

const normalizeEnvValue = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

// 支持从无前缀变量自动映射到VITE_前缀变量的解析函数
const resolveEnvWithMapping = (env: Record<string, any>, plainKey: string, fallback: string): string => {
  // 优先使用VITE_前缀的变量（如果存在）
  const viteKey = ENV_MAPPING[plainKey as keyof typeof ENV_MAPPING];
  if (viteKey) {
    const viteValue = normalizeEnvValue(env[viteKey]);
    if (viteValue) {
      return viteValue;
    }

    // 如果VITE_变量不存在，尝试使用无前缀变量
    const plainValue = normalizeEnvValue(env[plainKey]);
    if (plainValue) {
      return plainValue;
    }

    // 检查runtime环境变量
    if (runtimeProcessEnv) {
      const runtimeViteValue = normalizeEnvValue(runtimeProcessEnv[viteKey]);
      if (runtimeViteValue) {
        return runtimeViteValue;
      }

      const runtimePlainValue = normalizeEnvValue(runtimeProcessEnv[plainKey]);
      if (runtimePlainValue) {
        return runtimePlainValue;
      }
    }
  }

  return fallback;
};

const hasEnvValue = (env: Record<string, any>, keys: string[]): boolean => {
  for (const key of keys) {
    if (normalizeEnvValue(env[key])) {
      return true;
    }
  }

  if (runtimeProcessEnv) {
    for (const key of keys) {
      if (normalizeEnvValue(runtimeProcessEnv[key])) {
        return true;
      }
    }
  }

  return false;
};


// 环境变量解析工具
class EnvParser {
  static parseBoolean(value: string | undefined): boolean {
    return value === 'true';
  }

  static parseStringArray(value: string | undefined): string[] {
    if (!value) return [];
    return value.split(',').filter(Boolean).map(item => item.trim());
  }

  static validateToken(token: any): token is string {
    return typeof token === 'string' &&
           token.trim().length > 0 &&
           token.trim() !== 'your_token_here' &&
           !token.includes('placeholder');
  }
}

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
  };
  proxy: {
    imageProxyUrl: string;
    imageProxyUrlBackup1: string;
    imageProxyUrlBackup2: string;
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

/**
 * 配置管理器 - 单例模式
 */
class ConfigManager {
  private static instance: ConfigManager | null = null;
  private config: Config | null = null;
  private listeners: Set<ConfigChangeListener> = new Set();

  private constructor() {}

  static getInstance(): ConfigManager {
    if (!this.instance) {
      this.instance = new ConfigManager();
    }
    return this.instance;
  }

  // 获取配置
  getConfig(): Config {
    if (!this.config) {
      this.config = this.loadConfig();
    }
    return this.config;
  }

  // 重新加载配置
  reloadConfig(): Config {
    const oldConfig = this.config;
    this.config = this.loadConfig();

    if (oldConfig) {
      this.notifyConfigChange(this.config, oldConfig);
    }

    return this.config;
  }

  // 配置变更监听
  onConfigChange(listener: ConfigChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // 通知配置变更
  private notifyConfigChange(newConfig: Config, oldConfig: Config): void {
    this.listeners.forEach(listener => {
      try {
        listener(newConfig, oldConfig);
      } catch (error) {
        console.error('配置变更监听器执行失败:', error);
      }
    });
  }

  // 从环境变量加载配置
  private loadConfig(): Config {
    const env = typeof window !== 'undefined' ? import.meta.env : process.env;

    return {
      site: {
        title: resolveEnvWithMapping(env, 'SITE_TITLE', CONFIG_DEFAULTS.SITE_TITLE),
        description: resolveEnvWithMapping(env, 'SITE_DESCRIPTION', CONFIG_DEFAULTS.SITE_DESCRIPTION),
        keywords: resolveEnvWithMapping(env, 'SITE_KEYWORDS', CONFIG_DEFAULTS.SITE_KEYWORDS),
        ogImage: resolveEnvWithMapping(env, 'SITE_OG_IMAGE', CONFIG_DEFAULTS.SITE_OG_IMAGE)
      },
      github: {
        repoOwner: resolveEnvWithMapping(env, 'GITHUB_REPO_OWNER', CONFIG_DEFAULTS.GITHUB_REPO_OWNER),
        repoName: resolveEnvWithMapping(env, 'GITHUB_REPO_NAME', CONFIG_DEFAULTS.GITHUB_REPO_NAME),
        repoBranch: resolveEnvWithMapping(env, 'GITHUB_REPO_BRANCH', CONFIG_DEFAULTS.GITHUB_REPO_BRANCH)
      },
      features: {
        homepageFilter: {
          enabled: EnvParser.parseBoolean(resolveEnvWithMapping(env, 'HOMEPAGE_FILTER_ENABLED', 'false')),
          allowedFolders: EnvParser.parseStringArray(resolveEnvWithMapping(env, 'HOMEPAGE_ALLOWED_FOLDERS', '')),
          allowedFileTypes: EnvParser.parseStringArray(resolveEnvWithMapping(env, 'HOMEPAGE_ALLOWED_FILETYPES', ''))
        },
        hideDownload: {
          enabled: EnvParser.parseBoolean(resolveEnvWithMapping(env, 'HIDE_MAIN_FOLDER_DOWNLOAD', 'false')),
          hiddenFolders: EnvParser.parseStringArray(resolveEnvWithMapping(env, 'HIDE_DOWNLOAD_FOLDERS', ''))
        }
      },
      proxy: {
        imageProxyUrl: resolveEnvWithMapping(env, 'DOWNLOAD_PROXY_URL', CONFIG_DEFAULTS.DOWNLOAD_PROXY_URL),
        imageProxyUrlBackup1: resolveEnvWithMapping(env, 'DOWNLOAD_PROXY_URL_BACKUP1', CONFIG_DEFAULTS.DOWNLOAD_PROXY_URL_BACKUP1),
        imageProxyUrlBackup2: resolveEnvWithMapping(env, 'DOWNLOAD_PROXY_URL_BACKUP2', CONFIG_DEFAULTS.DOWNLOAD_PROXY_URL_BACKUP2)
      },
      access: {
        useTokenMode: EnvParser.parseBoolean(resolveEnvWithMapping(env, 'USE_TOKEN_MODE', 'false'))
      },
      developer: {
        mode: EnvParser.parseBoolean(resolveEnvWithMapping(env, 'DEVELOPER_MODE', 'false')),
        consoleLogging: EnvParser.parseBoolean(resolveEnvWithMapping(env, 'CONSOLE_LOGGING', 'true'))
      },
      runtime: {
        isDev: env.DEV === true,
        isProd: env.PROD === true
      },
      tokens: this.loadTokens(env)
    };
  }

  // 加载Token配置
  private loadTokens(env: Record<string, any>): Config['tokens'] {
    const tokens: string[] = [];

    CONFIG_DEFAULTS.PAT_PREFIXES.forEach(prefix => {
      // 检查不带数字的版本
      const baseToken = env[prefix];
      if (baseToken && EnvParser.validateToken(baseToken)) {
        tokens.push(baseToken.trim());
      }

      // 检查带数字的版本
      for (let i = 1; i <= CONFIG_DEFAULTS.MAX_PAT_NUMBER; i++) {
        const tokenKey = `${prefix}${i}`;
        const token = env[tokenKey];
        if (token && EnvParser.validateToken(token)) {
          tokens.push(token.trim());
        }
      }
    });

    const uniqueTokens = [...new Set(tokens)];
    return {
      githubPATs: uniqueTokens,
      totalCount: uniqueTokens.length
    };
  }

  // 获取用于 Vite define 的 PAT 对象
  getPATsForViteDefine(env?: Record<string, any>): Record<string, string> {
    const envSource = env || process.env;
    const patEnvVars: Record<string, string> = {};

    CONFIG_DEFAULTS.PAT_PREFIXES.forEach(prefix => {
      // 检查不带数字的版本
      const baseToken = envSource[prefix];
      if (baseToken && EnvParser.validateToken(baseToken)) {
        patEnvVars[`process.env.${prefix}`] = JSON.stringify(baseToken);
      }

      // 检查带数字的版本
      for (let i = 1; i <= CONFIG_DEFAULTS.MAX_PAT_NUMBER; i++) {
        const tokenKey = `${prefix}${i}`;
        const token = envSource[tokenKey];
        if (token && EnvParser.validateToken(token)) {
          patEnvVars[`process.env.${tokenKey}`] = JSON.stringify(token);
        }
      }
    });

    return patEnvVars;
  }

  // 获取调试信息
  getDebugInfo(): ConfigDebugInfo {
    const config = this.getConfig();
    const env = typeof window !== 'undefined' ? import.meta.env : process.env;

    // 生成token源信息
    const tokenSources: Array<{key: string; hasValue: boolean; isValid: boolean}> = [];
    CONFIG_DEFAULTS.PAT_PREFIXES.forEach(prefix => {
      // 检查不带数字的版本
      const baseToken = env[prefix];
      tokenSources.push({
        key: prefix,
        hasValue: !!baseToken,
        isValid: EnvParser.validateToken(baseToken)
      });

      // 检查带数字的版本
      for (let i = 1; i <= CONFIG_DEFAULTS.MAX_PAT_NUMBER; i++) {
        const tokenKey = `${prefix}${i}`;
        const token = env[tokenKey];
        tokenSources.push({
          key: tokenKey,
          hasValue: !!token,
          isValid: EnvParser.validateToken(token)
        });
      }
    });

    return {
      loadedAt: new Date().toISOString(),
      environment: config.runtime.isDev ? 'development' : 'production',
      configSummary: {
        siteTitle: config.site.title,
        repoOwner: config.github.repoOwner,
        repoName: config.github.repoName,
        developerMode: config.developer.mode,
        tokenMode: config.access.useTokenMode,
        tokenCount: config.tokens.totalCount
      },
      envVarStatus: {
        VITE_SITE_TITLE: hasEnvValue(env, ['VITE_SITE_TITLE']),
        VITE_GITHUB_REPO_OWNER: hasEnvValue(env, ['VITE_GITHUB_REPO_OWNER']),
        GITHUB_REPO_OWNER: hasEnvValue(env, ['GITHUB_REPO_OWNER']),
        VITE_GITHUB_REPO_NAME: hasEnvValue(env, ['VITE_GITHUB_REPO_NAME']),
        GITHUB_REPO_NAME: hasEnvValue(env, ['GITHUB_REPO_NAME']),
        VITE_GITHUB_REPO_BRANCH: hasEnvValue(env, ['VITE_GITHUB_REPO_BRANCH']),
        GITHUB_REPO_BRANCH: hasEnvValue(env, ['GITHUB_REPO_BRANCH']),
        VITE_DEVELOPER_MODE: hasEnvValue(env, ['VITE_DEVELOPER_MODE']),
        VITE_USE_TOKEN_MODE: hasEnvValue(env, ['VITE_USE_TOKEN_MODE'])
      },
      tokenSources: tokenSources.filter(source => source.hasValue)
    };
  }
}

// 导出配置管理器实例
export const configManager = ConfigManager.getInstance();

// 导出工具类
export { EnvParser };

// 便捷访问函数
export const getConfig = () => configManager.getConfig();
export const getSiteConfig = () => getConfig().site;
export const getGithubConfig = () => getConfig().github;
export const getFeaturesConfig = () => getConfig().features;
export const getProxyConfig = () => getConfig().proxy;
export const getAccessConfig = () => getConfig().access;
export const getDeveloperConfig = () => getConfig().developer;
export const getRuntimeConfig = () => getConfig().runtime;
export const getTokensConfig = () => getConfig().tokens;

// 特殊便捷函数
export const isDeveloperMode = () => getConfig().developer.mode;
export const isTokenMode = () => getConfig().access.useTokenMode;
export const isDevEnvironment = () => getConfig().runtime.isDev;
export const getGithubPATs = () => getConfig().tokens.githubPATs;
