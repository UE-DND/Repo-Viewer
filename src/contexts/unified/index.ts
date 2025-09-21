// 统一导出优化后的状态管理
export { OptimizedAppContextProvider } from './OptimizedAppContext';
export { useSearch } from '../github/SearchContext';
export {
  useContent,
  usePreview,
  useMetadata
} from './OptimizedAppContext';

// 导出兼容性别名
export {
  useContentContext,
  usePreviewContext,
  useDownloadContext,
  useMetadataContext
} from './compatibilityHooks';
export type { NavigationDirection } from './OptimizedAppContext';

// 导出底层的状态管理器相关内容（高级用法）
export { StateManager, StateManagerContext, useStateSelector, useStateActions } from './state';
export type { GlobalState } from './state';
export { StateManagerProvider } from './StateManagerProvider';
