import { createContext, useContext, useRef, useCallback, useMemo, useReducer, useEffect } from 'react';
import type { MutableRefObject } from 'react';
import { GitHubContent } from '../../types';

// 定义全局状态接口
export interface GlobalState {
  // Content 相关状态
  content: {
    currentPath: string;
    contents: GitHubContent[];
    readmeContent: string | null;
    loading: boolean;
    loadingReadme: boolean;
    readmeLoaded: boolean;
    error: string | null;
    navigationDirection: NavigationDirection;
    repoOwner: string;
    repoName: string;
  };
  
  // Preview 相关状态
  preview: {
    previewingItem: GitHubContent | null;
    previewingImageItem: GitHubContent | null;
    previewingOfficeItem: GitHubContent | null;
    imagePreviewUrl: string | null;
    officePreviewUrl: string | null;
    officeFileType: string | null;
    isOfficeFullscreen: boolean;
    currentPreviewItemRef: MutableRefObject<GitHubContent | null>;
  };
  
  // Download 相关状态
  download: {
    downloadingPath: string | null;
    downloadingFolderPath: string | null;
    folderDownloadProgress: number;
  };
  
  // Metadata 相关状态
  metadata: {
    title: string;
    description: string;
    keywords: string;
    ogImage: string;
  };
}

// 导航方向类型
export type NavigationDirection = "forward" | "backward" | "none";

// 状态订阅器类型
type StateSelector<T> = (state: GlobalState) => T;
type StateListener<T> = (newValue: T, prevValue: T) => void;

// 订阅信息
interface Subscription<T = any> {
  selector: StateSelector<T>;
  listener: StateListener<T>;
  id: string;
}

// 状态管理器类
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

  // 订阅状态变化
  subscribe<T>(
    selector: StateSelector<T>,
    listener: StateListener<T>
  ): () => void {
    const subscriptionId = `${this.nextSubscriptionId++}`;
    const subscription: Subscription<T> = {
      selector,
      listener,
      id: subscriptionId,
    };

    // 计算选择器的键（用于优化）
    const selectorKey = this.extractSelectorKey(selector);
    
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

  // 提取选择器的键（用于优化订阅查找）
  private extractSelectorKey(selector: StateSelector<any>): string {
    const funcStr = selector.toString();
    
    // 尝试从选择器函数中提取状态键
    if (funcStr.includes('state.content')) return 'content';
    if (funcStr.includes('state.preview')) return 'preview';
    if (funcStr.includes('state.download')) return 'download';
    if (funcStr.includes('state.metadata')) return 'metadata';
    
    // 默认键，会监听所有变化
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

// 状态选择器Hook
export function useStateSelector<T>(selector: StateSelector<T>): T {
  const stateManager = useContext(StateManagerContext);
  if (!stateManager) {
    throw new Error('useStateSelector must be used within StateManagerProvider');
  }

  // 创建状态引用和更新函数
  const currentValue = useRef(selector(stateManager.getState()));
  const forceUpdate = useForceUpdate();

  // 订阅状态变化
  const unsubscribe = useRef<(() => void) | null>(null);
  
  // 使用useMemo确保选择器稳定
  const memoizedSelector = useCallback(selector, []);
  
  // 设置订阅
  if (!unsubscribe.current) {
    unsubscribe.current = stateManager.subscribe(
      memoizedSelector,
      (newValue) => {
        currentValue.current = newValue;
        forceUpdate();
      }
    );
  }

  // 清理订阅
  const cleanup = useCallback(() => {
    if (unsubscribe.current) {
      unsubscribe.current();
      unsubscribe.current = null;
    }
  }, []);

  // 使用useEffect进行清理
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return currentValue.current;
}

// 状态操作Hook
export function useStateActions() {
  const stateManager = useContext(StateManagerContext);
  if (!stateManager) {
    throw new Error('useStateActions must be used within StateManagerProvider');
  }

  return useMemo(() => ({
    setState: stateManager.setState.bind(stateManager),
    getState: stateManager.getState.bind(stateManager),
  }), [stateManager]);
}

// 强制更新Hook
function useForceUpdate() {
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
  return forceUpdate;
}
