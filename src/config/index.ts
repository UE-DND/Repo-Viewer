/**
 * 配置模块统一导出
 * 提供简洁的配置访问接口
 */

// 导出类型定义
export type {
  Config,
  ConfigChangeListener,
  ConfigDebugInfo,
  EnvMappingOptions
} from './types';

// 导出常量
export {
  ENV_MAPPING,
  CONFIG_DEFAULTS
} from './constants';

// 导出工具类和函数
export { EnvParser } from './utils/env-parser';
export {
  applyEnvMappingForVite,
  resolveEnvWithMapping,
  hasEnvValue
} from './utils/env-mapping';

// 导出配置访问函数
export {
  getConfig,
  getSiteConfig,
  getGithubConfig,
  getFeaturesConfig,
  getProxyConfig,
  getAccessConfig,
  getDeveloperConfig,
  getRuntimeConfig,
  getTokensConfig,
  isDeveloperMode,
  isTokenMode,
  isDevEnvironment,
  getGithubPATs
} from './utils/config-accessors';

// 导出配置管理器
export { configManager, ConfigManager } from './core/config-manager';

// 默认导出配置管理器实例
export { configManager as default } from './core/config-manager';
