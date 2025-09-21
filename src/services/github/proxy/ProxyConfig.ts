import { getAccessConfig, getProxyConfig } from '../../../config';
import { getForceServerProxy } from '../config/ProxyForceManager';

// 获取配置
export const accessConfig = getAccessConfig();
const proxyConfig = getProxyConfig();

// 模式设置
export const USE_TOKEN_MODE = accessConfig.useTokenMode;

// 强制使用服务端API代理所有请求 - 使用统一的ProxyForceManager
export const FORCE_SERVER_PROXY = getForceServerProxy();

// 定义多个代理服务URL
export const PROXY_SERVICES = [
  proxyConfig.imageProxyUrl, // 默认代理
  proxyConfig.imageProxyUrlBackup1, // 备用代理1
  proxyConfig.imageProxyUrlBackup2, // 备用代理2
];
