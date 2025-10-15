import { logger } from '../logging/logger';

/**
 * 事件映射类型
 */
type EventMap = Record<string, ((data: unknown) => void)[]>;

/**
 * 全局事件发射器
 * 
 * 提供发布/订阅模式的事件系统，支持事件分发和订阅管理。
 */
export const eventEmitter = {
  events: {} as EventMap,
  dispatch(event: string, data: unknown): void {
    const eventHandlers = this.events[event];
    if (typeof eventHandlers === 'undefined' || eventHandlers.length === 0) {
      return;
    }
    eventHandlers.forEach(callback => {
      callback(data);
    });
    logger.debug(`事件分发: ${event}`);
  },
  subscribe(event: string, callback: (data: unknown) => void): () => void {
    this.events[event] ??= [];
    this.events[event].push(callback);
    logger.debug(`事件订阅: ${event}, 当前订阅者数量: ${String(this.events[event].length)}`);
    return () => {
      const list = this.events[event] ?? [];
      this.events[event] = list.filter(cb => cb !== callback);
      logger.debug(`取消事件订阅: ${event}, 剩余订阅者数量: ${String(this.events[event].length)}`);
    }
  },

  // 兼容旧版API
  on(event: string, callback: (data: unknown) => void) {
    return this.subscribe(event, callback);
  },
  emit(event: string, ...args: unknown[]) {
    this.dispatch(event, args.length === 1 ? args[0] : args);
  },
  removeListener(event: string, callback: (data: unknown) => void) {
    const eventHandlers = this.events[event];
    if (typeof eventHandlers !== 'undefined' && eventHandlers.length > 0) {
      this.events[event] = eventHandlers.filter(cb => cb !== callback);
    }
  }
};

// 事件类型
export const EVENTS = {
  REFRESH_CONTENT: 'refresh_content',
  CANCEL_DOWNLOAD: 'CANCEL_DOWNLOAD'
};
