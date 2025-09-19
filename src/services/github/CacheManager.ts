import { logger } from '../../utils';

// 缓存配置
export const CACHE_TTL = 60000; // 缓存有效期，单位毫秒（1分钟）
export const MAX_CACHE_SIZE = 50; // 最大缓存条目数量
export const STORAGE_KEY_CONTENT_CACHE = 'repo_viewer_content_cache';
export const STORAGE_KEY_FILE_CACHE = 'repo_viewer_file_cache';
export const PERSISTENT_CACHE_ENABLED = true; // 是否启用持久化缓存

// 自定义缓存实现，LRU策略
export class LRUCache<K, V> {
  private cache: Map<K, { value: V, timestamp: number }>;
  private maxSize: number;
  private storageKey: string | undefined;
  
  constructor(maxSize: number, storageKey?: string) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.storageKey = storageKey;
    
    // 从localStorage加载缓存
    if (PERSISTENT_CACHE_ENABLED && storageKey && typeof localStorage !== 'undefined') {
      this.loadFromStorage();
    }
  }
  
  // 获取缓存项
  get(key: K): V | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;
    
    // 检查是否过期
    const now = Date.now();
    if (now - item.timestamp > CACHE_TTL) {
      this.cache.delete(key);
      this.saveToStorage();
      return undefined;
    }
    
    // 刷新缓存顺序（LRU特性）
    this.cache.delete(key);
    this.cache.set(key, item);
    
    return item.value;
  }
  
  // 设置缓存项
  set(key: K, value: V): void {
    // 检查是否需要删除最旧的条目
    if (this.cache.size >= this.maxSize) {
      const iterator = this.cache.keys();
      const firstResult = iterator.next();
      if (!firstResult.done && firstResult.value !== undefined) {
        this.cache.delete(firstResult.value);
      }
    }
    
    this.cache.set(key, { value, timestamp: Date.now() });
    
    // 保存到localStorage
    if (PERSISTENT_CACHE_ENABLED && this.storageKey) {
      this.saveToStorage();
    }
  }
  
  // 删除缓存项
  delete(key: K): boolean {
    const result = this.cache.delete(key);
    if (result && PERSISTENT_CACHE_ENABLED && this.storageKey) {
      this.saveToStorage();
    }
    return result;
  }
  
  // 清除所有缓存
  clear(): void {
    this.cache.clear();
    if (PERSISTENT_CACHE_ENABLED && this.storageKey && typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(this.storageKey);
      } catch (e) {
        console.error('清除缓存存储失败:', e);
      }
    }
  }
  
  // 获取缓存大小
  size(): number {
    return this.cache.size;
  }
  
  // 保存缓存到localStorage
  private saveToStorage(): void {
    if (!this.storageKey || typeof localStorage === 'undefined') return;
    
    try {
      // 转换为可序列化的数据结构
      const serializable: { [key: string]: { value: any, timestamp: number } } = {};
      this.cache.forEach((value, key) => {
        // 只能使用字符串作为键
        const stringKey = String(key);
        serializable[stringKey] = value;
      });
      
      localStorage.setItem(this.storageKey, JSON.stringify(serializable));
    } catch (e) {
      console.error('保存缓存到localStorage失败:', e);
    }
  }
  
  // 从localStorage加载缓存
  private loadFromStorage(): void {
    if (!this.storageKey || typeof localStorage === 'undefined') return;
    
    try {
      const storedData = localStorage.getItem(this.storageKey);
      if (!storedData) return;
      
      const parsed = JSON.parse(storedData);
      
      // 恢复缓存数据
      Object.keys(parsed).forEach(key => {
        const item = parsed[key];
        // 检查是否过期
        if (Date.now() - item.timestamp <= CACHE_TTL) {
          // 使用字符串键，但尊重原始键类型（尽可能）
          this.cache.set(key as any as K, item);
        }
      });
      
      logger.debug(`从localStorage恢复缓存: ${this.cache.size}项 (${this.storageKey})`);
    } catch (e) {
      console.error('从localStorage加载缓存失败:', e);
    }
  }
}

// 缓存管理器类
export class CacheManager {
  private static contentCache: LRUCache<string, any>;
  private static fileCache: LRUCache<string, string>;
  
  // 初始化缓存
  public static initialize(): void {
    this.contentCache = new LRUCache<string, any>(MAX_CACHE_SIZE, STORAGE_KEY_CONTENT_CACHE);
    this.fileCache = new LRUCache<string, string>(MAX_CACHE_SIZE, STORAGE_KEY_FILE_CACHE);
  }
  
  // 获取内容缓存
  public static getContentCache(): LRUCache<string, any> {
    if (!this.contentCache) {
      this.initialize();
    }
    return this.contentCache;
  }
  
  // 获取文件缓存
  public static getFileCache(): LRUCache<string, string> {
    if (!this.fileCache) {
      this.initialize();
    }
    return this.fileCache;
  }
  
  // 清除所有缓存
  public static clearAllCaches(): void {
    if (this.contentCache) {
      this.contentCache.clear();
    }
    if (this.fileCache) {
      this.fileCache.clear();
    }
    logger.info('已清除所有API缓存');
  }
}