import { logger } from '@/utils';
import { getCurrentBranch } from '../core/Config';
import type { CacheStats } from './CacheTypes';
import { AdvancedCache, LRUCache } from './AdvancedCache';
import { CONTENT_CACHE_CONFIG, FILE_CACHE_CONFIG } from './CacheConfig';

const CONTENT_CACHE_ROOT_KEY = '__root__';

class CacheManagerImpl {
  private contentCache: AdvancedCache<string, unknown> | null = null;
  private fileCache: AdvancedCache<string, string> | null = null;
  private initialized = false;

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.contentCache = new AdvancedCache<string, unknown>(CONTENT_CACHE_CONFIG);
      this.fileCache = new AdvancedCache<string, string>(FILE_CACHE_CONFIG);

      const contentInitPromise = this.contentCache.initializePersistence();
      const fileInitPromise = this.fileCache.initializePersistence();
      await Promise.all([
        contentInitPromise,
        fileInitPromise,
      ]);

      this.initialized = true;
      logger.info('缓存管理器初始化完成');
    } catch (error) {
      logger.error('缓存管理器初始化失败', error);
      throw error;
    }
  }

  public getContentCache(): AdvancedCache<string, unknown> {
    this.contentCache ??= new AdvancedCache<string, unknown>(CONTENT_CACHE_CONFIG);
    return this.contentCache;
  }

  public getFileCache(): AdvancedCache<string, string> {
    this.fileCache ??= new AdvancedCache<string, string>(FILE_CACHE_CONFIG);
    return this.fileCache;
  }

  public async clearAllCaches(): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.contentCache !== null) {
      promises.push(this.contentCache.clear());
    }
    if (this.fileCache !== null) {
      promises.push(this.fileCache.clear());
    }

    await Promise.all(promises);
    logger.info('已清除所有API缓存');
  }

  public getCacheStats(): { content: CacheStats; file: CacheStats } {
    const defaultStats: CacheStats = {
      hits: 0,
      misses: 0,
      size: 0,
      hitRate: 0,
      memoryUsage: 0,
      lastCleanup: 0,
    };

    return {
      content: this.contentCache?.getStats() ?? defaultStats,
      file: this.fileCache?.getStats() ?? defaultStats,
    };
  }

  public prefetchContent(paths: string[]): void {
    if (this.contentCache === null || paths.length === 0) {
      return;
    }

    const branch = getCurrentBranch();
    const keys = paths.map(path => {
      const normalizedPath = path === '' ? CONTENT_CACHE_ROOT_KEY : path;
      return `contents_${branch}__${normalizedPath}`;
    });

    this.contentCache.prefetch(keys);
  }

  public prefetchFiles(urls: string[]): void {
    if (this.fileCache !== null) {
      this.fileCache.prefetch(urls);
    }
  }

  public destroy(): void {
    if (this.contentCache !== null) {
      this.contentCache.destroy();
    }
    if (this.fileCache !== null) {
      this.fileCache.destroy();
    }

    this.initialized = false;
    logger.info('缓存管理器已销毁');
  }
}

// 导出单例实例
export const CacheManager = new CacheManagerImpl();

export { AdvancedCache, LRUCache };
export type { CacheStats };
export { CONTENT_CACHE_CONFIG, FILE_CACHE_CONFIG };
export type { CacheConfig } from './CacheTypes';
export { DEFAULT_CACHE_CONFIG } from './CacheConfig';
