/**
 * 配置模块统一导出
 * 提供简洁的配置访问接口
 */

// 导出配置管理器和所有相关内容
export {
  configManager,
  EnvParser,
  
  // 类型定义
  type Config,
  type ConfigChangeListener,
  type ConfigDebugInfo,
  
  // 便捷访问函数
  getConfig,
  getSiteConfig,
  getGithubConfig,
  getFeaturesConfig,
  getProxyConfig,
  getAccessConfig,
  getDeveloperConfig,
  getRuntimeConfig,
  getTokensConfig,
  
  // 特殊便捷函数
  isDeveloperMode,
  isTokenMode,
  isDevEnvironment,
  getGithubPATs,
} from './ConfigManager';

// 默认导出配置管理器实例
export { configManager as default } from './ConfigManager';
