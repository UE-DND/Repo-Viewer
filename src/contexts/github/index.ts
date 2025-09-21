// GitHub 上下文统一出口
export { AppContextProvider, GitHubProvider } from "./AppContext";
export { useSearch, SearchProvider } from "./SearchContext";

// 兼容性导出：复用统一上下文实现
export {
  OptimizedAppContextProvider,
  useContent as useContentContext,
  usePreview as usePreviewContext,
  useDownloadContext,
  useMetadata as useMetadataContext,
} from "../unified";

// 常用别名，方便旧代码引用
export {
  useContentContext as useContent,
  usePreviewContext as usePreview,
  useMetadataContext as useMetadata,
} from "../unified";

export type { NavigationDirection } from "../unified";
