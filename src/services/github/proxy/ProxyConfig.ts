import { getRuntimeConfig, getAccessConfig, getProxyConfig } from '../../../config/ConfigManager';

// 获取配置
export const runtimeConfig = getRuntimeConfig();
export const accessConfig = getAccessConfig();
const proxyConfig = getProxyConfig();

// 模式设置
export const USE_TOKEN_MODE = accessConfig.useTokenMode;

// 强制使用服务端API代理所有请求
export const FORCE_SERVER_PROXY = !runtimeConfig.isDev || USE_TOKEN_MODE;

// 定义多个代理服务URL
export const PROXY_SERVICES = [
  proxyConfig.imageProxyUrl, // 默认代理
  proxyConfig.imageProxyUrlBackup1, // 备用代理1
  proxyConfig.imageProxyUrlBackup2, // 备用代理2
];
