import { createContext, useContext, type Context, type RefObject } from "react";
import type { GitHubContent, PreviewState, DownloadState } from "@/types";

export type NavigationDirection = "forward" | "backward" | "none";

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
  setCurrentPath: (path: string, direction?: NavigationDirection) => void;
  navigateTo: (path: string, direction?: NavigationDirection) => void;
  refresh: () => void;
  handleRetry: () => void;
  findFileItemByPath: (pathOrFileName: string) => GitHubContent | undefined;
}

export type PreviewContextState = PreviewState & {
  previewingPdfItem: GitHubContent | null;
};

export interface PreviewContextValue {
  previewState: PreviewContextState;
  currentPreviewItemRef: RefObject<GitHubContent | null>;
  selectFile: (item: GitHubContent) => Promise<void> | void;
  closePreview: () => void;
  toggleImageFullscreen: () => void;
  handleImageError: (error: string) => void;
}

export interface DownloadContextValue {
  downloadState: DownloadState;
  downloadFile: (item: GitHubContent) => Promise<void>;
  downloadFolder: (path: string, folderName: string) => Promise<void>;
  cancelDownload: () => void;
}

export const ContentContext = createContext<ContentContextValue | null>(null);
export const PreviewContext = createContext<PreviewContextValue | null>(null);
export const DownloadContext = createContext<DownloadContextValue | null>(null);

function useRequiredContext<T>(context: Context<T | null>, name: string): T {
  const value = useContext(context);
  if (value === null) {
    throw new Error(`${name} 必须在 AppContextProvider 内部使用`);
  }
  return value;
}

export const useContentContext = (): ContentContextValue =>
  useRequiredContext(ContentContext, "useContentContext");

export const usePreviewContext = (): PreviewContextValue =>
  useRequiredContext(PreviewContext, "usePreviewContext");

export const useDownloadContext = (): DownloadContextValue =>
  useRequiredContext(DownloadContext, "useDownloadContext");
