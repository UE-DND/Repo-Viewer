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

/**
 * 获取代理强制配置
 * 
 * 返回当前代理配置的摘要信息。
 * 
 * @returns 代理配置对象
 */
export const getProxyForceConfig = (): {
  forceServerProxy: boolean;
  shouldUseServerAPI: boolean;
  strategy: 'server-api' | 'direct-api' | 'hybrid';
} => ({
  forceServerProxy: getForceServerProxy(),
  shouldUseServerAPI: shouldUseServerAPI(),
  strategy: getRequestStrategy()
});

/**
 * 代理策略类型
 */
export type ProxyStrategy = 'server-api' | 'direct-api' | 'hybrid';

/**
 * 代理配置详情接口
 */
export interface ProxyConfigDetails {
  forceServerProxy: boolean;
  isDev: boolean;
  useTokenMode: boolean;
  reason: string;
}
