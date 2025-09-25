// 统一导出优化后的状态管理
export { AppContextProvider } from './AppContext';
export {
  useContent,
  usePreview,
  useMetadata
} from './AppContext';

// 导出兼容性别名
export {
  useContentContext,
  usePreviewContext,
  useDownloadContext
} from './compatibilityHooks';
export type { NavigationDirection } from './AppContext';

// 导出底层的状态管理器相关内容（高级用法）
export { StateManager, StateManagerContext, useStateSelector, useStateActions } from './state';
export type { GlobalState } from './state';
export { StateManagerProvider } from './StateManagerProvider';
