// 重新导出所有内容，这是 state 模块的主入口文件

// 导出所有类型定义
export type {
  GlobalState,
  NavigationDirection,
  StateSelector,
  StateListener,
  SubscriptionKey,
  Subscription,
} from './types';

// 导出选择器
export { selectors, selectorKeyMap } from './selectors';

// 导出核心状态管理器
export { StateManager, StateManagerContext } from './StateManager';

// 导出所有 hooks
export {
  useStateSelector,
  useStateActions,
  // Content hooks
  useContent,
  useCurrentPath,
  useContents,
  useReadmeContent,
  useContentLoading,
  useContentError,
  useRepoInfo,
  // Preview hooks
  usePreview,
  usePreviewingItem,
  usePreviewingImageItem,
  usePreviewingOfficeItem,
  useImagePreview,
  useOfficePreview,
  // Download hooks
  useDownload,
  useDownloadingPath,
  useDownloadingFolderPath,
  useFolderDownloadProgress,
  // Metadata hooks
  useMetadata,
  useTitle,
  useDescription,
} from './hooks';