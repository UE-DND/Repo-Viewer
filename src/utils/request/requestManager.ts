/**
 * 统一的请求管理器
 * 
 * 提供请求取消、防抖和竞态条件处理。
 */

import { logger } from '@/utils';

/**
 * 请求选项
 */
export interface RequestOptions {
  /**
   * 防抖延迟（毫秒）
   */
  debounce?: number;
  
  /**
   * 请求优先级
   */
  priority?: 'high' | 'medium' | 'low';
  
  /**
   * 是否记录详细日志
   */
  verbose?: boolean;
}

/**
 * 请求管理器类
 * 
 * 统一管理 HTTP 请求，提供以下功能：
 * - 自动取消重复的请求
 * - 防抖机制减少请求频率
 * - 请求优先级管理
 * - 统一的错误处理
 */
export class RequestManager {
  private pendingRequests = new Map<string, AbortController>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  /**
   * 发起请求
   * 
   * 自动管理请求的生命周期，包括取消、防抖等。
   * 
   * @param key - 请求的唯一标识符
   * @param fetcher - 请求函数，接收 AbortSignal 参数
   * @param options - 请求选项
   * @returns Promise，解析为请求结果
   * 
   * @example
   * ```typescript
   * const contents = await requestManager.request(
   *   `contents-${path}`,
   *   (signal) => GitHub.Content.getContents(path, signal),
   *   { debounce: 300 }
   * );
   * ```
   */
  async request<T>(
    key: string,
    fetcher: (signal: AbortSignal) => Promise<T>,
    options: RequestOptions = {}
  ): Promise<T> {
    const { debounce, verbose = false } = options;

    // 取消之前的同 key 请求
    this.cancel(key);

    // 如果设置了防抖，等待防抖延迟
    if (debounce !== undefined && debounce > 0) {
      if (verbose) {
        logger.debug(`请求防抖: ${key}, 延迟 ${debounce.toString()}ms`);
      }

      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          this.debounceTimers.delete(key);
          resolve();
        }, debounce);
        this.debounceTimers.set(key, timer);
      });
    }

    // 创建新的 AbortController
    const controller = new AbortController();
    this.pendingRequests.set(key, controller);

    if (verbose) {
      logger.debug(`开始请求: ${key}`);
    }

    try {
      const result = await fetcher(controller.signal);
      
      // 请求成功，清理
      this.pendingRequests.delete(key);
      
      if (verbose) {
        logger.debug(`请求成功: ${key}`);
      }
      
      return result;
    } catch (error) {
      // 清理
      this.pendingRequests.delete(key);

      // 如果是取消错误，不记录日志
      if (error instanceof Error && error.name === 'AbortError') {
        if (verbose) {
          logger.debug(`请求已取消: ${key}`);
        }
        throw error;
      }

      // 其他错误正常记录
      logger.error(`请求失败: ${key}`, error);
      throw error;
    }
  }

  /**
   * 取消指定的请求
   * 
   * @param key - 请求的唯一标识符
   * @returns 是否成功取消（如果请求不存在则返回 false）
   */
  cancel(key: string): boolean {
    // 清除防抖定时器
    const timer = this.debounceTimers.get(key);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.debounceTimers.delete(key);
    }

    // 取消请求
    const controller = this.pendingRequests.get(key);
    if (controller !== undefined) {
      controller.abort();
      this.pendingRequests.delete(key);
      logger.debug(`已取消请求: ${key}`);
      return true;
    }

    return false;
  }

  /**
   * 取消所有进行中的请求
   * 
   * @returns 取消的请求数量
   */
  cancelAll(): number {
    // 清除所有防抖定时器
    this.debounceTimers.forEach((timer) => {
      clearTimeout(timer);
    });
    this.debounceTimers.clear();

    // 取消所有请求
    const count = this.pendingRequests.size;
    this.pendingRequests.forEach((controller) => {
      controller.abort();
    });
    this.pendingRequests.clear();

    if (count > 0) {
      logger.debug(`已取消 ${count.toString()} 个请求`);
    }

    return count;
  }

  /**
   * 检查指定的请求是否正在进行
   * 
   * @param key - 请求的唯一标识符
   * @returns 如果请求正在进行返回 true
   */
  isPending(key: string): boolean {
    return this.pendingRequests.has(key) || this.debounceTimers.has(key);
  }

  /**
   * 获取进行中的请求数量
   * 
   * @returns 进行中的请求数量
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * 获取所有进行中的请求 key
   * 
   * @returns 请求 key 数组
   */
  getPendingKeys(): string[] {
    return Array.from(this.pendingRequests.keys());
  }

  /**
   * 清理资源
   * 
   * 取消所有请求并清理定时器。
   */
  cleanup(): void {
    this.cancelAll();
  }
}

/**
 * 全局请求管理器实例
 */
export const requestManager = new RequestManager();

/**
 * 在应用卸载时清理资源
 */
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    requestManager.cleanup();
  });
}

