import { logger } from '../logging/logger';

/**
 * 应用事件映射类型
 * 
 * 定义所有应用事件及其数据类型。
 * 使用 undefined 表示无数据的事件。
 */
export interface AppEvents {
  /** 刷新内容事件 */
  refresh_content: { path: string };
  /** 取消下载事件 */
  cancel_download: { downloadId: string };
  /** 导航到首页事件（无数据） */
  'navigate-to-home': undefined;
  /** 主题变更事件 */
  'theme-change': { mode: 'light' | 'dark' };
}

/**
 * 类型安全的事件发射器
 * 
 * 提供完整的类型检查，确保事件名称和数据类型的正确性。
 * 
 * @template T - 事件映射类型
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class TypedEventEmitter<T extends Record<string, any>> {
  private events = new Map<keyof T, Set<(data: T[keyof T]) => void>>();

  /**
   * 订阅事件
   * 
   * @param event - 事件名称（类型安全）
   * @param callback - 事件回调函数（类型安全）
   * @returns 取消订阅的函数
   * 
   * @example
   * ```typescript
   * const unsubscribe = eventEmitter.subscribe('refresh_content', (data) => {
   *   console.log('路径:', data.path); // ✅ 类型安全
   * });
   * ```
   */
  subscribe<K extends keyof T>(
    event: K,
    callback: (data: T[K]) => void
  ): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    
    const handlers = this.events.get(event);
    if (handlers !== undefined) {
      handlers.add(callback as (data: T[keyof T]) => void);
      logger.debug(`事件订阅: ${String(event)}, 当前订阅者数量: ${handlers.size.toString()}`);
    }
    
    return () => {
      const handlers = this.events.get(event);
      if (handlers !== undefined) {
        handlers.delete(callback as (data: T[keyof T]) => void);
        logger.debug(`取消事件订阅: ${String(event)}, 剩余订阅者数量: ${handlers.size.toString()}`);
      }
    };
  }

  /**
   * 分发事件
   * 
   * @param event - 事件名称（类型安全）
   * @param data - 事件数据（类型安全）
   * 
   * @example
   * ```typescript
   * eventEmitter.dispatch('refresh_content', { path: '/src' }); // ✅ 类型安全
   * eventEmitter.dispatch('refresh_content', { foo: 'bar' }); // ❌ 类型错误
   * ```
   */
  dispatch<K extends keyof T>(event: K, data: T[K]): void {
    const handlers = this.events.get(event);
    if (handlers === undefined || handlers.size === 0) {
      return;
    }
    
    handlers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        logger.error(`事件处理器执行失败: ${String(event)}`, error);
      }
    });
    
    logger.debug(`事件分发: ${String(event)}`);
  }

  /**
   * 取消订阅（别名方法）
   */
  on<K extends keyof T>(event: K, callback: (data: T[K]) => void): () => void {
    return this.subscribe(event, callback);
  }

  /**
   * 触发事件（别名方法）
   */
  emit<K extends keyof T>(event: K, data: T[K]): void {
    this.dispatch(event, data);
  }

  /**
   * 移除特定的监听器
   */
  removeListener<K extends keyof T>(event: K, callback: (data: T[K]) => void): void {
    const handlers = this.events.get(event);
    if (handlers !== undefined) {
      handlers.delete(callback as (data: T[keyof T]) => void);
    }
  }

  /**
   * 移除事件的所有监听器
   */
  removeAllListeners(event: keyof T): void {
    this.events.delete(event);
  }

  /**
   * 清空所有事件监听器
   */
  clear(): void {
    this.events.clear();
  }

  /**
   * 获取事件监听器数量
   */
  listenerCount(event: keyof T): number {
    return this.events.get(event)?.size ?? 0;
  }
}

/**
 * 全局类型安全的事件发射器实例
 */
export const eventEmitter = new TypedEventEmitter<AppEvents>();

/**
 * 事件常量（向后兼容）
 */
export const EVENTS = {
  REFRESH_CONTENT: 'refresh_content' as const,
  CANCEL_DOWNLOAD: 'cancel_download' as const,
  NAVIGATE_TO_HOME: 'navigate-to-home' as const,
  THEME_CHANGE: 'theme-change' as const,
};
