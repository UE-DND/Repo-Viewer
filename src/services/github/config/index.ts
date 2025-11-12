// 代理强制管理器
export {
  getForceServerProxy,
  shouldUseServerAPI,
  getRequestStrategy,
  getProxyConfigDetails,
  refreshProxyConfig
} from './ProxyForceManager';

export type ProxyStrategy = 'server-api' | 'direct-api' | 'hybrid';

export interface ProxyConfigDetails {
  forceServerProxy: boolean;
  isDev: boolean;
  useTokenMode: boolean;
  reason: string;
}
