import type { GlobalState, StateSelector, SubscriptionKey } from './types';

// 预定义的具名选择器
export const selectors = {
  // Content 选择器
  content: (state: GlobalState) => state.content,
  currentPath: (state: GlobalState) => state.content.currentPath,
  contents: (state: GlobalState) => state.content.contents,
  readmeContent: (state: GlobalState) => state.content.readmeContent,
  contentLoading: (state: GlobalState) => state.content.loading,
  contentError: (state: GlobalState) => state.content.error,
  repoInfo: (state: GlobalState) => ({
    owner: state.content.repoOwner,
    name: state.content.repoName
  }),

  // Preview 选择器
  preview: (state: GlobalState) => state.preview,
  previewingItem: (state: GlobalState) => state.preview.previewingItem,
  previewingImageItem: (state: GlobalState) => state.preview.previewingImageItem,
  previewingOfficeItem: (state: GlobalState) => state.preview.previewingOfficeItem,
  imagePreview: (state: GlobalState) => ({
    url: state.preview.imagePreviewUrl,
    item: state.preview.previewingImageItem
  }),
  officePreview: (state: GlobalState) => ({
    url: state.preview.officePreviewUrl,
    fileType: state.preview.officeFileType,
    isFullscreen: state.preview.isOfficeFullscreen,
    item: state.preview.previewingOfficeItem
  }),

  // Download 选择器
  download: (state: GlobalState) => state.download,
  downloadingPath: (state: GlobalState) => state.download.downloadingPath,
  downloadingFolderPath: (state: GlobalState) => state.download.downloadingFolderPath,
  folderDownloadProgress: (state: GlobalState) => state.download.folderDownloadProgress,

  // Metadata 选择器
  metadata: (state: GlobalState) => state.metadata,
  title: (state: GlobalState) => state.metadata.title,
  description: (state: GlobalState) => state.metadata.description,
} as const;

// 具名选择器映射到订阅键
export const selectorKeyMap = new Map<StateSelector<any>, SubscriptionKey>([
  [selectors.content, 'content'],
  [selectors.currentPath, 'content'],
  [selectors.contents, 'content'],
  [selectors.readmeContent, 'content'],
  [selectors.contentLoading, 'content'],
  [selectors.contentError, 'content'],
  [selectors.repoInfo, 'content'],
  
  [selectors.preview, 'preview'],
  [selectors.previewingItem, 'preview'],
  [selectors.previewingImageItem, 'preview'],
  [selectors.previewingOfficeItem, 'preview'],
  [selectors.imagePreview, 'preview'],
  [selectors.officePreview, 'preview'],
  
  [selectors.download, 'download'],
  [selectors.downloadingPath, 'download'],
  [selectors.downloadingFolderPath, 'download'],
  [selectors.folderDownloadProgress, 'download'],
  
  [selectors.metadata, 'metadata'],
  [selectors.title, 'metadata'],
  [selectors.description, 'metadata'],
]);