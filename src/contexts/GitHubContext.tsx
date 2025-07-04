import React, {
  createContext,
  useContext,
  ReactNode,
  useCallback,
} from "react";
import { useSnackbar } from "notistack";
import { useGitHubContent } from "../hooks/useGitHubContent";
import { useFilePreview } from "../hooks/useFilePreview";
import { useDownload } from "../hooks/useDownload";
import { GitHubContent } from "../types";
import { logger } from "../utils";

// 定义导航方向类型
export type NavigationDirection = "forward" | "backward" | "none";

// 定义上下文数据结构
interface GitHubContextData {
  // 内容管理
  currentPath: string;
  contents: GitHubContent[];
  readmeContent: string | null;
  loading: boolean;
  loadingReadme: boolean;
  readmeLoaded: boolean;
  error: string | null;
  navigateTo: (path: string, direction?: NavigationDirection) => void;
  refresh: () => void;
  handleRetry: () => void;
  setCurrentPath: (path: string, direction?: NavigationDirection) => void;
  navigationDirection: NavigationDirection;

  // 仓库信息
  repoOwner: string;
  repoName: string;

  // 预览相关
  previewState: any;
  selectFile: (item: GitHubContent) => void;
  closePreview: () => void;
  updatePdfPage: (page: number) => void;
  togglePdfFullscreen: () => void;
  toggleImageFullscreen: () => void;
  handlePdfPagesLoaded: (numPages: number) => void;
  handlePdfError: (error: string) => void;
  handleImageError: (error: string) => void;
  currentPreviewItemRef: React.MutableRefObject<GitHubContent | null>;
  findFileItemByPath: (path: string) => GitHubContent | undefined;

  // 下载相关
  downloadState: any;
  downloadFile: (item: GitHubContent) => void;
  downloadFolder: (path: string, folderName: string) => void;
  cancelDownload: () => void;
}

// 创建上下文
const GitHubContext = createContext<GitHubContextData | undefined>(undefined);

// 提供上下文的组件
export const GitHubProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { enqueueSnackbar } = useSnackbar();

  // 错误处理函数
  const handleError = (message: string) => {
    enqueueSnackbar(message, { variant: "error" });
  };

  // 使用自定义Hooks
  const contentManager = useGitHubContent();

  // 创建查找文件的回调
  const findFileItemByPath = useCallback(
    (pathOrFileName: string) => {
      // 记录调试信息
      logger.debug(`尝试查找文件: ${pathOrFileName}`);

      // 首先尝试按完整路径查找
      let fileItem = contentManager.contents.find(
        (item) => item.path === pathOrFileName,
      );

      // 如果没找到，尝试按文件名查找
      if (!fileItem) {
        logger.debug("未找到完整路径匹配，尝试按文件名查找");
        fileItem = contentManager.contents.find(
          (item) =>
            item.name === pathOrFileName ||
            item.path.endsWith(`/${pathOrFileName}`),
        );
      }

      if (fileItem) {
        logger.debug(`找到文件: ${fileItem.path}`);
      } else {
        logger.warn(`未找到文件: ${pathOrFileName}`);
      }

      return fileItem;
    },
    [contentManager.contents],
  );

  const previewManager = useFilePreview(handleError, findFileItemByPath);
  const downloadManager = useDownload(handleError);

  // 添加兼容层函数
  const navigateTo = useCallback(
    (path: string, direction: NavigationDirection = "forward") => {
      logger.debug(`navigateTo 兼容函数调用: ${path}, 方向: ${direction}`);
      contentManager.setCurrentPath(path, direction);
    },
    [contentManager.setCurrentPath],
  );

  const refresh = useCallback(() => {
    logger.debug("refresh 兼容函数调用");
    contentManager.refreshContents();
  }, [contentManager.refreshContents]);

  const handleRetry = useCallback(() => {
    logger.debug("handleRetry 兼容函数调用");
    contentManager.refreshContents();
  }, [contentManager.refreshContents]);

  // 合并所有数据提供给上下文
  const contextValue = {
    ...contentManager,
    navigateTo,
    refresh,
    handleRetry,

    previewState: previewManager.previewState,
    selectFile: previewManager.selectFile,
    closePreview: previewManager.closePreview,
    updatePdfPage: previewManager.updatePdfPage,
    togglePdfFullscreen: previewManager.togglePdfFullscreen,
    toggleImageFullscreen: previewManager.toggleImageFullscreen,
    handlePdfPagesLoaded: previewManager.handlePdfPagesLoaded,
    handlePdfError: previewManager.handlePdfError,
    handleImageError: previewManager.handleImageError,
    currentPreviewItemRef: previewManager.currentPreviewItemRef,
    findFileItemByPath,

    downloadState: downloadManager.downloadState,
    downloadFile: downloadManager.downloadFile,
    downloadFolder: downloadManager.downloadFolder,
    cancelDownload: downloadManager.cancelDownload,

    // 仓库信息
    repoOwner: contentManager.repoOwner,
    repoName: contentManager.repoName,
  };

  return (
    <GitHubContext.Provider value={contextValue} data-oid="mpfwvtm">
      {children}
    </GitHubContext.Provider>
  );
};

// 自定义Hook，便于访问上下文
export const useGitHub = (): GitHubContextData => {
  const context = useContext(GitHubContext);
  if (context === undefined) {
    throw new Error("useGitHub必须在GitHubProvider内部使用");
  }
  return context;
};
