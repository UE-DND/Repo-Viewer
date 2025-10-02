/**
 * 配置管理器核心类
 * 单例模式的配置管理
 */

import type { Config, ConfigChangeListener, ConfigDebugInfo } from '../types';
import { CONFIG_DEFAULTS } from '../constants';
import { EnvParser } from '../utils/env-parser';
import { resolveEnvWithMapping, hasEnvValue } from '../utils/env-mapping';

type EnvSourceValue = string | boolean | null | undefined;
type EnvSource = Record<string, EnvSourceValue>;
type EnvStringRecord = Record<string, string | undefined>;

/**
 * 配置管理器 - 单例模式
 */
export class ConfigManager {
  private static instance: ConfigManager | null = null;
  private config: Config | null = null;
  private listeners: Set<ConfigChangeListener>;

  private constructor() {
    this.listeners = new Set<ConfigChangeListener>();
  }

  static getInstance(): ConfigManager {
    this.instance ??= new ConfigManager();
    return this.instance;
  }

  // 获取配置
  getConfig(): Config {
    this.config ??= this.loadConfig();
    return this.config;
  }

  // 重新加载配置
  reloadConfig(): Config {
    const oldConfig = this.config;
    this.config = this.loadConfig();

    if (oldConfig !== null) {
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
        const developerConfig = this.getConfig().developer;
        if (developerConfig.mode || developerConfig.consoleLogging) {
          console.error('配置变更监听器执行失败:', error);
        }
      }
    });
  }

  // 从环境变量加载配置
  private loadConfig(): Config {
    const env = this.getEnvSource();
    const stringEnv = this.getStringEnvRecord(env);
    const developerMode = EnvParser.parseBoolean(
      resolveEnvWithMapping(stringEnv, 'DEVELOPER_MODE', 'false')
    );
    const consoleLogging = EnvParser.parseBoolean(
      resolveEnvWithMapping(stringEnv, 'CONSOLE_LOGGING', 'false')
    );

    return {
      site: {
        title: resolveEnvWithMapping(stringEnv, 'SITE_TITLE', CONFIG_DEFAULTS.SITE_TITLE),
        description: resolveEnvWithMapping(stringEnv, 'SITE_DESCRIPTION', CONFIG_DEFAULTS.SITE_DESCRIPTION),
        keywords: resolveEnvWithMapping(stringEnv, 'SITE_KEYWORDS', CONFIG_DEFAULTS.SITE_KEYWORDS),
        ogImage: resolveEnvWithMapping(stringEnv, 'SITE_OG_IMAGE', CONFIG_DEFAULTS.SITE_OG_IMAGE)
      },
      github: {
        repoOwner: resolveEnvWithMapping(stringEnv, 'GITHUB_REPO_OWNER', CONFIG_DEFAULTS.GITHUB_REPO_OWNER),
        repoName: resolveEnvWithMapping(stringEnv, 'GITHUB_REPO_NAME', CONFIG_DEFAULTS.GITHUB_REPO_NAME),
        repoBranch: resolveEnvWithMapping(stringEnv, 'GITHUB_REPO_BRANCH', CONFIG_DEFAULTS.GITHUB_REPO_BRANCH)
      },
      features: {
        homepageFilter: {
          enabled: EnvParser.parseBoolean(resolveEnvWithMapping(stringEnv, 'HOMEPAGE_FILTER_ENABLED', 'false')),
          allowedFolders: EnvParser.parseStringArray(resolveEnvWithMapping(stringEnv, 'HOMEPAGE_ALLOWED_FOLDERS', '')),
          allowedFileTypes: EnvParser.parseStringArray(resolveEnvWithMapping(stringEnv, 'HOMEPAGE_ALLOWED_FILETYPES', ''))
        },
        hideDownload: {
          enabled: EnvParser.parseBoolean(resolveEnvWithMapping(stringEnv, 'HIDE_MAIN_FOLDER_DOWNLOAD', 'false')),
          hiddenFolders: EnvParser.parseStringArray(resolveEnvWithMapping(stringEnv, 'HIDE_DOWNLOAD_FOLDERS', ''))
        }
      },
      proxy: {
        imageProxyUrl: resolveEnvWithMapping(stringEnv, 'DOWNLOAD_PROXY_URL', CONFIG_DEFAULTS.DOWNLOAD_PROXY_URL),
        imageProxyUrlBackup1: resolveEnvWithMapping(stringEnv, 'DOWNLOAD_PROXY_URL_BACKUP1', CONFIG_DEFAULTS.DOWNLOAD_PROXY_URL_BACKUP1),
        imageProxyUrlBackup2: resolveEnvWithMapping(stringEnv, 'DOWNLOAD_PROXY_URL_BACKUP2', CONFIG_DEFAULTS.DOWNLOAD_PROXY_URL_BACKUP2),
        // 代理超时配置 - 内部默认值（毫秒）
        healthCheckTimeout: 5000,
        validationTimeout: 10000,    // 代理验证超时：10秒
        healthCheckInterval: 30000,  // 健康检查间隔：30秒
        recoveryTime: 300000         // 代理恢复时间：5分钟
      },
      access: {
        useTokenMode: EnvParser.parseBoolean(resolveEnvWithMapping(stringEnv, 'USE_TOKEN_MODE', 'false'))
      },
      developer: {
        mode: developerMode,
        consoleLogging
      },
      runtime: {
        isDev: this.getBooleanFlag(env, 'DEV'),
        isProd: this.getBooleanFlag(env, 'PROD')
      },
      tokens: this.loadTokens(env)
    };
  }

  // 加载Token配置
  private loadTokens(env: EnvSource): Config['tokens'] {
    const tokens: string[] = [];

    CONFIG_DEFAULTS.PAT_PREFIXES.forEach(prefix => {
      // 检查不带数字的版本
      const baseToken = this.getEnvString(env, prefix);
      if (baseToken !== undefined && EnvParser.validateToken(baseToken)) {
        tokens.push(baseToken.trim());
      }

      // 检查带数字的版本
      for (let i = 1; i <= CONFIG_DEFAULTS.MAX_PAT_NUMBER; i++) {
        const tokenKey = prefix + String(i);
        const token = this.getEnvString(env, tokenKey);
        if (token !== undefined && EnvParser.validateToken(token)) {
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
  getPATsForViteDefine(env?: EnvSource): Record<string, string> {
    const processEnv = this.getProcessEnv();
    const envSource: EnvSource = env ?? processEnv ?? {};
    const patEnvVars: Record<string, string> = {};

    CONFIG_DEFAULTS.PAT_PREFIXES.forEach(prefix => {
      // 检查不带数字的版本
      const baseToken = this.getEnvString(envSource, prefix);
      if (baseToken !== undefined && EnvParser.validateToken(baseToken)) {
        patEnvVars[`process.env.${prefix}`] = JSON.stringify(baseToken);
      }

      // 检查带数字的版本
      for (let i = 1; i <= CONFIG_DEFAULTS.MAX_PAT_NUMBER; i++) {
        const tokenKey = prefix + String(i);
        const token = this.getEnvString(envSource, tokenKey);
        if (token !== undefined && EnvParser.validateToken(token)) {
          patEnvVars[`process.env.${tokenKey}`] = JSON.stringify(token);
        }
      }
    });

    return patEnvVars;
  }

  // 获取调试信息
  getDebugInfo(): ConfigDebugInfo {
    const config = this.getConfig();
    const env = this.getEnvSource();
    const stringEnv = this.getStringEnvRecord(env);

    // 生成token源信息
    const tokenSources: {key: string; hasValue: boolean; isValid: boolean}[] = [];
    CONFIG_DEFAULTS.PAT_PREFIXES.forEach(prefix => {
      const baseToken = this.getEnvString(env, prefix);
      tokenSources.push({
        key: prefix,
        hasValue: baseToken !== undefined,
        isValid: baseToken !== undefined && EnvParser.validateToken(baseToken)
      });

      // 检查带数字的版本
      for (let i = 1; i <= CONFIG_DEFAULTS.MAX_PAT_NUMBER; i++) {
        const tokenKey = prefix + String(i);
        const token = this.getEnvString(env, tokenKey);
        tokenSources.push({
          key: tokenKey,
          hasValue: token !== undefined,
          isValid: token !== undefined && EnvParser.validateToken(token)
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
        VITE_SITE_TITLE: hasEnvValue(stringEnv, ['VITE_SITE_TITLE']),
        VITE_GITHUB_REPO_OWNER: hasEnvValue(stringEnv, ['VITE_GITHUB_REPO_OWNER']),
        GITHUB_REPO_OWNER: hasEnvValue(stringEnv, ['GITHUB_REPO_OWNER']),
        VITE_GITHUB_REPO_NAME: hasEnvValue(stringEnv, ['VITE_GITHUB_REPO_NAME']),
        GITHUB_REPO_NAME: hasEnvValue(stringEnv, ['GITHUB_REPO_NAME']),
        VITE_GITHUB_REPO_BRANCH: hasEnvValue(stringEnv, ['VITE_GITHUB_REPO_BRANCH']),
        GITHUB_REPO_BRANCH: hasEnvValue(stringEnv, ['GITHUB_REPO_BRANCH']),
        VITE_DEVELOPER_MODE: hasEnvValue(stringEnv, ['VITE_DEVELOPER_MODE']),
        VITE_USE_TOKEN_MODE: hasEnvValue(stringEnv, ['VITE_USE_TOKEN_MODE'])
      },
      tokenSources: tokenSources.filter(source => source.hasValue)
    };
  }

  private getEnvSource(): EnvSource {
    if (typeof window !== 'undefined') {
      return import.meta.env as unknown as EnvSource;
    }
    const processEnv = this.getProcessEnv();
    if (processEnv !== undefined) {
      return processEnv;
    }
    return {};
  }

  private getProcessEnv(): EnvSource | undefined {
    const globalProcess = (globalThis as { process?: { env?: unknown } }).process;
    if (globalProcess !== undefined && typeof globalProcess.env === 'object' && globalProcess.env !== null) {
      return globalProcess.env as EnvSource;
    }
    return undefined;
  }

  private getStringEnvRecord(env: EnvSource): EnvStringRecord {
    const result: EnvStringRecord = {};
    Object.keys(env).forEach(key => {
      const value = env[key];
      if (typeof value === 'string') {
        result[key] = value;
      }
    });
    return result;
  }

  private getEnvString(env: EnvSource, key: string): string | undefined {
    const value = env[key];
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private getBooleanFlag(env: EnvSource, key: string): boolean {
    const value = env[key];
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') {
        return true;
      }
      if (normalized === 'false') {
        return false;
      }
    }
    return false;
  }
}

// 导出配置管理器实例
export const configManager = ConfigManager.getInstance();