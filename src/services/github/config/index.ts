// 代理强制管理器
export {
  getForceServerProxy,
  shouldUseServerAPI,
  getRequestStrategy,
  getProxyConfigDetails,
  refreshProxyConfig
} from './ProxyForceManager';

// 导出便捷函数，确保向后兼容
import { getForceServerProxy, shouldUseServerAPI, getRequestStrategy } from './ProxyForceManager';

export const getProxyForceConfig = (): {
  forceServerProxy: boolean;
  shouldUseServerAPI: boolean;
  strategy: 'server-api' | 'direct-api' | 'hybrid';
} => ({
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
