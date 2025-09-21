// 代理强制管理器 - 主要配置源
export {
  ProxyForceManager,
  getForceServerProxy,
  shouldUseServerAPI,
  getRequestStrategy,
  refreshProxyConfig,
  FORCE_SERVER_PROXY // 向后兼容的常量
} from './ProxyForceManager';

// 重新导出便捷函数，确保向后兼容
import { getForceServerProxy, shouldUseServerAPI, getRequestStrategy } from './ProxyForceManager';

export const getProxyForceConfig = () => ({
  forceServerProxy: getForceServerProxy(),
  shouldUseServerAPI: shouldUseServerAPI(),
  strategy: getRequestStrategy()
});

// 导出类型定义
export type ProxyStrategy = 'server-api' | 'direct-api' | 'hybrid';

export interface ProxyConfigDetails {
  forceServerProxy: boolean;
  isDev: boolean;
  useTokenMode: boolean;
  reason: string;
}