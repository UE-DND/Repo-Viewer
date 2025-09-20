/**
 * 配置管理器核心类
 * 单例模式的配置管理
 */

import type { Config, ConfigChangeListener, ConfigDebugInfo } from '../types';
import { CONFIG_DEFAULTS } from '../constants';
import { EnvParser } from '../utils/env-parser';
import { resolveEnvWithMapping, hasEnvValue } from '../utils/env-mapping';

/**
 * 配置管理器 - 单例模式
 */
export class ConfigManager {
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

  getConfig(): Config {
    if (!this.config) {
      this.config = this.loadConfig();
    }
    return this.config;
  }

  reloadConfig(): Config {
    const oldConfig = this.config;
    this.config = this.loadConfig();

    if (oldConfig) {
      this.notifyConfigChange(this.config, oldConfig);
    }

    return this.config;
  }

  onConfigChange(listener: ConfigChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyConfigChange(newConfig: Config, oldConfig: Config): void {
    this.listeners.forEach(listener => {
      try {
        listener(newConfig, oldConfig);
      } catch (error) {
        console.error('配置变更监听器执行失败:', error);
      }
    });
  }

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
        },
        search: {
          enabled: EnvParser.parseBoolean(resolveEnvWithMapping(env, 'SEARCH_INDEX_ENABLED', CONFIG_DEFAULTS.SEARCH_INDEX_ENABLED)),
          basePath: resolveEnvWithMapping(env, 'SEARCH_INDEX_BASE_PATH', CONFIG_DEFAULTS.SEARCH_INDEX_BASE_PATH),
          fallbackRawUrl: resolveEnvWithMapping(env, 'SEARCH_INDEX_FALLBACK_RAW_URL', CONFIG_DEFAULTS.SEARCH_INDEX_FALLBACK_RAW_URL),
          maxResults: EnvParser.parseInteger(
            resolveEnvWithMapping(env, 'SEARCH_INDEX_MAX_RESULTS', CONFIG_DEFAULTS.SEARCH_INDEX_MAX_RESULTS),
            200
          ),
          branch: resolveEnvWithMapping(env, 'SEARCH_INDEX_BRANCH', CONFIG_DEFAULTS.SEARCH_INDEX_BRANCH),
          manifestPath: resolveEnvWithMapping(env, 'SEARCH_INDEX_MANIFEST_PATH', CONFIG_DEFAULTS.SEARCH_INDEX_MANIFEST_PATH)
        }
      },
      proxy: {
        imageProxyUrl: resolveEnvWithMapping(env, 'DOWNLOAD_PROXY_URL', CONFIG_DEFAULTS.DOWNLOAD_PROXY_URL),
        imageProxyUrlBackup1: resolveEnvWithMapping(env, 'DOWNLOAD_PROXY_URL_BACKUP1', CONFIG_DEFAULTS.DOWNLOAD_PROXY_URL_BACKUP1),
        imageProxyUrlBackup2: resolveEnvWithMapping(env, 'DOWNLOAD_PROXY_URL_BACKUP2', CONFIG_DEFAULTS.DOWNLOAD_PROXY_URL_BACKUP2),
        healthCheckTimeout: 5000,
        validationTimeout: 10000,
        healthCheckInterval: 30000,
        recoveryTime: 300000
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

  private loadTokens(env: Record<string, any>): Config['tokens'] {
    const tokens: string[] = [];

    CONFIG_DEFAULTS.PAT_PREFIXES.forEach(prefix => {
      const baseToken = env[prefix];
      if (baseToken && EnvParser.validateToken(baseToken)) {
        tokens.push(baseToken.trim());
      }

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

  getPATsForViteDefine(env?: Record<string, any>): Record<string, string> {
    const envSource = env || process.env;
    const patEnvVars: Record<string, string> = {};

    CONFIG_DEFAULTS.PAT_PREFIXES.forEach(prefix => {
      const baseToken = envSource[prefix];
      if (baseToken && EnvParser.validateToken(baseToken)) {
        patEnvVars[`process.env.${prefix}`] = JSON.stringify(baseToken);
      }

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

  getDebugInfo(): ConfigDebugInfo {
    const config = this.getConfig();
    const env = typeof window !== 'undefined' ? import.meta.env : process.env;

    const tokenSources: Array<{ key: string; hasValue: boolean; isValid: boolean }> = [];
    CONFIG_DEFAULTS.PAT_PREFIXES.forEach(prefix => {
      const baseToken = env[prefix];
      tokenSources.push({
        key: prefix,
        hasValue: !!baseToken,
        isValid: EnvParser.validateToken(baseToken)
      });

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
        VITE_DEVELOPER_MODE: hasEnvValue(env, ['VITE_DEVELOPER_MODE']),
        VITE_USE_TOKEN_MODE: hasEnvValue(env, ['VITE_USE_TOKEN_MODE']),
        VITE_SEARCH_INDEX_ENABLED: hasEnvValue(env, ['VITE_SEARCH_INDEX_ENABLED']),
        VITE_SEARCH_INDEX_BASE_PATH: hasEnvValue(env, ['VITE_SEARCH_INDEX_BASE_PATH'])
      },
      tokenSources: tokenSources.filter(source => source.hasValue)
    };
  }
}

// 导出配置管理器实例
export const configManager = ConfigManager.getInstance();

