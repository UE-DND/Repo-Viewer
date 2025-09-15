import React, {
  createContext,
  useContext,
  ReactNode,
  useCallback,
} from "react";
import { useGitHubContent } from "../../hooks/useGitHubContent";
import { GitHubContent } from "../../types";
import { logger } from "../../utils";

// 定义导航方向类型
export type NavigationDirection = "forward" | "backward" | "none";

// 内容管理上下文数据结构
interface ContentContextData {
  // 基础内容数据
  currentPath: string;
  contents: GitHubContent[];
  readmeContent: string | null;
  loading: boolean;
  loadingReadme: boolean;
  readmeLoaded: boolean;
  error: string | null;
  navigationDirection: NavigationDirection;

  // 仓库信息
  repoOwner: string;
  repoName: string;

  // 导航和操作方法
  navigateTo: (path: string, direction?: NavigationDirection) => void;
  setCurrentPath: (path: string, direction?: NavigationDirection) => void;
  refresh: () => void;
  handleRetry: () => void;
  
  // 查找功能
  findFileItemByPath: (path: string) => GitHubContent | undefined;
}

// 创建内容管理上下文
const ContentContext = createContext<ContentContextData | undefined>(undefined);

// 内容管理提供者组件
export const ContentProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // 使用内容管理Hook
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

  // 添加兼容层函数
  const navigateTo = useCallback(
    (path: string, direction: NavigationDirection = "forward") => {
      logger.debug(`navigateTo 调用: ${path}, 方向: ${direction}`);
      contentManager.setCurrentPath(path, direction);
    },
    [contentManager.setCurrentPath],
  );

  const refresh = useCallback(() => {
    logger.debug("refresh 调用");
    contentManager.refreshContents();
  }, [contentManager.refreshContents]);

  const handleRetry = useCallback(() => {
    logger.debug("handleRetry 调用");
    contentManager.refreshContents();
  }, [contentManager.refreshContents]);

  // 构建上下文值
  const contextValue: ContentContextData = {
    // 直接从 contentManager 获取的数据
    currentPath: contentManager.currentPath,
    contents: contentManager.contents,
    readmeContent: contentManager.readmeContent,
    loading: contentManager.loading,
    loadingReadme: contentManager.loadingReadme,
    readmeLoaded: contentManager.readmeLoaded,
    error: contentManager.error,
    navigationDirection: contentManager.navigationDirection,
    repoOwner: contentManager.repoOwner,
    repoName: contentManager.repoName,
    
    // 方法
    navigateTo,
    setCurrentPath: contentManager.setCurrentPath,
    refresh,
    handleRetry,
    findFileItemByPath,
  };

  return (
    <ContentContext.Provider value={contextValue}>
      {children}
    </ContentContext.Provider>
  );
};

// 自定义Hook，便于访问内容管理上下文
export const useContent = (): ContentContextData => {
  const context = useContext(ContentContext);
  if (context === undefined) {
    throw new Error("useContent 必须在 ContentProvider 内部使用");
  }
  return context;
};