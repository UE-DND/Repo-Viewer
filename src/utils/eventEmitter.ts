// 创建全局事件发布器
interface EventMap {
  [key: string]: Array<(data: any) => void>;
}

// 事件发射器
export const eventEmitter = {
  events: {} as EventMap,
  dispatch(event: string, data: any): void {
    if (!this.events[event]) return;
    this.events[event].forEach(callback => callback(data));
    console.log(`事件分发: ${event}`);
  },
  subscribe(event: string, callback: (data: any) => void): () => void {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(callback);
    console.log(`事件订阅: ${event}, 当前订阅者数量: ${this.events[event].length}`);
    return () => {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
      console.log(`取消事件订阅: ${event}, 剩余订阅者数量: ${this.events[event].length}`);
    }
  },
  
  // 兼容旧版API
  on(event: string, callback: (data: any) => void) {
    return this.subscribe(event, callback);
  },
  emit(event: string, ...args: any[]) {
    return this.dispatch(event, args.length === 1 ? args[0] : args);
  },
  removeListener(event: string, callback: (data: any) => void) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
  }
};

// 事件类型
export const EVENTS = {
  REFRESH_CONTENT: 'refresh_content',
  CANCEL_DOWNLOAD: 'CANCEL_DOWNLOAD'
}; 