import { CacheManager } from '../cache/CacheManager';
import { ProxyService } from '../proxy/ProxyService';
import { GitHubContentService } from './GitHubContentService';
import { GitHubAuth } from './GitHubAuth';

export class GitHubStatsService {
  // 清除缓存和重置网络状态
  public static async clearCache(): Promise<void> {
    await CacheManager.clearAllCaches();
    GitHubContentService.clearBatcherCache();
    GitHubAuth.resetFailedProxyServices();
  }

  // 获取缓存统计
  public static getCacheStats() {
    return CacheManager.getCacheStats();
  }

  // 获取网络请求统计
  public static getNetworkStats() {
    return {
      batcher: GitHubContentService.getBatcher().getStats(),
      proxy: ProxyService.getProxyHealthStats(),
      cache: this.getCacheStats()
    };
  }
}