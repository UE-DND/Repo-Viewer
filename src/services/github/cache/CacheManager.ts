import { logger } from '../../../utils';
import type { CacheStats } from './CacheTypes';
import { AdvancedCache, LRUCache } from './AdvancedCache';
import { CONTENT_CACHE_CONFIG, FILE_CACHE_CONFIG } from './CacheConfig';

export class CacheManager {
  private static contentCache: AdvancedCache<string, any>;
  private static fileCache: AdvancedCache<string, string>;
  private static initialized = false;

  public static async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.contentCache = new AdvancedCache<string, any>(CONTENT_CACHE_CONFIG);
      this.fileCache = new AdvancedCache<string, string>(FILE_CACHE_CONFIG);

      await Promise.all([
        this.contentCache.initializePersistence() || Promise.resolve(),
        this.fileCache.initializePersistence() || Promise.resolve(),
      ]);

      this.initialized = true;
      logger.info('缓存管理器初始化完成');
    } catch (error) {
      logger.error('缓存管理器初始化失败', error);
      throw error;
    }
  }

  public static getContentCache(): AdvancedCache<string, any> {
    if (!this.contentCache) {
      this.contentCache = new AdvancedCache<string, any>(CONTENT_CACHE_CONFIG);
    }
    return this.contentCache;
  }

  public static getFileCache(): AdvancedCache<string, string> {
    if (!this.fileCache) {
      this.fileCache = new AdvancedCache<string, string>(FILE_CACHE_CONFIG);
    }
    return this.fileCache;
  }

  public static async clearAllCaches(): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.contentCache) {
      promises.push(this.contentCache.clear());
    }
    if (this.fileCache) {
      promises.push(this.fileCache.clear());
    }

    await Promise.all(promises);
    logger.info('已清除所有API缓存');
  }

  public static getCacheStats(): { content: CacheStats; file: CacheStats } {
    return {
      content:
        this.contentCache?.getStats() || {
          hits: 0,
          misses: 0,
          size: 0,
          hitRate: 0,
          memoryUsage: 0,
          lastCleanup: 0,
        },
      file:
        this.fileCache?.getStats() || {
          hits: 0,
          misses: 0,
          size: 0,
          hitRate: 0,
          memoryUsage: 0,
          lastCleanup: 0,
        },
    };
  }

  public static async prefetchContent(paths: string[]): Promise<void> {
    if (this.contentCache && this.contentCache.prefetch) {
      await this.contentCache.prefetch(paths);
    }
  }

  public static async prefetchFiles(urls: string[]): Promise<void> {
    if (this.fileCache && this.fileCache.prefetch) {
      await this.fileCache.prefetch(urls);
    }
  }

  public static destroy(): void {
    if (this.contentCache) {
      this.contentCache.destroy();
    }
    if (this.fileCache) {
      this.fileCache.destroy();
    }

    this.initialized = false;
    logger.info('缓存管理器已销毁');
  }
}

export { AdvancedCache, LRUCache };
export type { CacheStats };
export { CONTENT_CACHE_CONFIG, FILE_CACHE_CONFIG };
export type { CacheConfig } from './CacheTypes';
export { DEFAULT_CACHE_CONFIG } from './CacheConfig';
