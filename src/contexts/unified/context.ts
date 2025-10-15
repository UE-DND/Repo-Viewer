import { createContext, useContext, type Context, type RefObject } from "react";
import type { GitHubContent, PreviewState, DownloadState } from "@/types";

/**
 * 导航方向类型
 */
export type NavigationDirection = "forward" | "backward" | "none";

/**
 * 内容上下文值接口
 */
export interface ContentContextValue {
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
  currentBranch: string;
  defaultBranch: string;
  branches: string[];
  branchLoading: boolean;
  branchError: string | null;
  setCurrentBranch: (branch: string) => void;
  refreshBranches: () => Promise<void>;
  setCurrentPath: (path: string, direction?: NavigationDirection) => void;
  navigateTo: (path: string, direction?: NavigationDirection) => void;
  refresh: () => void;
  handleRetry: () => void;
  findFileItemByPath: (pathOrFileName: string) => GitHubContent | undefined;
}

/**
 * 预览上下文状态类型
 */
export type PreviewContextState = PreviewState & {
  previewingPdfItem: GitHubContent | null;
};

/**
 * 预览上下文值接口
 */
export interface PreviewContextValue {
  previewState: PreviewContextState;
  currentPreviewItemRef: RefObject<GitHubContent | null>;
  selectFile: (item: GitHubContent) => Promise<void> | void;
  closePreview: () => void;
  toggleImageFullscreen: () => void;
  handleImageError: (error: string) => void;
}

/**
 * 下载上下文值接口
 */
export interface DownloadContextValue {
  downloadState: DownloadState;
  downloadFile: (item: GitHubContent) => Promise<void>;
  downloadFolder: (path: string, folderName: string) => Promise<void>;
  cancelDownload: () => void;
}

export const ContentContext = createContext<ContentContextValue | null>(null);
export const PreviewContext = createContext<PreviewContextValue | null>(null);
export const DownloadContext = createContext<DownloadContextValue | null>(null);

/**
 * 使用必需的上下文
 * 
 * 确保上下文值存在，否则抛出错误。
 * 
 * @param context - React上下文对象
 * @param name - 上下文名称，用于错误消息
 * @returns 上下文值
 * @throws 当上下文值为null时抛出错误
 */
function useRequiredContext<T>(context: Context<T | null>, name: string): T {
  const value = useContext(context);
  if (value === null) {
    throw new Error(`${name} 必须在 AppContextProvider 内部使用`);
  }
  return value;
}

/**
 * 使用内容上下文Hook
 * 
 * @returns 内容上下文值
 * @throws 当在AppContextProvider外部使用时抛出错误
 */
export const useContentContext = (): ContentContextValue =>
  useRequiredContext(ContentContext, "useContentContext");

/**
 * 使用预览上下文Hook
 * 
 * @returns 预览上下文值
 * @throws 当在AppContextProvider外部使用时抛出错误
 */
export const usePreviewContext = (): PreviewContextValue =>
  useRequiredContext(PreviewContext, "usePreviewContext");

/**
 * 使用下载上下文Hook
 * 
 * @returns 下载上下文值
 * @throws 当在AppContextProvider外部使用时抛出错误
 */
export const useDownloadContext = (): DownloadContextValue =>
  useRequiredContext(DownloadContext, "useDownloadContext");
