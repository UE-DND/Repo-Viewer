import { getConfig, getAccessConfig, getRuntimeConfig, configManager } from '@/config';
import { logger } from '@/utils';

// 代理强制模式配置管理器，统一管理所有代理相关的配置逻辑
export class ProxyForceManager {
  private static _forceServerProxy: boolean | null = null;

  // 获取是否强制使用服务端代理

  public static getForceServerProxy(): boolean {
    if (this._forceServerProxy === null) {
      this._forceServerProxy = this.calculateForceServerProxy();
    }
    return this._forceServerProxy;
  }

  // 重新计算并刷新强制代理配置
  public static refreshConfig(): void {
    this._forceServerProxy = this.calculateForceServerProxy();
  }

  // 计算是否强制使用服务端代理
  private static calculateForceServerProxy(): boolean {
    try {
      const runtimeConfig = getRuntimeConfig();
      const accessConfig = getAccessConfig();

      if (!runtimeConfig.isDev) {
        return true;
      }

      if (accessConfig.useTokenMode) {
        logger.info('Token 模式已启用，优先使用服务端代理以保护令牌');
        return true;
      }

      return false;
    } catch (error) {
      logger.warn('计算强制代理配置时出错，使用默认值 false:', error);
      return false;
    }
  }

  // 获取代理配置详情（用于调试）
  public static getProxyConfigDetails(): {
    forceServerProxy: boolean;
    isDev: boolean;
    useTokenMode: boolean;
    reason: string;
  } {
    const runtimeConfig = getRuntimeConfig();
    const accessConfig = getAccessConfig();
    const forceServerProxy = this.getForceServerProxy();

    let reason: string;
    if (!runtimeConfig.isDev) {
      reason = '生产环境，强制使用服务端代理';
    } else if (accessConfig.useTokenMode) {
      reason = '开发环境启用 Token 模式，尝试使用服务端代理';
    } else {
      reason = '开发环境且未启用 Token 模式，采用直连模式';
    }

    return {
      forceServerProxy,
      isDev: runtimeConfig.isDev,
      useTokenMode: accessConfig.useTokenMode,
      reason
    };
  }

  // 检查是否应该使用服务端API
  public static shouldUseServerAPI(): boolean {
    // 基础的强制代理检查
    if (this.getForceServerProxy()) {
      return true;
    }

    // 可以在这里添加其他条件，比如：
    // - 网络环境检测
    // - 用户偏好设置
    // - 特定功能需求等

    return false;
  }

  // 获取推荐的请求策略
  public static getRequestStrategy(): 'server-api' | 'direct-api' | 'hybrid' {
    const config = getConfig();

    if (this.getForceServerProxy()) {
      return 'server-api';
    }

    if (config.runtime.isDev) {
      return 'direct-api';
    }

    return 'hybrid';
  }
}

// 导出便捷函数
export const getForceServerProxy = () => ProxyForceManager.getForceServerProxy();
export const shouldUseServerAPI = () => ProxyForceManager.shouldUseServerAPI();
export const getRequestStrategy = () => ProxyForceManager.getRequestStrategy();
export const refreshProxyConfig = () => ProxyForceManager.refreshConfig();

// 配置变更监听（静态注册，避免动态/静态混用警告）
configManager.onConfigChange(() => {
  ProxyForceManager.refreshConfig();
});
