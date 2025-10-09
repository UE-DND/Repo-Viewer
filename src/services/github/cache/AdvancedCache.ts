import { logger } from '@/utils';
import type { CacheConfig, CacheStats, CacheItemMeta } from './CacheTypes';
import { calculateTTL, estimateSize } from './CacheUtils';
import {
  buildDbName,
  clearIndexedDB,
  clearLocalStorage,
  deleteDatabase,
  deleteItemFromIndexedDB,
  deleteItemFromLocalStorage,
  initIndexedDB,
  loadAllFromIndexedDB,
  loadItemFromIndexedDB,
  loadItemFromLocalStorage,
  saveItemToIndexedDB,
  saveItemToLocalStorage,
} from './CachePersistence';

export class AdvancedCache<K extends string, V> {
  private readonly cache: Map<K, CacheItemMeta>;
  private readonly config: CacheConfig;
  private readonly stats: CacheStats;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private readonly dbName: string;
  private db: IDBDatabase | null = null;

  constructor(config: CacheConfig) {
    this.cache = new Map();
    this.config = { ...config };
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      hitRate: 0,
      memoryUsage: 0,
      lastCleanup: Date.now(),
    };

    this.dbName = buildDbName(this.config.storageKey);

    if (this.config.enablePersistence) {
      void this.initializePersistence();
    }

    this.startPeriodicCleanup();
  }

  public async initializePersistence(): Promise<void> {
    if (this.config.useIndexedDB && typeof indexedDB !== 'undefined') {
      try {
        const handles = { dbName: this.dbName, db: this.db };
        await initIndexedDB(handles, this.config);
        this.db = handles.db;
        await this.loadFromIndexedDB();
        logger.debug(`IndexedDB初始化成功: ${this.config.storageKey}`);
      } catch (error: unknown) {
        logger.warn(`IndexedDB初始化失败，尝试重新初始化: ${this.config.storageKey}`, error);
        try {
          if (this.db !== null) {
            this.db.close();
            this.db = null;
          }
          await deleteDatabase(this.dbName);
          const handles = { dbName: this.dbName, db: this.db };
          await initIndexedDB(handles, this.config);
          this.db = handles.db;
          await this.loadFromIndexedDB();
          logger.info(`IndexedDB重新初始化成功: ${this.config.storageKey}`);
        } catch (retryError: unknown) {
          logger.warn(`IndexedDB重新初始化失败，回退到localStorage: ${this.config.storageKey}`, retryError);
          this.config.useIndexedDB = false;
          await this.loadFromLocalStorage();
        }
      }
    } else if (typeof localStorage !== 'undefined') {
      await this.loadFromLocalStorage();
    }
  }

  async get(key: K): Promise<V | undefined> {
    const keyStr = key;
    let item = this.cache.get(key);

    if (item === undefined && this.config.enablePersistence) {
      item = await this.loadItemFromPersistence(keyStr);
      if (item !== undefined) {
        this.cache.set(key, item);
      }
    }

    if (item === undefined) {
      this.stats.misses++;
      this.updateHitRate();
      return undefined;
    }

    const now = Date.now();
    const ttl = calculateTTL(this.config, item);

    if (now - item.timestamp > ttl) {
      await this.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return undefined;
    }

    item.accessCount++;
    item.lastAccess = now;

    this.cache.delete(key);
    this.cache.set(key, item);

    if (this.config.enablePersistence) {
      this.saveItemToPersistence(keyStr, item).catch((error: unknown) => {
        logger.warn('保存缓存项到持久化存储失败', error);
      });
    }

    this.stats.hits++;
    this.updateHitRate();
    return item.value as V;
  }

  // 计算TTL 统一使用工具函数

  async set(key: K, value: V, version = '1.0'): Promise<void> {
    const now = Date.now();
    const keyStr = key;
    await this.checkMemoryPressureAndCleanup();
    const size = estimateSize(value);

    const item: CacheItemMeta = {
      value,
      timestamp: now,
      accessCount: 1,
      lastAccess: now,
      size,
      version,
    };

    this.cache.set(key, item);
    this.stats.size = this.cache.size;
    this.updateMemoryUsage();

    if (this.config.enablePersistence) {
      this.saveItemToPersistence(keyStr, item).catch((error: unknown) => {
        logger.warn('保存缓存项到持久化存储失败', error);
      });
    }
  }

  private async checkMemoryPressureAndCleanup(): Promise<void> {
    const currentLoad = this.cache.size / this.config.maxSize;
    if (currentLoad >= this.config.memoryPressureThreshold) {
      const itemsToRemove = Math.floor(this.config.maxSize * 0.2);
      await this.cleanupLeastUsed(itemsToRemove);
      logger.debug(`内存压力清理：删除了${itemsToRemove.toString()}个最少使用的缓存项`);
    }
  }

  private async cleanupLeastUsed(count: number): Promise<void> {
    const items = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => {
        const scoreA = a.accessCount * 1000 + a.lastAccess;
        const scoreB = b.accessCount * 1000 + b.lastAccess;
        return scoreA - scoreB;
      })
      .slice(0, count);

    for (const [key] of items) {
      await this.delete(key);
    }
  }

  async delete(key: K): Promise<boolean> {
    const keyStr = key;
    const result = this.cache.delete(key);
    if (result) {
      this.stats.size = this.cache.size;
      this.updateMemoryUsage();
      if (this.config.enablePersistence) {
        await this.deleteItemFromPersistence(keyStr).catch((error: unknown) => {
          logger.warn('从持久化存储删除缓存项失败', error);
        });
      }
    }
    return result;
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.stats.size = 0;
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.updateMemoryUsage();
    this.updateHitRate();

    if (this.config.enablePersistence) {
      await this.clearPersistence().catch((error: unknown) => {
        logger.warn('清除持久化存储失败', error);
      });
    }
  }

  size(): number {
    return this.cache.size;
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  private updateMemoryUsage(): void {
    let totalSize = 0;
    this.cache.forEach(item => {
      totalSize += item.size;
    });
    this.stats.memoryUsage = totalSize;
  }

  private startPeriodicCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.performPeriodicCleanup().catch((error: unknown) => {
        logger.warn('定期清理失败', error);
      });
    }, 5 * 60 * 1000);
  }

  private async performPeriodicCleanup(): Promise<void> {
    const now = Date.now();
    const expiredKeys: K[] = [];

    this.cache.forEach((item, key) => {
      const ttl = calculateTTL(this.config, item);
      if (now - item.timestamp > ttl) {
        expiredKeys.push(key);
      }
    });

    for (const key of expiredKeys) {
      await this.delete(key);
    }

    this.stats.lastCleanup = now;

    if (expiredKeys.length > 0) {
      logger.debug(`定期清理：删除了${expiredKeys.length.toString()}个过期缓存项`);
    }
  }

  prefetch(keys: K[]): void {
    if (!this.config.enablePrefetch) {
      return;
    }

    window.setTimeout(() => {
      keys.forEach(key => {
        void this.get(key).catch((error: unknown) => {
          logger.debug(`预加载失败: ${key}`, error);
        });
      });
    }, this.config.prefetchDelay);
  }

  destroy(): void {
    if (this.cleanupTimer !== null) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    if (this.db !== null) {
      this.db.close();
      this.db = null;
    }
    this.cache.clear();
  }

  private async loadItemFromPersistence(key: string): Promise<CacheItemMeta | undefined> {
    if (this.config.useIndexedDB && this.db !== null) {
      return loadItemFromIndexedDB(this.db, this.config, key);
    } else {
      return loadItemFromLocalStorage(this.config, key);
    }
  }

  private async saveItemToPersistence(key: string, item: CacheItemMeta): Promise<void> {
    if (this.config.useIndexedDB && this.db !== null) {
      return saveItemToIndexedDB(this.db, this.config, key, item);
    } else {
      return saveItemToLocalStorage(this.config, key, item);
    }
  }

  private async deleteItemFromPersistence(key: string): Promise<void> {
    if (this.config.useIndexedDB && this.db !== null) {
      return deleteItemFromIndexedDB(this.db, this.config, key);
    } else {
      return deleteItemFromLocalStorage(this.config, key);
    }
  }

  private async clearPersistence(): Promise<void> {
    if (this.config.useIndexedDB && this.db !== null) {
      return clearIndexedDB(this.db, this.config);
    } else {
      return clearLocalStorage(this.config);
    }
  }

  private async loadFromIndexedDB(): Promise<void> {
    if (this.db === null) {
      logger.debug('IndexedDB连接不存在，跳过加载');
      return;
    }

    try {
      const items = await loadAllFromIndexedDB(this.db, this.config);
      let loadedCount = 0;
      const now = Date.now();
      const defaultTTL = this.config.defaultTTL;
      items.forEach(entry => {
        try {
          if (now - entry.timestamp <= defaultTTL) {
            this.cache.set(entry.key as K, entry.data);
            loadedCount += 1;
          }
        } catch (error: unknown) {
          logger.debug(`加载缓存项失败: ${entry.key}`, error);
        }
      });
      this.stats.size = this.cache.size;
      this.updateMemoryUsage();
      logger.debug(`从IndexedDB恢复缓存: ${loadedCount.toString()}项 (${this.config.storageKey})`);
    } catch (error: unknown) {
      logger.debug('从IndexedDB加载失败', error);
    }
  }

  private loadItemFromLocalStorage(key: string): Promise<CacheItemMeta | undefined> {
    return new Promise(resolve => {
      try {
        const item = localStorage.getItem(`${this.config.storageKey}_${key}`);
        if (item !== null) {
          const parsed = JSON.parse(item) as CacheItemMeta;
          resolve(parsed);
        } else {
          resolve(undefined);
        }
      } catch (error: unknown) {
        logger.warn('从localStorage加载缓存项失败', error);
        resolve(undefined);
      }
    });
  }

  private async loadFromLocalStorage(): Promise<void> {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(`${this.config.storageKey}_`) === true) {
          keys.push(key.substring(`${this.config.storageKey}_`.length));
        }
      }

      let loadedCount = 0;
      for (const key of keys) {
        const item = await this.loadItemFromLocalStorage(key);
        if (item !== undefined) {
          const now = Date.now();
          const ttl = calculateTTL(this.config, item);
          if (now - item.timestamp <= ttl) {
            this.cache.set(key as K, item);
            loadedCount += 1;
          }
        }
      }

      this.stats.size = this.cache.size;
      this.updateMemoryUsage();
      logger.debug(`从localStorage恢复缓存: ${loadedCount.toString()}项 (${this.config.storageKey})`);
    } catch (error: unknown) {
      logger.warn('从localStorage加载缓存失败', error);
    }
  }
}

export const LRUCache = AdvancedCache;
