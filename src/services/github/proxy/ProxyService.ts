import { logger } from '../../../utils';
import { getProxyConfig, getRuntimeConfig } from '../../../config';
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

// 获取处理过的URL
export class ProxyService {
  public static async getProxiedUrl(
    url: string,
    options: {
      priority?: 'high' | 'medium' | 'low';
      timeout?: number;
      retryCount?: number;
    } = {}
  ): Promise<string> {
    if (!url) return '';

    const { priority = 'medium', timeout = proxyConfig.validationTimeout, retryCount = 0 } = options;

    if (runtimeConfig.isDev && !USE_TOKEN_MODE && !proxyConfig.imageProxyUrl) {
      // 如果是开发环境且未配置代理，则直接返回原始URL
      return url;
    }

    // 修改：优先使用服务端API代理
    if (getForceServerProxy()) {
      // 通过服务端API代理请求
      return `/api/github?action=getFileContent&url=${encodeURIComponent(url)}`;
    }

    // 使用智能代理选择
    const bestProxy = proxyHealthManager.getBestProxy();

    if (!bestProxy) {
      // 如果没有可用代理，使用服务端API作为后备
      logger.warn('没有可用代理，使用服务端API');
      return `/api/github?action=getFileContent&url=${encodeURIComponent(url)}`;
    }

    const proxiedUrl = ProxyUrlTransformer.applyProxyToUrl(url, bestProxy);

    // 对高优先级请求进行健康检查
    if (priority === 'high' && retryCount === 0) {
      try {
        await this.validateProxy(bestProxy, timeout);
      } catch (error) {
        logger.warn(`代理验证失败: ${bestProxy}`, error);
        proxyHealthManager.recordFailure(bestProxy);
        // 递归尝试下一个代理
        return this.getProxiedUrl(url, { ...options, retryCount: retryCount + 1 });
      }
    }

    return proxiedUrl;
  }

  // 同步版本（保持向后兼容）
  public static getProxiedUrlSync(url: string): string {
    if (!url) return '';

    if (runtimeConfig.isDev && !USE_TOKEN_MODE && !proxyConfig.imageProxyUrl) {
      return url;
    }

    if (getForceServerProxy()) {
      return `/api/github?action=getFileContent&url=${encodeURIComponent(url)}`;
    }

    const bestProxy = proxyHealthManager.getBestProxy();
    if (!bestProxy) {
      return `/api/github?action=getFileContent&url=${encodeURIComponent(url)}`;
    }

    return ProxyUrlTransformer.applyProxyToUrl(url, bestProxy);
  }

  // 验证代理是否可用
  private static async validateProxy(proxyUrl: string, timeout: number): Promise<void> {
    const testUrl = `${proxyUrl}/ping`;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeout);

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
        throw new Error(`Proxy validation failed: ${response.status}`);
      }
    } catch (error) {
      window.clearTimeout(timeoutId);
      throw error;
    }
  }

  // 标记代理服务失败（增强版）
  public static markProxyServiceFailed(proxyUrl: string): void {
    if (proxyUrl) {
      proxyHealthManager.recordFailure(proxyUrl);

      if (!failedProxyServices.has(proxyUrl)) {
        // 保持向后兼容
        logger.warn(`标记代理服务失败: ${proxyUrl}`);
        failedProxyServices.add(proxyUrl);
      }
    }
  }

  // 获取当前使用的代理服务
  public static getCurrentProxyService(): string {
    return proxyHealthManager.getBestProxy() || PROXY_SERVICES[0] || '';
  }

  // 获取代理健康状态
  public static getProxyHealthStats() {
    return proxyHealthManager.getHealthStats();
  }

  // 重置失败的代理服务记录
  public static resetFailedProxyServices(): void {
    // 清空旧的失败记录（向后兼容）
    failedProxyServices.clear();
    // 使用新的重置方法，可靠地清空健康管理器状态
    proxyHealthManager.reset();
    logger.info('已重置所有失败的代理服务记录，代理健康状态已完全重置');
  }

  // 转换相对图片URL为绝对URL
  public static transformImageUrl(
    src: string | undefined,
    markdownFilePath: string,
    useTokenMode: boolean
  ): string | undefined {
    return ProxyUrlTransformer.transformImageUrl(src, markdownFilePath, useTokenMode, ProxyService.getProxiedUrlSync);
  }
}
