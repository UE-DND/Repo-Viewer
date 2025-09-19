import { useContext, useRef, useCallback, useMemo, useReducer, useEffect } from 'react';
import { StateManagerContext } from './StateManager';
import { selectors } from './selectors';
import type { StateSelector, SubscriptionKey } from './types';

// 状态选择器Hook
export function useStateSelector<T>(
  selector: StateSelector<T>, 
  options?: { key?: SubscriptionKey }
): T {
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
      },
      options
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

// 便捷的具名选择器Hooks
export const useContent = () => useStateSelector(selectors.content, { key: 'content' });
export const useCurrentPath = () => useStateSelector(selectors.currentPath, { key: 'content' });
export const useContents = () => useStateSelector(selectors.contents, { key: 'content' });
export const useReadmeContent = () => useStateSelector(selectors.readmeContent, { key: 'content' });
export const useContentLoading = () => useStateSelector(selectors.contentLoading, { key: 'content' });
export const useContentError = () => useStateSelector(selectors.contentError, { key: 'content' });
export const useRepoInfo = () => useStateSelector(selectors.repoInfo, { key: 'content' });

export const usePreview = () => useStateSelector(selectors.preview, { key: 'preview' });
export const usePreviewingItem = () => useStateSelector(selectors.previewingItem, { key: 'preview' });
export const usePreviewingImageItem = () => useStateSelector(selectors.previewingImageItem, { key: 'preview' });
export const usePreviewingOfficeItem = () => useStateSelector(selectors.previewingOfficeItem, { key: 'preview' });
export const useImagePreview = () => useStateSelector(selectors.imagePreview, { key: 'preview' });
export const useOfficePreview = () => useStateSelector(selectors.officePreview, { key: 'preview' });

export const useDownload = () => useStateSelector(selectors.download, { key: 'download' });
export const useDownloadingPath = () => useStateSelector(selectors.downloadingPath, { key: 'download' });
export const useDownloadingFolderPath = () => useStateSelector(selectors.downloadingFolderPath, { key: 'download' });
export const useFolderDownloadProgress = () => useStateSelector(selectors.folderDownloadProgress, { key: 'download' });

export const useMetadata = () => useStateSelector(selectors.metadata, { key: 'metadata' });
export const useTitle = () => useStateSelector(selectors.title, { key: 'metadata' });
export const useDescription = () => useStateSelector(selectors.description, { key: 'metadata' });