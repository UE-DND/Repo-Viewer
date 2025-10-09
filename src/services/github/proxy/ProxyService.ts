import { logger } from '@/utils';
import { getProxyConfig, getRuntimeConfig } from '@/config';
import {
  USE_TOKEN_MODE,
  PROXY_SERVICES
} from './ProxyConfig';
import { getForceServerProxy } from '../config/ProxyForceManager';
import { proxyHealthManager } from './ProxyHealthManager';
import { ProxyUrlTransformer } from './ProxyUrlTransformer';

const proxyConfig = getProxyConfig();
const runtimeConfig = getRuntimeConfig();

// 保持向后兼容
const failedProxyServices = new Set<string>();

async function getProxiedUrl(
  url: string,
  options: {
    priority?: 'high' | 'medium' | 'low';
    timeout?: number;
    retryCount?: number;
  } = {}
): Promise<string> {
  if (url === '') {
    return '';
  }

  const { priority = 'medium', timeout = proxyConfig.validationTimeout, retryCount = 0 } = options;

  // 如果是开发环境且未配置代理，则直接返回原始URL
  if (runtimeConfig.isDev && !USE_TOKEN_MODE && proxyConfig.imageProxyUrl === '') {
    return url;
  }

  // 优先使用服务端API代理
  if (getForceServerProxy()) {
    return `/api/github?action=getFileContent&url=${encodeURIComponent(url)}`;
  }

  // 使用智能代理选择
  const bestProxy = proxyHealthManager.getBestProxy();

  if (bestProxy === '') {
    logger.warn('没有可用代理，使用服务端API');
    return `/api/github?action=getFileContent&url=${encodeURIComponent(url)}`;
  }

  const proxiedUrl = ProxyUrlTransformer.applyProxyToUrl(url, bestProxy);

  // 对高优先级请求进行健康检查
  if (priority === 'high' && retryCount === 0) {
    try {
      await validateProxy(bestProxy, timeout);
    } catch (error) {
      logger.warn(`代理验证失败: ${bestProxy}`, error);
      proxyHealthManager.recordFailure(bestProxy);
      return getProxiedUrl(url, { ...options, retryCount: retryCount + 1 });
    }
  }

  return proxiedUrl;
}

function getProxiedUrlSync(url: string): string {
  if (url === '') {
    return '';
  }

  if (runtimeConfig.isDev && !USE_TOKEN_MODE && proxyConfig.imageProxyUrl === '') {
    return url;
  }

  if (getForceServerProxy()) {
    return `/api/github?action=getFileContent&url=${encodeURIComponent(url)}`;
  }

  const bestProxy = proxyHealthManager.getBestProxy();
  if (bestProxy === '') {
    return `/api/github?action=getFileContent&url=${encodeURIComponent(url)}`;
  }

  return ProxyUrlTransformer.applyProxyToUrl(url, bestProxy);
}

async function validateProxy(proxyUrl: string, timeout: number): Promise<void> {
  const testUrl = `${proxyUrl}/ping`;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    const startTime = Date.now();
    const response = await fetch(testUrl, {
      method: 'HEAD',
      signal: controller.signal
    });

    window.clearTimeout(timeoutId);

    if (response.ok) {
      const responseTime = Date.now() - startTime;
      proxyHealthManager.recordSuccess(proxyUrl, responseTime);
    } else {
      throw new Error(`Proxy validation failed: ${response.status.toString()}`);
    }
  } catch (error) {
    window.clearTimeout(timeoutId);
    throw error;
  }
}

function markProxyServiceFailed(proxyUrl: string): void {
  if (proxyUrl !== '') {
    proxyHealthManager.recordFailure(proxyUrl);

    if (!failedProxyServices.has(proxyUrl)) {
      logger.warn(`标记代理服务失败: ${proxyUrl}`);
      failedProxyServices.add(proxyUrl);
    }
  }
}

function getCurrentProxyService(): string {
  const bestProxy = proxyHealthManager.getBestProxy();
  return bestProxy !== '' ? bestProxy : (PROXY_SERVICES[0] ?? '');
}

function getProxyHealthStats(): {
  url: string;
  isHealthy: boolean;
  failureCount: number;
  responseTime: number;
  consecutiveFailures: number;
}[] {
  return proxyHealthManager.getHealthStats();
}

function resetFailedProxyServices(): void {
  failedProxyServices.clear();

  proxyHealthManager.reset();

  logger.info('已重置所有失败的代理服务记录，代理健康状态已完全重置');
}

function transformImageUrl(
  src: string | undefined,
  markdownFilePath: string,
  useTokenMode: boolean
): string | undefined {
  return ProxyUrlTransformer.transformImageUrl(src, markdownFilePath, useTokenMode, getProxiedUrlSync);
}

export const ProxyService = {
  getProxiedUrl,
  getProxiedUrlSync,
  markProxyServiceFailed,
  getCurrentProxyService,
  getProxyHealthStats,
  resetFailedProxyServices,
  transformImageUrl
};
