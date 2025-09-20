import { createContext } from 'react';
import type { 
  GlobalState, 
  StateSelector, 
  StateListener, 
  SubscriptionKey, 
  Subscription 
} from './types';
import { selectorKeyMap } from './selectors';

/**
 * 全局状态管理器
 * 
 * 使用示例：
 * 
 * // 方式1: 使用预定义的具名选择器 (推荐)
 * const contents = useContents();
 * const currentPath = useCurrentPath();
 * 
 * // 方式2: 使用自定义选择器 + 显式键
 * const customData = useStateSelector(
 *   state => ({ path: state.content.currentPath, loading: state.content.loading }),
 *   { key: 'content' }
 * );
 * 
 * // 方式3: 使用自定义选择器 (会自动推断，但在压缩后可能不准确)
 * const data = useStateSelector(state => state.content.currentPath);
 */
export class StateManager {
  private state: GlobalState;
  private subscriptions = new Map<string, Subscription[]>();
  private nextSubscriptionId = 0;

  constructor(initialState: GlobalState) {
    this.state = initialState;
  }

  // 获取当前状态
  getState(): GlobalState {
    return this.state;
  }

  // 选择性更新状态
  setState(updater: (prevState: GlobalState) => Partial<GlobalState>): void {
    const prevState = this.state;
    const updates = updater(prevState);
    
    // 深度合并状态
    this.state = this.deepMerge(prevState, updates);
    
    // 通知相关订阅者
    this.notifySubscribers(prevState, this.state);
  }

  // 订阅状态变化 - 支持显式键参数和具名选择器
  subscribe<T>(
    selector: StateSelector<T>,
    listener: StateListener<T>,
    options?: { key?: SubscriptionKey }
  ): () => void {
    const subscriptionId = `${this.nextSubscriptionId++}`;
    const subscription: Subscription<T> = {
      selector,
      listener,
      id: subscriptionId,
    };

    // 计算选择器的键（用于优化）
    const selectorKey = this.extractSelectorKey(selector, options?.key);
    
    if (!this.subscriptions.has(selectorKey)) {
      this.subscriptions.set(selectorKey, []);
    }
    this.subscriptions.get(selectorKey)!.push(subscription);

    // 返回取消订阅函数
    return () => {
      const subs = this.subscriptions.get(selectorKey);
      if (subs) {
        const index = subs.findIndex(sub => sub.id === subscriptionId);
        if (index > -1) {
          subs.splice(index, 1);
        }
        if (subs.length === 0) {
          this.subscriptions.delete(selectorKey);
        }
      }
    };
  }

  // 通知订阅者
  private notifySubscribers(prevState: GlobalState, newState: GlobalState): void {
    // 检查哪些状态切片发生了变化
    const changedKeys = this.getChangedKeys(prevState, newState);
    
    changedKeys.forEach(key => {
      const subscriptions = this.subscriptions.get(key);
      if (subscriptions) {
        subscriptions.forEach(subscription => {
          const prevValue = subscription.selector(prevState);
          const newValue = subscription.selector(newState);
          
          // 只有值真正改变时才通知
          if (!this.shallowEqual(prevValue, newValue)) {
            subscription.listener(newValue, prevValue);
          }
        });
      }
    });
  }

  // 优化订阅查找
  private extractSelectorKey(selector: StateSelector<any>, explicitKey?: SubscriptionKey): string {
    // 优先使用显式指定的键
    if (explicitKey) {
      return explicitKey;
    }
    
    // 检查是否是预定义的具名选择器
    const knownKey = selectorKeyMap.get(selector);
    if (knownKey) {
      return knownKey;
    }
    
    // 回退到字符串分析（仅作为最后手段，且添加更多检查）
    try {
      const funcStr = selector.toString();

      const patterns = [
        { pattern: /state\.content[\.\[]/, key: 'content' },
        { pattern: /state\.preview[\.\[]/, key: 'preview' },
        { pattern: /state\.download[\.\[]/, key: 'download' },
        { pattern: /state\.metadata[\.\[]/, key: 'metadata' },
      ];
      
      for (const { pattern, key } of patterns) {
        if (pattern.test(funcStr)) {
          return key;
        }
      }
    } catch (error) {
      console.warn('Unable to analyze selector function string:', error);
    }
    
    return 'global';
  }

  // 获取变化的键
  private getChangedKeys(prevState: GlobalState, newState: GlobalState): string[] {
    const keys: string[] = [];
    
    if (!this.shallowEqual(prevState.content, newState.content)) {
      keys.push('content', 'global');
    }
    if (!this.shallowEqual(prevState.preview, newState.preview)) {
      keys.push('preview', 'global');
    }
    if (!this.shallowEqual(prevState.download, newState.download)) {
      keys.push('download', 'global');
    }
    if (!this.shallowEqual(prevState.metadata, newState.metadata)) {
      keys.push('metadata', 'global');
    }
    
    return keys;
  }

  // 浅层比较
  private shallowEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true;
    if (!obj1 || !obj2) return false;
    
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) return false;
    
    for (const key of keys1) {
      if (obj1[key] !== obj2[key]) return false;
    }
    
    return true;
  }

  // 深度合并对象
  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }
}

// 创建状态管理器实例的Context
export const StateManagerContext = createContext<StateManager | null>(null);