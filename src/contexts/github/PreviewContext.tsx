import React, {
  createContext,
  useContext,
  ReactNode,
} from "react";
import { useSnackbar } from "notistack";
import { useFilePreview } from "../../hooks/useFilePreview";
import { GitHubContent } from "../../types";
import { useContent } from "./ContentContext";

// 预览管理上下文数据结构
interface PreviewContextData {
  // 预览状态
  previewState: any;
  currentPreviewItemRef: React.MutableRefObject<GitHubContent | null>;
  
  // 预览操作方法
  selectFile: (item: GitHubContent) => void;
  closePreview: () => void;
  toggleImageFullscreen: () => void;
  handleImageError: (error: string) => void;
}

// 创建预览管理上下文
const PreviewContext = createContext<PreviewContextData | undefined>(undefined);

// 预览管理提供者组件
export const PreviewProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const { findFileItemByPath } = useContent();

  // 错误处理函数
  const handleError = (message: string) => {
    enqueueSnackbar(message, { variant: "error" });
  };

  // 使用预览管理Hook
  const previewManager = useFilePreview(handleError, findFileItemByPath);

  // 构建上下文值
  const contextValue: PreviewContextData = {
    previewState: previewManager.previewState,
    currentPreviewItemRef: previewManager.currentPreviewItemRef,
    selectFile: previewManager.selectFile,
    closePreview: previewManager.closePreview,
    toggleImageFullscreen: previewManager.toggleImageFullscreen,
    handleImageError: previewManager.handleImageError,
  };

  return (
    <PreviewContext.Provider value={contextValue}>
      {children}
    </PreviewContext.Provider>
  );
};

// 自定义Hook，便于访问预览管理上下文
export const usePreview = (): PreviewContextData => {
  const context = useContext(PreviewContext);
  if (context === undefined) {
    throw new Error("usePreview 必须在 PreviewProvider 内部使用");
  }
  return context;
};