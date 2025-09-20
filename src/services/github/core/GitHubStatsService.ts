import { CacheManager } from '../cache/CacheManager';
import { ProxyService } from '../proxy/ProxyService';
import { GitHubAuth } from './GitHubAuth';

export class GitHubStatsService {
  // 清除缓存和重置网络状态
  public static async clearCache(): Promise<void> {
    await CacheManager.clearAllCaches();
    const { GitHubContentService } = await import('./GitHubContentService');
    GitHubContentService.clearBatcherCache();
    GitHubAuth.resetFailedProxyServices();
  }

  // 获取缓存统计
  public static getCacheStats() {
    return CacheManager.getCacheStats();
  }

  // 获取网络请求统计
  public static async getNetworkStats() {
    const { GitHubContentService } = await import('./GitHubContentService');
    return {
      batcher: GitHubContentService.getBatcher().getStats(),
      proxy: ProxyService.getProxyHealthStats(),
      cache: this.getCacheStats()
    };
  }
}