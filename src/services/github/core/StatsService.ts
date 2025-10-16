import { CacheManager } from '../cache/CacheManager';
import { ProxyService } from '../proxy/ProxyService';
import { resetFailedProxyServices } from './Auth';

// GitHub统计服务，使用模块导出而非类

/**
 * 清除所有缓存和重置网络状态
 * 
 * 清除内容缓存、文件缓存、批处理器缓存和代理失败记录。
 * 
 * @returns Promise，清除完成后解析
 */
export async function clearCache(): Promise<void> {
  await CacheManager.clearAllCaches();
  const { clearBatcherCache } = await import('./ContentService');
  clearBatcherCache();
  resetFailedProxyServices();
}

/**
 * 获取缓存统计信息
 * 
 * @returns 缓存统计对象
 */
export function getCacheStats(): ReturnType<typeof CacheManager.getCacheStats> {
  return CacheManager.getCacheStats();
}

/**
 * 获取网络请求统计信息
 * 
 * 返回批处理器、代理服务和缓存的统计信息。
 * 
 * @returns Promise，解析为网络统计对象
 */
export async function getNetworkStats(): Promise<{
  batcher: unknown;
  proxy: ReturnType<typeof ProxyService.getProxyHealthStats>;
  cache: ReturnType<typeof getCacheStats>;
}> {
  const { getBatcher } = await import('./ContentService');
  return {
    batcher: getBatcher().getStats(),
    proxy: ProxyService.getProxyHealthStats(),
    cache: getCacheStats()
  };
}

/**
 * GitHub统计服务对象
 * 
 * 为了向后兼容性，导出包含所有统计相关函数的常量对象。
 * 
 * @deprecated 推荐直接使用独立的导出函数
 */
export const GitHubStatsService = {
  clearCache,
  getCacheStats,
  getNetworkStats
} as const;
