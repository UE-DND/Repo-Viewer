import React, {
  createContext,
  useContext,
  ReactNode,
} from "react";
import { useSnackbar } from "notistack";
import { useDownload } from "../../hooks/useDownload";
import { GitHubContent } from "../../types";

// 下载管理上下文数据结构
interface DownloadContextData {
  // 下载状态
  downloadState: any;
  
  // 下载操作方法
  downloadFile: (item: GitHubContent) => void;
  downloadFolder: (path: string, folderName: string) => void;
  cancelDownload: () => void;
}

// 创建下载管理上下文
const DownloadContext = createContext<DownloadContextData | undefined>(undefined);

// 下载管理提供者组件
export const DownloadProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { enqueueSnackbar } = useSnackbar();

  // 错误处理函数
  const handleError = (message: string) => {
    enqueueSnackbar(message, { variant: "error" });
  };

  // 使用下载管理Hook
  const downloadManager = useDownload(handleError);

  // 构建上下文值
  const contextValue: DownloadContextData = {
    downloadState: downloadManager.downloadState,
    downloadFile: downloadManager.downloadFile,
    downloadFolder: downloadManager.downloadFolder,
    cancelDownload: downloadManager.cancelDownload,
  };

  return (
    <DownloadContext.Provider value={contextValue}>
      {children}
    </DownloadContext.Provider>
  );
};

// 自定义Hook，便于访问下载管理上下文
export const useDownloadContext = (): DownloadContextData => {
  const context = useContext(DownloadContext);
  if (context === undefined) {
    throw new Error("useDownloadContext 必须在 DownloadProvider 内部使用");
  }
  return context;
};