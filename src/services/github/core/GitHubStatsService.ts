import { CacheManager } from '../cache/CacheManager';
import { ProxyService } from '../proxy/ProxyService';
import { GitHubAuth } from './GitHubAuth';

export class GitHubStatsService {
  public static async clearCache(): Promise<void> {
    await CacheManager.clearAllCaches();
    const { GitHubContentService } = await import('./GitHubContentService');
    GitHubContentService.clearBatcherCache();
    GitHubAuth.resetFailedProxyServices();
  }

  public static getCacheStats() {
    return CacheManager.getCacheStats();
  }

  public static async getNetworkStats() {
    const { GitHubContentService } = await import('./GitHubContentService');
    return {
      batcher: GitHubContentService.getBatcher().getStats(),
      proxy: ProxyService.getProxyHealthStats(),
      cache: this.getCacheStats()
    };
  }
}
