import React, { createContext, useContext, ReactNode } from 'react';
import { useSnackbar } from 'notistack';
import { useGitHubContent } from '../hooks/useGitHubContent';
import { useFilePreview } from '../hooks/useFilePreview';
import { useDownload } from '../hooks/useDownload';
import { GitHubContent } from '../types';

// 定义上下文数据结构
interface GitHubContextData {
  // 内容管理
  currentPath: string;
  contents: GitHubContent[];
  readmeContent: string | null;
  loading: boolean;
  loadingReadme: boolean;
  error: string | null;
  navigateTo: (path: string) => void;
  refresh: () => void;
  handleRetry: () => void;
  setCurrentPath: (path: string) => void;
  
  // 预览相关
  previewState: any;
  selectFile: (item: GitHubContent) => void;
  closePreview: () => void;
  updatePdfPage: (page: number) => void;
  togglePdfFullscreen: () => void;
  toggleMdFullscreen: () => void;
  toggleImageFullscreen: () => void;
  handlePdfPagesLoaded: (numPages: number) => void;
  handlePdfError: (error: string) => void;
  handleImageError: (error: string) => void;
  
  // 下载相关
  downloadState: any;
  downloadFile: (item: GitHubContent) => void;
  downloadFolder: (path: string, folderName: string) => void;
  cancelDownload: () => void;
}

// 创建上下文
const GitHubContext = createContext<GitHubContextData | undefined>(undefined);

// 提供上下文的组件
export const GitHubProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { enqueueSnackbar } = useSnackbar();
  
  // 错误处理函数
  const handleError = (message: string) => {
    enqueueSnackbar(message, { variant: 'error' });
  };
  
  // 使用自定义Hooks
  const contentManager = useGitHubContent();
  const previewManager = useFilePreview(handleError);
  const downloadManager = useDownload(handleError);
  
  // 合并所有数据提供给上下文
  const contextValue = {
    ...contentManager,
    
    previewState: previewManager.previewState,
    selectFile: previewManager.selectFile,
    closePreview: previewManager.closePreview,
    updatePdfPage: previewManager.updatePdfPage,
    togglePdfFullscreen: previewManager.togglePdfFullscreen,
    toggleMdFullscreen: previewManager.toggleMdFullscreen,
    toggleImageFullscreen: previewManager.toggleImageFullscreen,
    handlePdfPagesLoaded: previewManager.handlePdfPagesLoaded,
    handlePdfError: previewManager.handlePdfError,
    handleImageError: previewManager.handleImageError,
    
    downloadState: downloadManager.downloadState,
    downloadFile: downloadManager.downloadFile,
    downloadFolder: downloadManager.downloadFolder,
    cancelDownload: downloadManager.cancelDownload
  };
  
  return (
    <GitHubContext.Provider value={contextValue}>
      {children}
    </GitHubContext.Provider>
  );
};

// 自定义Hook，便于访问上下文
export const useGitHub = (): GitHubContextData => {
  const context = useContext(GitHubContext);
  if (context === undefined) {
    throw new Error('useGitHub必须在GitHubProvider内部使用');
  }
  return context;
}; 