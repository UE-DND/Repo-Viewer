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
  private hotReloadEnabled = false;
  private hotReloadHandler: (() => void) | null = null;

  private constructor() {
    this.listeners = new Set<ConfigChangeListener>();
  }

  /**
   * 获取ConfigManager单例实例
   *
   * @returns ConfigManager实例
   */
  static getInstance(): ConfigManager {
    this.instance ??= new ConfigManager();
    return this.instance;
  }

  /**
   * 重置单例实例（用于测试）
   *
   * 在测试环境中重置单例实例，确保每个测试的独立性。
   *
   * @warning 仅在测试环境中使用，生产环境不应调用此方法
   */
  static resetInstance(): void {
    ConfigManager.instance = null;
  }

  /**
   * 检查是否已创建实例
   *
   * @returns 如果实例已创建返回 true
   */
  static hasInstance(): boolean {
    return ConfigManager.instance !== null;
  }

  /**
   * 获取配置
   *
   * 获取当前加载的配置对象，如果未加载则自动加载。
   *
   * @returns 完整的配置对象
   */
  getConfig(): Config {
    this.config ??= this.loadConfig();
    return this.config;
  }

  /**
   * 重新加载配置
   *
   * 从环境变量重新加载配置，并通知所有监听器。
   *
   * @returns 重新加载后的配置对象
   */
  reloadConfig(): Config {
    const oldConfig = this.config;
    this.config = this.loadConfig();

    if (oldConfig !== null) {
      this.notifyConfigChange(this.config, oldConfig);
    }

    return this.config;
  }

  /**
   * 监听配置变更
   *
   * 注册配置变更监听器，当配置更新时会被调用。
   *
   * @param listener - 配置变更监听器函数
   * @returns 取消监听的函数
   */
  onConfigChange(listener: ConfigChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 启用配置热更新
   *
   * 在开发环境中启用配置热更新功能。
   * 监听自定义 'config:reload' 事件来触发配置重载。
   *
   * @returns void
   *
   * @example
   * // 手动触发配置重载：
   * window.dispatchEvent(new CustomEvent('config:reload'));
   */
  enableHotReload(): void {
    if (this.hotReloadEnabled) {
      return;
    }

    // 只在浏览器环境中启用
    if (typeof window === 'undefined') {
      return;
    }

    this.hotReloadHandler = () => {
      const config = this.getConfig();
      if (config.developer.mode || config.developer.consoleLogging) {
        // eslint-disable-next-line no-console
        console.log('[ConfigManager] 检测到配置重载事件，重新加载配置...');
      }
      this.reloadConfig();
    };

    window.addEventListener('config:reload', this.hotReloadHandler);
    this.hotReloadEnabled = true;

    const config = this.getConfig();
    if (config.developer.mode || config.developer.consoleLogging) {
      // eslint-disable-next-line no-console
      console.log('[ConfigManager] 配置热更新已启用。使用 window.dispatchEvent(new CustomEvent("config:reload")) 触发重载。');
    }
  }

  /**
   * 禁用配置热更新
   *
   * 移除配置热更新监听器。
   *
   * @returns void
   */
  disableHotReload(): void {
    if (!this.hotReloadEnabled || this.hotReloadHandler === null) {
      return;
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('config:reload', this.hotReloadHandler);
    }

    this.hotReloadHandler = null;
    this.hotReloadEnabled = false;

    const config = this.getConfig();
    if (config.developer.mode || config.developer.consoleLogging) {
      // eslint-disable-next-line no-console
      console.log('[ConfigManager] 配置热更新已禁用');
    }
  }

  /**
   * 检查是否启用了热更新
   *
   * @returns 如果热更新已启用返回 true
   */
  isHotReloadEnabled(): boolean {
    return this.hotReloadEnabled;
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

  // 验证配置
  private validateConfig(config: Config): void {
    // 验证必需的 GitHub 仓库配置
    if (config.github.repoOwner.trim() === '') {
      throw new Error('GitHub 仓库配置不完整：缺少 repoOwner');
    }

    if (config.github.repoName.trim() === '') {
      throw new Error('GitHub 仓库配置不完整：缺少 repoName');
    }

    if (config.github.repoBranch.trim() === '') {
      throw new Error('GitHub 仓库配置不完整：缺少 repoBranch');
    }

    // 验证站点配置
    if (config.site.title.trim() === '') {
      throw new Error('站点配置不完整：缺少 title');
    }

    const { searchIndex } = config.features;
    if (searchIndex.enabled) {
      if (searchIndex.indexBranch.trim() === '') {
        throw new Error('搜索索引配置不完整：缺少 indexBranch');
      }

      if (searchIndex.defaultBranch.trim() === '') {
        throw new Error('搜索索引配置不完整：缺少 defaultBranch');
      }

      if (searchIndex.manifestPath.trim() === '') {
        throw new Error('搜索索引配置不完整：缺少 manifestPath');
      }

      if (searchIndex.refreshIntervalMs < CONFIG_DEFAULTS.SEARCH_INDEX_MIN_REFRESH_INTERVAL_MS) {
        throw new Error(`搜索索引配置不合法：refreshIntervalMs 不得小于 ${CONFIG_DEFAULTS.SEARCH_INDEX_MIN_REFRESH_INTERVAL_MS.toString()}ms`);
      }
    }
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

    const repoOwner = resolveEnvWithMapping(stringEnv, 'GITHUB_REPO_OWNER', CONFIG_DEFAULTS.GITHUB_REPO_OWNER);
    const repoName = resolveEnvWithMapping(stringEnv, 'GITHUB_REPO_NAME', CONFIG_DEFAULTS.GITHUB_REPO_NAME);
    const repoBranch = resolveEnvWithMapping(stringEnv, 'GITHUB_REPO_BRANCH', CONFIG_DEFAULTS.GITHUB_REPO_BRANCH);

    const searchIndexEnabled = EnvParser.parseBoolean(
      resolveEnvWithMapping(stringEnv, 'ENABLED_SEARCH_INDEX', 'false')
    );
    const searchIndexIndexBranch = resolveEnvWithMapping(
      stringEnv,
      'SEARCH_INDEX_BRANCH',
      CONFIG_DEFAULTS.SEARCH_INDEX_BRANCH
    );
    const searchIndexDefaultBranch = resolveEnvWithMapping(
      stringEnv,
      'SEARCH_DEFAULT_BRANCH',
      repoBranch
    );
    const searchIndexManifestPath = resolveEnvWithMapping(
      stringEnv,
      'SEARCH_MANIFEST_PATH',
      CONFIG_DEFAULTS.SEARCH_INDEX_MANIFEST_PATH
    );
    const searchIndexRefreshIntervalMs = EnvParser.parseInteger(
      resolveEnvWithMapping(
        stringEnv,
        'SEARCH_REFRESH_INTERVAL',
        CONFIG_DEFAULTS.SEARCH_INDEX_REFRESH_INTERVAL_MS.toString()
      ),
      CONFIG_DEFAULTS.SEARCH_INDEX_REFRESH_INTERVAL_MS,
      { min: CONFIG_DEFAULTS.SEARCH_INDEX_MIN_REFRESH_INTERVAL_MS }
    );

    const config: Config = {
      site: {
        title: resolveEnvWithMapping(stringEnv, 'SITE_TITLE', CONFIG_DEFAULTS.SITE_TITLE),
        description: resolveEnvWithMapping(stringEnv, 'SITE_DESCRIPTION', CONFIG_DEFAULTS.SITE_DESCRIPTION),
        keywords: resolveEnvWithMapping(stringEnv, 'SITE_KEYWORDS', CONFIG_DEFAULTS.SITE_KEYWORDS),
        ogImage: resolveEnvWithMapping(stringEnv, 'SITE_OG_IMAGE', CONFIG_DEFAULTS.SITE_OG_IMAGE)
      },
      github: {
        repoOwner,
        repoName,
        repoBranch
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
        },
        searchIndex: {
          enabled: searchIndexEnabled,
          indexBranch: searchIndexIndexBranch,
          defaultBranch: searchIndexDefaultBranch,
          manifestPath: searchIndexManifestPath,
          refreshIntervalMs: searchIndexRefreshIntervalMs
        },
        footer: {
          leftText: resolveEnvWithMapping(stringEnv, 'FOOTER_LEFT_TEXT', '')
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

    // 验证配置
    this.validateConfig(config);

    return config;
  }

  // 加载Token配置
  private loadTokens(env: EnvSource): Config['tokens'] {
    const tokens = new Set<string>();

    // 提取辅助函数：添加有效的 token
    const addTokenIfValid = (key: string): void => {
      const token = this.getEnvString(env, key);
      if (token !== undefined && EnvParser.validateToken(token)) {
        tokens.add(token.trim());
      }
    };

    // 遍历所有前缀，检查不带数字和带数字的版本
    CONFIG_DEFAULTS.PAT_PREFIXES.forEach(prefix => {
      // 检查不带数字的版本
      addTokenIfValid(prefix);

      // 检查带数字的版本（1到MAX_PAT_NUMBER）
      for (let i = 1; i <= CONFIG_DEFAULTS.MAX_PAT_NUMBER; i++) {
        addTokenIfValid(prefix + String(i));
      }
    });

    const uniqueTokens = Array.from(tokens);
    return {
      githubPATs: uniqueTokens,
      totalCount: uniqueTokens.length
    };
  }

  /**
   * 获取用于Vite define的PAT对象
   *
   * 构建用于Vite构建时注入的环境变量对象。
   *
   * @param env - 可选的环境变量源
   * @returns PAT环境变量对象
   */
  getPATsForViteDefine(env?: EnvSource): Record<string, string> {
    const processEnv = this.getProcessEnv();
    const envSource: EnvSource = env ?? processEnv ?? {};
    const patEnvVars: Record<string, string> = {};

    // 提取辅助函数：添加有效的 PAT 到 Vite define 对象
    const addPATIfValid = (key: string): void => {
      const token = this.getEnvString(envSource, key);
      if (token !== undefined && EnvParser.validateToken(token)) {
        patEnvVars[`process.env.${key}`] = JSON.stringify(token);
      }
    };

    // 遍历所有前缀，检查不带数字和带数字的版本
    CONFIG_DEFAULTS.PAT_PREFIXES.forEach(prefix => {
      // 检查不带数字的版本
      addPATIfValid(prefix);

      // 检查带数字的版本（1到MAX_PAT_NUMBER）
      for (let i = 1; i <= CONFIG_DEFAULTS.MAX_PAT_NUMBER; i++) {
        addPATIfValid(prefix + String(i));
      }
    });

    return patEnvVars;
  }

  /**
   * 获取配置调试信息
   *
   * 返回详细的配置加载信息，用于调试和排查配置问题。
   *
   * @returns 配置调试信息对象
   */
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

/**
 * 配置管理器单例实例
 *
 * 全局配置管理器，用于访问和管理应用配置。
 * 在开发环境中自动启用配置热更新功能。
 */
export const configManager = ConfigManager.getInstance();

// 在开发环境中自动启用热更新
if (typeof window !== 'undefined') {
  // 延迟启用，确保配置已加载
  window.setTimeout(() => {
    const config = configManager.getConfig();
    if (config.runtime.isDev && config.developer.mode) {
      configManager.enableHotReload();
    }
  }, 0);
}
