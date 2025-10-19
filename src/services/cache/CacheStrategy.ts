/**
 * 智能缓存策略
 * 
 * 实现了带有TTL、stale-while-revalidate和标签系统的智能缓存策略。
 */

import { logger } from '@/utils';

/**
 * 缓存配置选项
 */
export interface CacheOptions {
  /** 生存时间（毫秒），超过此时间缓存被视为过期 */
  ttl?: number;
  /** 后台刷新时间（毫秒），在此时间内返回旧值并后台刷新 */
  staleWhileRevalidate?: number;
  /** 缓存标签，用于批量失效 */
  tags?: string[];
}

/**
 * 缓存项
 */
interface CachedItem<T = unknown> {
  value: T;
  timestamp: number;
  tags: string[];
}

/**
 * 智能缓存策略类
 * 
 * 提供了基于时间的缓存管理和后台刷新机制。
 */
export class SmartCacheStrategy {
  private cache = new Map<string, CachedItem>();
  private revalidationQueue = new Set<string>();

  /**
   * 获取缓存值，如果缓存未命中或过期则调用 fetcher 获取新值
   * 
   * @param key - 缓存键
   * @param fetcher - 获取数据的函数
   * @param options - 缓存选项
   * @returns 缓存的值或新获取的值
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();

    // 缓存未命中
    if (cached === undefined) {
      logger.debug(`缓存未命中: ${key}`);
      const value = await fetcher();
      this.set(key, value, options);
      return value;
    }

    const age = now - cached.timestamp;
    const { ttl = 300000, staleWhileRevalidate = 600000 } = options;

    // 缓存新鲜，直接返回
    if (age < ttl) {
      logger.debug(`缓存命中（新鲜）: ${key}, 年龄: ${age.toString()}ms`);
      return cached.value as T;
    }

    // 缓存过期但在后台刷新窗口内
    if (age < staleWhileRevalidate) {
      logger.debug(`缓存命中（陈旧）: ${key}, 年龄: ${age.toString()}ms, 后台刷新中`);
      // 后台刷新
      if (!this.revalidationQueue.has(key)) {
        this.revalidationQueue.add(key);
        void this.revalidate(key, fetcher, options);
      }
      // 返回旧值
      return cached.value as T;
    }

    // 缓存完全过期，重新获取
    logger.debug(`缓存过期: ${key}, 年龄: ${age.toString()}ms`);
    const value = await fetcher();
    this.set(key, value, options);
    return value;
  }

  /**
   * 后台刷新缓存
   * 
   * @param key - 缓存键
   * @param fetcher - 获取数据的函数
   * @param options - 缓存选项
   */
  private async revalidate<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions
  ): Promise<void> {
    try {
      const value = await fetcher();
      this.set(key, value, options);
      logger.debug(`后台刷新成功: ${key}`);
    } catch (error) {
      logger.error(`后台刷新失败: ${key}`, error);
    } finally {
      this.revalidationQueue.delete(key);
    }
  }

  /**
   * 设置缓存值
   * 
   * @param key - 缓存键
   * @param value - 缓存值
   * @param options - 缓存选项
   */
  private set(key: string, value: unknown, options: CacheOptions): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      tags: options.tags ?? [],
    });
  }

  /**
   * 按标签失效缓存
   * 
   * @param tag - 缓存标签
   * @returns 失效的缓存项数量
   */
  invalidateByTag(tag: string): number {
    let count = 0;
    for (const [key, item] of this.cache.entries()) {
      if (item.tags.includes(tag)) {
        this.cache.delete(key);
        count++;
      }
    }
    if (count > 0) {
      logger.debug(`按标签失效缓存: ${tag}, 失效 ${count.toString()} 项`);
    }
    return count;
  }

  /**
   * 删除指定的缓存项
   * 
   * @param key - 缓存键
   * @returns 是否成功删除
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
    this.revalidationQueue.clear();
    logger.debug('清空所有缓存');
  }

  /**
   * 获取缓存统计信息
   * 
   * @returns 缓存统计信息
   */
  getStats(): {
    size: number;
    revalidating: number;
    keys: string[];
  } {
    return {
      size: this.cache.size,
      revalidating: this.revalidationQueue.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * 检查缓存是否存在且新鲜
   * 
   * @param key - 缓存键
   * @param ttl - 生存时间（毫秒）
   * @returns 是否存在且新鲜
   */
  isFresh(key: string, ttl = 300000): boolean {
    const cached = this.cache.get(key);
    if (cached === undefined) {
      return false;
    }
    const age = Date.now() - cached.timestamp;
    return age < ttl;
  }
}

/**
 * 全局智能缓存策略实例
 */
export const cacheStrategy = new SmartCacheStrategy();

