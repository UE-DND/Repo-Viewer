import { logger } from '../../utils';

// 缓存配置
export interface CacheConfig {
  // 基础TTL配置
  defaultTTL: number;
  maxTTL: number;
  minTTL: number;

  // 自适应TTL配置
  enableAdaptiveTTL: boolean;
  frequentAccessThreshold: number; // 高频访问阈值
  frequentAccessMultiplier: number; // 高频访问TTL倍数

  // 缓存大小配置
  maxSize: number;
  memoryPressureThreshold: number; // 内存压力阈值（0-1）

  // 持久化配置
  enablePersistence: boolean;
  useIndexedDB: boolean; // 优先使用IndexedDB而不是localStorage
  storageKey: string;

  // 预加载配置
  enablePrefetch: boolean;
  prefetchDelay: number; // 预加载延迟（毫秒）
}

// 默认缓存配置
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  defaultTTL: 5 * 60 * 1000, // 5分钟（增加到5分钟）
  maxTTL: 60 * 60 * 1000, // 最大1小时
  minTTL: 30 * 1000, // 最小30秒

  enableAdaptiveTTL: true,
  frequentAccessThreshold: 3, // 3次访问视为高频
  frequentAccessMultiplier: 3, // 高频访问TTL延长3倍

  maxSize: 100, // 增加到100个条目
  memoryPressureThreshold: 0.8,

  enablePersistence: true,
  useIndexedDB: true,
  storageKey: '',

  enablePrefetch: true,
  prefetchDelay: 100
};

// 内容类型特定配置
export const CONTENT_CACHE_CONFIG: CacheConfig = {
  ...DEFAULT_CACHE_CONFIG,
  defaultTTL: 10 * 60 * 1000, // 目录内容缓存10分钟
  storageKey: 'repo_viewer_content_cache_v2'
};

export const FILE_CACHE_CONFIG: CacheConfig = {
  ...DEFAULT_CACHE_CONFIG,
  defaultTTL: 30 * 60 * 1000, // 文件内容缓存30分钟
  maxTTL: 2 * 60 * 60 * 1000, // 最大2小时
  storageKey: 'repo_viewer_file_cache_v2'
};

// 缓存统计接口
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  memoryUsage: number;
  lastCleanup: number;
}

// 缓存项元数据
interface CacheItemMeta {
  value: any;
  timestamp: number;
  accessCount: number;
  lastAccess: number;
  size: number;
  version: string;
}

// 缓存实现，支持自适应TTL和智能清理
export class AdvancedCache<K, V> {
  private cache: Map<K, CacheItemMeta>;
  private config: CacheConfig;
  private stats: CacheStats;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private dbName: string;
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
      lastCleanup: Date.now()
    };

    // 为每个缓存实例生成唯一的数据库名称
    this.dbName = `RepoViewerCache_${this.config.storageKey.replace(/[^a-zA-Z0-9]/g, '_')}`;

    // 初始化持久化存储
    if (this.config.enablePersistence) {
      this.initializePersistence();
    }

    // 启动定期清理
    this.startPeriodicCleanup();
  }

  // 初始化持久化存储
  public async initializePersistence(): Promise<void> {
    if (this.config.useIndexedDB && typeof indexedDB !== 'undefined') {
      try {
        await this.initIndexedDB();
        await this.loadFromIndexedDB();
        logger.debug(`IndexedDB初始化成功: ${this.config.storageKey}`);
      } catch (error) {
        logger.warn(`IndexedDB初始化失败，尝试重新初始化: ${this.config.storageKey}`, error);

        // 尝试删除损坏的数据库并重新创建
        try {
          if (this.db) {
            this.db.close();
            this.db = null;
          }

          // 删除损坏的数据库
          await this.deleteDatabase();

          // 重新初始化
          await this.initIndexedDB();
          await this.loadFromIndexedDB();
          logger.info(`IndexedDB重新初始化成功: ${this.config.storageKey}`);
        } catch (retryError) {
          logger.warn(`IndexedDB重新初始化失败，回退到localStorage: ${this.config.storageKey}`, retryError);
          this.config.useIndexedDB = false;
          await this.loadFromLocalStorage();
        }
      }
    } else if (typeof localStorage !== 'undefined') {
      await this.loadFromLocalStorage();
    }
  }

  // 删除数据库
  private deleteDatabase(): Promise<void> {
    return new Promise((resolve) => {
      try {
        const deleteRequest = indexedDB.deleteDatabase(this.dbName);

        deleteRequest.onsuccess = () => {
          logger.debug(`删除IndexedDB数据库成功: ${this.dbName}`);
          resolve();
        };

        deleteRequest.onerror = () => {
          logger.warn(`删除IndexedDB数据库失败: ${this.dbName}`, deleteRequest.error);
          resolve();
        };

        deleteRequest.onblocked = () => {
          logger.warn(`删除IndexedDB数据库被阻塞: ${this.dbName}`);
          setTimeout(() => resolve(), 1000);
        };
      } catch (error) {
        logger.warn(`删除IndexedDB数据库异常: ${this.dbName}`, error);
        resolve();
      }
    });
  }

  // 初始化IndexedDB
  private initIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      // 先尝试获取当前数据库版本
      const versionRequest = indexedDB.open(this.dbName);

      versionRequest.onsuccess = () => {
        const currentDb = versionRequest.result;
        const needsUpgrade = !currentDb.objectStoreNames.contains(this.config.storageKey);
        const currentVersion = currentDb.version;
        currentDb.close();

        // 使用正确的版本号打开数据库
        const targetVersion = needsUpgrade ? currentVersion + 1 : currentVersion;
        const request = indexedDB.open(this.dbName, targetVersion);

        request.onerror = () => {
          logger.warn('IndexedDB打开失败', request.error);
          reject(request.error);
        };

        request.onsuccess = () => {
          this.db = request.result;

          // 添加错误处理和版本变更监听
          this.db.onerror = (event) => {
            logger.warn('IndexedDB运行时错误', event);
          };

          this.db.onversionchange = () => {
            logger.info('IndexedDB版本变更，关闭连接');
            this.db?.close();
            this.db = null;
          };

          resolve();
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          try {
            // 创建object store（如果不存在）
            if (!db.objectStoreNames.contains(this.config.storageKey)) {
              const store = db.createObjectStore(this.config.storageKey, { keyPath: 'key' });
              store.createIndex('timestamp', 'timestamp', { unique: false });
              store.createIndex('lastAccess', 'lastAccess', { unique: false });
              logger.debug(`创建IndexedDB object store: ${this.config.storageKey}`);
            }
          } catch (error) {
            logger.warn('创建IndexedDB object store失败', error);
            throw error;
          }
        };

        request.onblocked = () => {
          logger.warn('IndexedDB升级被阻塞，可能有其他标签页正在使用数据库');
          setTimeout(() => {
            reject(new Error('IndexedDB升级被阻塞'));
          }, 5000);
        };
      };

      versionRequest.onerror = () => {
        // 如果获取版本失败，尝试直接创建新数据库
        logger.debug('无法获取IndexedDB版本，尝试创建新数据库');
        const request = indexedDB.open(this.dbName, 1);

        request.onerror = () => {
          logger.warn('IndexedDB创建失败', request.error);
          reject(request.error);
        };

        request.onsuccess = () => {
          this.db = request.result;
          resolve();
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          try {
            if (!db.objectStoreNames.contains(this.config.storageKey)) {
              const store = db.createObjectStore(this.config.storageKey, { keyPath: 'key' });
              store.createIndex('timestamp', 'timestamp', { unique: false });
              store.createIndex('lastAccess', 'lastAccess', { unique: false });
              logger.debug(`创建IndexedDB object store: ${this.config.storageKey}`);
            }
          } catch (error) {
            logger.warn('创建IndexedDB object store失败', error);
            throw error;
          }
        };
      };
    });
  }

  // 获取缓存项（增强版）
  async get(key: K): Promise<V | undefined> {
    const keyStr = String(key);
    let item = this.cache.get(key);

    // 如果内存中没有，尝试从持久化存储加载
    if (!item && this.config.enablePersistence) {
      item = await this.loadItemFromPersistence(keyStr);
      if (item) {
        this.cache.set(key, item);
      }
    }

    if (!item) {
      this.stats.misses++;
      this.updateHitRate();
      return undefined;
    }

    const now = Date.now();
    const ttl = this.calculateTTL(item);

    // 检查是否过期
    if (now - item.timestamp > ttl) {
      await this.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return undefined;
    }

    // 更新访问统计
    item.accessCount++;
    item.lastAccess = now;

    // 刷新缓存顺序（LRU特性）
    this.cache.delete(key);
    this.cache.set(key, item);

    // 异步保存到持久化存储
    if (this.config.enablePersistence) {
      this.saveItemToPersistence(keyStr, item).catch(error => {
        logger.warn('保存缓存项到持久化存储失败', error);
      });
    }

    this.stats.hits++;
    this.updateHitRate();
    return item.value;
  }

  // 计算动态TTL
  private calculateTTL(item: CacheItemMeta): number {
    if (!this.config.enableAdaptiveTTL) {
      return this.config.defaultTTL;
    }

    let ttl = this.config.defaultTTL;

    // 高频访问延长TTL
    if (item.accessCount >= this.config.frequentAccessThreshold) {
      ttl *= this.config.frequentAccessMultiplier;
    }

    // 限制在最大和最小TTL之间
    return Math.min(Math.max(ttl, this.config.minTTL), this.config.maxTTL);
  }

  // 设置缓存项（增强版）
  async set(key: K, value: V, version: string = '1.0'): Promise<void> {
    const now = Date.now();
    const keyStr = String(key);

    // 检查内存压力并清理
    await this.checkMemoryPressureAndCleanup();

    // 估算缓存项大小
    const size = this.estimateSize(value);

    const item: CacheItemMeta = {
      value,
      timestamp: now,
      accessCount: 1,
      lastAccess: now,
      size,
      version
    };

    this.cache.set(key, item);
    this.stats.size = this.cache.size;
    this.updateMemoryUsage();

    // 异步保存到持久化存储
    if (this.config.enablePersistence) {
      this.saveItemToPersistence(keyStr, item).catch(error => {
        logger.warn('保存缓存项到持久化存储失败', error);
      });
    }
  }

  // 检查内存压力并清理
  private async checkMemoryPressureAndCleanup(): Promise<void> {
    const currentLoad = this.cache.size / this.config.maxSize;

    if (currentLoad >= this.config.memoryPressureThreshold) {
      const itemsToRemove = Math.floor(this.config.maxSize * 0.2); // 清理20%
      await this.cleanupLeastUsed(itemsToRemove);
      logger.debug(`内存压力清理：删除了${itemsToRemove}个最少使用的缓存项`);
    }
  }

  // 清理最少使用的缓存项
  private async cleanupLeastUsed(count: number): Promise<void> {
    const items = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => {
        // 按访问频率和最后访问时间排序
        const scoreA = a.accessCount * 1000 + a.lastAccess;
        const scoreB = b.accessCount * 1000 + b.lastAccess;
        return scoreA - scoreB;
      })
      .slice(0, count);

    for (const [key] of items) {
      await this.delete(key);
    }
  }

  // 估算对象大小
  private estimateSize(obj: any): number {
    try {
      return new Blob([JSON.stringify(obj)]).size;
    } catch {
      return 1024; // 默认1KB
    }
  }

  // 删除缓存项（增强版）
  async delete(key: K): Promise<boolean> {
    const keyStr = String(key);
    const result = this.cache.delete(key);

    if (result) {
      this.stats.size = this.cache.size;
      this.updateMemoryUsage();

      // 从持久化存储删除
      if (this.config.enablePersistence) {
        await this.deleteItemFromPersistence(keyStr).catch(error => {
          logger.warn('从持久化存储删除缓存项失败', error);
        });
      }
    }

    return result;
  }

  // 清除所有缓存（增强版）
  async clear(): Promise<void> {
    this.cache.clear();
    this.stats.size = 0;
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.updateMemoryUsage();
    this.updateHitRate();

    // 清除持久化存储
    if (this.config.enablePersistence) {
      await this.clearPersistence().catch(error => {
        logger.warn('清除持久化存储失败', error);
      });
    }
  }

  // 获取缓存大小
  size(): number {
    return this.cache.size;
  }

  // 获取缓存统计
  getStats(): CacheStats {
    return { ...this.stats };
  }

  // 更新命中率
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  // 更新内存使用量
  private updateMemoryUsage(): void {
    let totalSize = 0;
    this.cache.forEach(item => {
      totalSize += item.size;
    });
    this.stats.memoryUsage = totalSize;
  }

  // 启动定期清理
  private startPeriodicCleanup(): void {
    // 每5分钟执行一次清理
    this.cleanupTimer = setInterval(() => {
      this.performPeriodicCleanup().catch(error => {
        logger.warn('定期清理失败', error);
      });
    }, 5 * 60 * 1000);
  }

  // 执行定期清理
  private async performPeriodicCleanup(): Promise<void> {
    const now = Date.now();
    const expiredKeys: K[] = [];

    // 查找过期项
    this.cache.forEach((item, key) => {
      const ttl = this.calculateTTL(item);
      if (now - item.timestamp > ttl) {
        expiredKeys.push(key);
      }
    });

    // 删除过期项
    for (const key of expiredKeys) {
      await this.delete(key);
    }

    this.stats.lastCleanup = now;

    if (expiredKeys.length > 0) {
      logger.debug(`定期清理：删除了${expiredKeys.length}个过期缓存项`);
    }
  }

  // 预加载相关内容
  async prefetch(keys: K[]): Promise<void> {
    if (!this.config.enablePrefetch) return;

    setTimeout(async () => {
      for (const key of keys) {
        try {
          await this.get(key); // 这会触发从持久化存储加载
        } catch (error) {
          logger.debug(`预加载失败: ${key}`, error);
        }
      }
    }, this.config.prefetchDelay);
  }

  // 销毁缓存实例
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    if (this.db) {
      this.db.close();
      this.db = null;
    }

    this.cache.clear();
  }

  // IndexedDB操作方法
  private async loadItemFromPersistence(key: string): Promise<CacheItemMeta | undefined> {
    if (this.config.useIndexedDB && this.db) {
      return this.loadItemFromIndexedDB(key);
    } else {
      return this.loadItemFromLocalStorage(key);
    }
  }

  private async saveItemToPersistence(key: string, item: CacheItemMeta): Promise<void> {
    if (this.config.useIndexedDB && this.db) {
      return this.saveItemToIndexedDB(key, item);
    } else {
      return this.saveItemToLocalStorage(key, item);
    }
  }

  private async deleteItemFromPersistence(key: string): Promise<void> {
    if (this.config.useIndexedDB && this.db) {
      return this.deleteItemFromIndexedDB(key);
    } else {
      return this.deleteItemFromLocalStorage(key);
    }
  }

  private async clearPersistence(): Promise<void> {
    if (this.config.useIndexedDB && this.db) {
      return this.clearIndexedDB();
    } else {
      return this.clearLocalStorage();
    }
  }

  // IndexedDB具体操作
  private loadItemFromIndexedDB(key: string): Promise<CacheItemMeta | undefined> {
    return new Promise((resolve) => {
      if (!this.db) {
        resolve(undefined);
        return;
      }

      try {
        if (!this.db.objectStoreNames.contains(this.config.storageKey)) {
          logger.debug(`Object store ${this.config.storageKey} 不存在`);
          resolve(undefined);
          return;
        }

        const transaction = this.db.transaction([this.config.storageKey], 'readonly');
        const store = transaction.objectStore(this.config.storageKey);
        const request = store.get(key);

        request.onsuccess = () => {
          const result = request.result;
          resolve(result ? result.data : undefined);
        };

        request.onerror = () => {
          logger.debug(`从IndexedDB加载项目失败: ${key}`, request.error);
          resolve(undefined); // 发生错误时返回undefined而不是reject
        };

        transaction.onerror = () => {
          logger.debug(`IndexedDB事务失败: ${key}`, transaction.error);
          resolve(undefined);
        };

        transaction.onabort = () => {
          logger.debug(`IndexedDB事务被中止: ${key}`);
          resolve(undefined);
        };
      } catch (error) {
        logger.debug(`IndexedDB访问异常: ${key}`, error);
        resolve(undefined);
      }
    });
  }

  private saveItemToIndexedDB(key: string, item: CacheItemMeta): Promise<void> {
    return new Promise((resolve) => {
      if (!this.db) {
        resolve();
        return;
      }

      try {
        if (!this.db.objectStoreNames.contains(this.config.storageKey)) {
          logger.debug(`Object store ${this.config.storageKey} 不存在，跳过保存`);
          resolve();
          return;
        }

        const transaction = this.db.transaction([this.config.storageKey], 'readwrite');
        const store = transaction.objectStore(this.config.storageKey);
        const request = store.put({ key, data: item, timestamp: item.timestamp, lastAccess: item.lastAccess });

        request.onsuccess = () => resolve();
        request.onerror = () => {
          logger.debug(`保存到IndexedDB失败: ${key}`, request.error);
          resolve(); // 发生错误时也resolve，避免阻塞
        };

        transaction.onerror = () => {
          logger.debug(`IndexedDB事务失败: ${key}`, transaction.error);
          resolve();
        };

        transaction.onabort = () => {
          logger.debug(`IndexedDB事务被中止: ${key}`);
          resolve();
        };
      } catch (error) {
        logger.debug(`IndexedDB保存异常: ${key}`, error);
        resolve();
      }
    });
  }

  private deleteItemFromIndexedDB(key: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.db) {
        resolve();
        return;
      }

      try {
        if (!this.db.objectStoreNames.contains(this.config.storageKey)) {
          resolve();
          return;
        }

        const transaction = this.db.transaction([this.config.storageKey], 'readwrite');
        const store = transaction.objectStore(this.config.storageKey);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => {
          logger.debug(`从IndexedDB删除失败: ${key}`, request.error);
          resolve();
        };

        transaction.onerror = () => {
          logger.debug(`IndexedDB删除事务失败: ${key}`, transaction.error);
          resolve();
        };

        transaction.onabort = () => {
          logger.debug(`IndexedDB删除事务被中止: ${key}`);
          resolve();
        };
      } catch (error) {
        logger.debug(`IndexedDB删除异常: ${key}`, error);
        resolve();
      }
    });
  }

  private clearIndexedDB(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.db) {
        resolve();
        return;
      }

      try {
        if (!this.db.objectStoreNames.contains(this.config.storageKey)) {
          resolve();
          return;
        }

        const transaction = this.db.transaction([this.config.storageKey], 'readwrite');
        const store = transaction.objectStore(this.config.storageKey);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => {
          logger.debug(`清除IndexedDB失败`, request.error);
          resolve();
        };

        transaction.onerror = () => {
          logger.debug(`IndexedDB清除事务失败`, transaction.error);
          resolve();
        };

        transaction.onabort = () => {
          logger.debug(`IndexedDB清除事务被中止`);
          resolve();
        };
      } catch (error) {
        logger.debug(`IndexedDB清除异常`, error);
        resolve();
      }
    });
  }

  private async loadFromIndexedDB(): Promise<void> {
    if (!this.db) {
      logger.debug('IndexedDB连接不存在，跳过加载');
      return;
    }

    return new Promise((resolve) => {
      try {
        if (!this.db!.objectStoreNames.contains(this.config.storageKey)) {
          logger.debug(`Object store ${this.config.storageKey} 不存在，跳过加载`);
          resolve();
          return;
        }

        const transaction = this.db!.transaction([this.config.storageKey], 'readonly');
        const store = transaction.objectStore(this.config.storageKey);
        const request = store.getAll();

        request.onsuccess = () => {
          const items = request.result;
          let loadedCount = 0;

          items.forEach((item: any) => {
            try {
              const now = Date.now();
              const ttl = this.config.defaultTTL;

              // 检查是否过期
              if (item.data && now - item.timestamp <= ttl) {
                this.cache.set(item.key as K, item.data);
                loadedCount++;
              }
            } catch (error) {
              logger.debug(`加载缓存项失败: ${item.key}`, error);
            }
          });

          this.stats.size = this.cache.size;
          this.updateMemoryUsage();
          logger.debug(`从IndexedDB恢复缓存: ${loadedCount}项 (${this.config.storageKey})`);
          resolve();
        };

        request.onerror = () => {
          logger.debug(`从IndexedDB加载失败`, request.error);
          resolve(); // 加载失败也resolve，让系统继续运行
        };

        transaction.onerror = () => {
          logger.debug(`IndexedDB加载事务失败`, transaction.error);
          resolve();
        };

        transaction.onabort = () => {
          logger.debug(`IndexedDB加载事务被中止`);
          resolve();
        };
      } catch (error) {
        logger.debug(`IndexedDB加载异常`, error);
        resolve();
      }
    });
  }

  // localStorage操作方法
  private loadItemFromLocalStorage(key: string): Promise<CacheItemMeta | undefined> {
    return new Promise((resolve) => {
      try {
        const item = localStorage.getItem(`${this.config.storageKey}_${key}`);
        if (item) {
          const parsed = JSON.parse(item);
          resolve(parsed);
        } else {
          resolve(undefined);
        }
      } catch (error) {
        logger.warn('从localStorage加载缓存项失败', error);
        resolve(undefined);
      }
    });
  }

  private saveItemToLocalStorage(key: string, item: CacheItemMeta): Promise<void> {
    return new Promise((resolve) => {
      try {
        localStorage.setItem(`${this.config.storageKey}_${key}`, JSON.stringify(item));
        resolve();
      } catch (error) {
        logger.warn('保存缓存项到localStorage失败', error);
        resolve();
      }
    });
  }

  private deleteItemFromLocalStorage(key: string): Promise<void> {
    return new Promise((resolve) => {
      try {
        localStorage.removeItem(`${this.config.storageKey}_${key}`);
        resolve();
      } catch (error) {
        logger.warn('从localStorage删除缓存项失败', error);
        resolve();
      }
    });
  }

  private clearLocalStorage(): Promise<void> {
    return new Promise((resolve) => {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(`${this.config.storageKey}_`)) {
            keysToRemove.push(key);
          }
        }

        keysToRemove.forEach(key => localStorage.removeItem(key));
        resolve();
      } catch (error) {
        logger.warn('清除localStorage失败', error);
        resolve();
      }
    });
  }

  private async loadFromLocalStorage(): Promise<void> {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${this.config.storageKey}_`)) {
          keys.push(key.substring(`${this.config.storageKey}_`.length));
        }
      }

      let loadedCount = 0;
      for (const key of keys) {
        const item = await this.loadItemFromLocalStorage(key);
        if (item) {
          const now = Date.now();
          const ttl = this.calculateTTL(item);

          // 检查是否过期
          if (now - item.timestamp <= ttl) {
            this.cache.set(key as any as K, item);
            loadedCount++;
          }
        }
      }

      this.stats.size = this.cache.size;
      this.updateMemoryUsage();
      logger.debug(`从localStorage恢复缓存: ${loadedCount}项 (${this.config.storageKey})`);
    } catch (error) {
      logger.warn('从localStorage加载缓存失败', error);
    }
  }
}

// 向后兼容的LRU缓存别名
export const LRUCache = AdvancedCache;

// 增强的缓存管理器类
export class CacheManager {
  private static contentCache: AdvancedCache<string, any>;
  private static fileCache: AdvancedCache<string, string>;
  private static initialized = false;

  // 初始化缓存
  public static async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.contentCache = new AdvancedCache<string, any>(CONTENT_CACHE_CONFIG);
      this.fileCache = new AdvancedCache<string, string>(FILE_CACHE_CONFIG);

      // 等待缓存初始化完成
      await Promise.all([
        this.contentCache.initializePersistence() || Promise.resolve(),
        this.fileCache.initializePersistence() || Promise.resolve()
      ]);

      this.initialized = true;
      logger.info('缓存管理器初始化完成');
    } catch (error) {
      logger.error('缓存管理器初始化失败', error);
      throw error;
    }
  }

  // 获取内容缓存
  public static getContentCache(): AdvancedCache<string, any> {
    if (!this.contentCache) {
      // 同步初始化作为后备
      this.contentCache = new AdvancedCache<string, any>(CONTENT_CACHE_CONFIG);
    }
    return this.contentCache;
  }

  // 获取文件缓存
  public static getFileCache(): AdvancedCache<string, string> {
    if (!this.fileCache) {
      // 同步初始化作为后备
      this.fileCache = new AdvancedCache<string, string>(FILE_CACHE_CONFIG);
    }
    return this.fileCache;
  }

  // 清除所有缓存
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

  // 获取缓存统计信息
  public static getCacheStats(): { content: CacheStats; file: CacheStats } {
    return {
      content: this.contentCache?.getStats() || {
        hits: 0, misses: 0, size: 0, hitRate: 0, memoryUsage: 0, lastCleanup: 0
      },
      file: this.fileCache?.getStats() || {
        hits: 0, misses: 0, size: 0, hitRate: 0, memoryUsage: 0, lastCleanup: 0
      }
    };
  }

  // 预加载相关内容
  public static async prefetchContent(paths: string[]): Promise<void> {
    if (this.contentCache && this.contentCache.prefetch) {
      await this.contentCache.prefetch(paths);
    }
  }

  // 预加载相关文件
  public static async prefetchFiles(urls: string[]): Promise<void> {
    if (this.fileCache && this.fileCache.prefetch) {
      await this.fileCache.prefetch(urls);
    }
  }

  // 销毁缓存管理器
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
