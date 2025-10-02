import { CacheManager } from '../cache/CacheManager';
import { ProxyService } from '../proxy/ProxyService';
import { GitHubAuth } from './GitHubAuth';

// GitHub统计服务，使用模块导出而非类

// 清除缓存和重置网络状态
export async function clearCache(): Promise<void> {
  await CacheManager.clearAllCaches();
  const { clearBatcherCache } = await import('./GitHubContentService');
  clearBatcherCache();
  GitHubAuth.resetFailedProxyServices();
}

// 获取缓存统计
export function getCacheStats(): ReturnType<typeof CacheManager.getCacheStats> {
  return CacheManager.getCacheStats();
}

// 获取网络请求统计
export async function getNetworkStats(): Promise<{
  batcher: unknown;
  proxy: ReturnType<typeof ProxyService.getProxyHealthStats>;
  cache: ReturnType<typeof getCacheStats>;
}> {
  const { getBatcher } = await import('./GitHubContentService');
  return {
    batcher: getBatcher().getStats(),
    proxy: ProxyService.getProxyHealthStats(),
    cache: getCacheStats()
  };
}

// 为了向后兼容，导出一个包含所有函数的对象
export const GitHubStatsService = {
  clearCache,
  getCacheStats,
  getNetworkStats
} as const;