import { getProxyConfig } from '@/config';
import { PROXY_SERVICES } from './ProxyConfig';
import { logger } from '@/utils';

const proxyConfig = getProxyConfig();

// 代理健康状态接口
export interface ProxyHealth {
  url: string;
  failureCount: number;
  lastFailure: number;
  responseTime: number;
  isHealthy: boolean;
  consecutiveFailures: number;
  lastSuccessTime: number;
}

/**
 * 代理健康管理器
 * 负责监控代理服务的健康状态，进行故障转移和自动恢复
 */
export class ProxyHealthManager {
  private proxyHealth = new Map<string, ProxyHealth>();
  private readonly MAX_FAILURES = 3;
  private healthCheckTimer: number | null = null;

  constructor() {
    this.initializeProxies();
    this.startHealthCheck();
  }

  private initializeProxies(): void {
    PROXY_SERVICES.forEach(proxyUrl => {
      if (proxyUrl !== '' && proxyUrl.trim() !== '') {
        this.proxyHealth.set(proxyUrl, {
          url: proxyUrl,
          failureCount: 0,
          lastFailure: 0,
          responseTime: 0,
          isHealthy: true,
          consecutiveFailures: 0,
          lastSuccessTime: Date.now()
        });
      }
    });
  }

  public recordSuccess(proxyUrl: string, responseTime: number): void {
    const health = this.proxyHealth.get(proxyUrl);
    if (health !== undefined) {
      health.isHealthy = true;
      health.consecutiveFailures = 0;
      health.responseTime = responseTime;
      health.lastSuccessTime = Date.now();
      logger.debug(`代理成功: ${proxyUrl}, 响应时间: ${responseTime.toString()}ms`);
    }
  }

  public recordFailure(proxyUrl: string): void {
    const health = this.proxyHealth.get(proxyUrl);
    if (health !== undefined) {
      health.failureCount++;
      health.consecutiveFailures++;
      health.lastFailure = Date.now();
      health.isHealthy = health.consecutiveFailures < this.MAX_FAILURES;
      logger.warn(`代理失败: ${proxyUrl}, 连续失败: ${health.consecutiveFailures.toString()}`);
    }
  }

  public getBestProxy(): string {
    const healthyProxies = Array.from(this.proxyHealth.values())
      .filter(health => health.isHealthy || this.shouldRetryProxy(health))
      .sort((a, b) => {
        // 优先选择健康的代理
        if (a.isHealthy && !b.isHealthy) {
          return -1;
        }
        if (!a.isHealthy && b.isHealthy) {
          return 1;
        }
        // 在健康代理中，选择响应时间最短的
        return a.responseTime - b.responseTime;
      });

    return healthyProxies.length > 0 ? (healthyProxies[0]?.url ?? '') : (PROXY_SERVICES[0] ?? '');
  }

  private shouldRetryProxy(health: ProxyHealth): boolean {
    const now = Date.now();
    const recoveryTime = proxyConfig.recoveryTime;
    return (now - health.lastFailure) > recoveryTime;
  }

  private startHealthCheck(): void {
    const interval = proxyConfig.healthCheckInterval;
    this.healthCheckTimer = window.setInterval(() => {
      void this.performHealthCheck();
    }, interval);
  }

  private async performHealthCheck(): Promise<void> {
    const unhealthyProxies = Array.from(this.proxyHealth.values())
      .filter(health => !health.isHealthy && this.shouldRetryProxy(health));

    for (const health of unhealthyProxies) {
      let timeoutId: number | null = null;
      try {
        const testUrl = `${health.url}/health-check`;
        const controller = new AbortController();
        timeoutId = window.setTimeout(() => {
          controller.abort();
        }, proxyConfig.healthCheckTimeout);
        const startTime = Date.now();
        const response = await fetch(testUrl, {
          method: 'HEAD',
          signal: controller.signal
        });

        if (response.ok) {
          const responseTime = Date.now() - startTime;
          this.recordSuccess(health.url, responseTime);
        }
      } catch {
        // 健康检查失败，保持当前状态
      } finally {
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }
      }
    }
  }

  public getHealthStats(): {
    url: string;
    isHealthy: boolean;
    failureCount: number;
    responseTime: number;
    consecutiveFailures: number;
  }[] {
    return Array.from(this.proxyHealth.values()).map(health => ({
      url: health.url,
      isHealthy: health.isHealthy,
      failureCount: health.failureCount,
      responseTime: health.responseTime,
      consecutiveFailures: health.consecutiveFailures
    }));
  }

  public destroy(): void {
    if (this.healthCheckTimer !== null) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  // 重置健康管理器的所有状态，清空代理健康记录并重新初始化定时器
  public reset(): void {
    // 停止当前的健康检查定时器
    this.destroy();

    // 清空健康状态记录
    this.proxyHealth.clear();

    // 重新初始化代理健康状态
    this.initializeProxies();

    // 重新启动健康检查
    this.startHealthCheck();

    logger.info('代理健康管理器已重置，所有状态已清空并重新初始化');
  }
}

// 创建单例实例
export const proxyHealthManager = new ProxyHealthManager();
