import { useReducer, useCallback, useRef, useState, useEffect } from 'react';
import { useTheme } from '@mui/material';
import type { PreviewState, PreviewAction, GitHubContent } from '@/types';
import { OfficeFileType } from '@/types';
import { GitHubService } from '@/services/github';
import { isImageFile, isPdfFile, isMarkdownFile, isWordFile, isExcelFile, isPPTFile, logger, openPDFPreview } from '@/utils';
import { getPreviewFromUrl, updateUrlWithHistory, hasPreviewParam } from '@/utils/routing/urlManager';
import { getForceServerProxy } from '@/services/github/config/ProxyForceManager';

const initialPreviewState: PreviewState = {
  previewContent: null,
  previewingItem: null,
  loadingPreview: false,
  imagePreviewUrl: null,
  previewingImageItem: null,
  isImageFullscreen: false,
  loadingImagePreview: false,
  imageError: null,
  officePreviewUrl: null,
  previewingOfficeItem: null,
  loadingOfficePreview: false,
  isOfficeFullscreen: false,
  officeError: null,
  officeFileType: null
};
function previewReducer(state: PreviewState, action: PreviewAction): PreviewState {
  switch (action.type) {
    case 'RESET_PREVIEW':
      return initialPreviewState;

    case 'SET_MD_PREVIEW':
      return {
        ...state,
        previewContent: action.content,
        previewingItem: action.item
      };

    case 'SET_MD_LOADING':
      return {
        ...state,
        loadingPreview: action.loading
      };


    case 'SET_IMAGE_PREVIEW':
      return {
        ...state,
        imagePreviewUrl: action.url,
        previewingImageItem: action.item
      };

    case 'SET_IMAGE_LOADING':
      return {
        ...state,
        loadingImagePreview: action.loading
      };

    case 'SET_IMAGE_ERROR':
      return {
        ...state,
        imageError: action.error
      };

    case 'SET_IMAGE_FULLSCREEN':
      return {
        ...state,
        isImageFullscreen: action.fullscreen
      };

    case 'SET_OFFICE_PREVIEW':
      return {
        ...state,
        officePreviewUrl: action.url,
        previewingOfficeItem: action.item,
        officeFileType: action.fileType
      };

    case 'SET_OFFICE_LOADING':
      return {
        ...state,
        loadingOfficePreview: action.loading
      };

    case 'SET_OFFICE_ERROR':
      return {
        ...state,
        officeError: action.error
      };

    case 'SET_OFFICE_FULLSCREEN':
      return {
        ...state,
        isOfficeFullscreen: action.fullscreen
      };

    default:
      return state;
  }
}

/**
 * 文件预览Hook
 * 
 * 提供文件预览功能，支持Markdown、图片、PDF和Office文档的预览。
 * 自动处理URL参数和浏览器历史导航。
 * 
 * @param onError - 错误回调函数
 * @param findFileItemByPath - 根据路径查找文件的函数
 * @returns 文件预览状态和操作函数
 */
export const useFilePreview = (
  onError: (message: string) => void,
  findFileItemByPath?: (path: string) => GitHubContent | undefined
): {
  previewState: PreviewState;
  useTokenMode: boolean;
  setUseTokenMode: (value: boolean) => void;
  selectFile: (item: GitHubContent) => Promise<void>;
  closePreview: () => void;
  toggleImageFullscreen: () => void;
  toggleOfficeFullscreen: () => void;
  handleImageError: (error: string) => void;
  handleOfficeError: (error: string) => void;
  currentPreviewItemRef: React.RefObject<GitHubContent | null>;
} => {
  const [previewState, dispatch] = useReducer(previewReducer, initialPreviewState);
  const [useTokenMode, setUseTokenMode] = useState(true);
  const muiTheme = useTheme();
  const currentPreviewItemRef = useRef<GitHubContent | null>(null);
  const hasActivePreviewRef = useRef<boolean>(false);
  const isHandlingNavigationRef = useRef<boolean>(false);

  useEffect(() => {
    const hasActivePreview =
      previewState.previewingItem !== null ||
      previewState.previewingImageItem !== null ||
      previewState.previewingOfficeItem !== null;
    hasActivePreviewRef.current = hasActivePreview;
    logger.debug(`预览状态更新: ${hasActivePreview ? '活跃' : '非活跃'}`);
  }, [
    previewState.previewingItem,
    previewState.previewingImageItem,
    previewState.previewingOfficeItem
  ]);

  useEffect(() => {
    const previewPath = getPreviewFromUrl();
    if (previewPath !== '') {
      logger.debug(`从URL加载预览: ${previewPath}`);
      currentPreviewItemRef.current = {
        path: previewPath,
        name: previewPath.split('/').pop() ?? '',
        type: 'file',
        sha: '',
        size: 0,
        url: '',
        html_url: '',
        git_url: '',
        download_url: '',
        _links: { self: '', git: '', html: '' }
      };
    }
  }, []);

  // Office预览加载函数
  const loadOfficePreview = useCallback((item: GitHubContent, fileType: OfficeFileType) => {
    if (item.download_url === null || item.download_url === '') {
      return;
    }

    dispatch({ type: 'SET_OFFICE_LOADING', loading: true });
    dispatch({ type: 'SET_OFFICE_ERROR', error: null });

    try {
      // 直接使用GitHub原始文件URL
      const originalUrl = item.download_url;

      dispatch({
        type: 'SET_OFFICE_PREVIEW',
        url: originalUrl,
        item,
        fileType
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      dispatch({ type: 'SET_OFFICE_ERROR', error: errorMessage });
      onError(`加载${fileType}文件失败: ${errorMessage}`);
    } finally {
      dispatch({ type: 'SET_OFFICE_LOADING', loading: false });
    }
  }, [onError]);

  const selectFile = useCallback(async (item: GitHubContent) => {
    if (item.download_url === null || item.download_url === '') {
      onError('无法获取文件下载链接');
      return;
    }

    logger.debug(`正在选择文件预览: ${item.path}`);
    currentPreviewItemRef.current = item;
    const dirPath = item.path.split('/').slice(0, -1).join('/');
    const fileName = item.path.split('/').pop() ?? '';
    logger.debug(`使用简化的文件名作为预览参数: ${fileName}`);

    dispatch({ type: 'RESET_PREVIEW' });

    try {
      let proxyUrl = item.download_url;
      if (getForceServerProxy()) {
        proxyUrl = `/api/github?action=getFileContent&url=${encodeURIComponent(item.download_url)}`;
      } else {
        proxyUrl = GitHubService.transformImageUrl(item.download_url, item.path, useTokenMode) ?? item.download_url;
      }

    const fileNameLower = item.name.toLowerCase();

    if (isMarkdownFile(fileNameLower)) {
        updateUrlWithHistory(dirPath, item.path);
        dispatch({ type: 'SET_MD_LOADING', loading: true });

        try {
          const content = await GitHubService.getFileContent(item.download_url);
          dispatch({ type: 'SET_MD_PREVIEW', content, item });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : '未知错误';
          onError(`加载Markdown文件失败: ${errorMessage}`);
        } finally {
          dispatch({ type: 'SET_MD_LOADING', loading: false });
        }
      }
      else if (isPdfFile(fileNameLower)) {
        // 使用新的 PDF 预览工具函数
        try {
          await openPDFPreview({
            fileName: item.name,
            downloadUrl: item.download_url,
            theme: muiTheme,
            isDev: import.meta.env.DEV
          });
          
          logger.info(`已在新标签页打开 PDF: ${item.path}`);
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : '未知错误';
          onError(`打开PDF失败: ${errorMessage}`);
        }
        return;
      }
      else if (isImageFile(fileNameLower)) {
        // 图片预览
        dispatch({ type: 'SET_IMAGE_LOADING', loading: true });
        dispatch({ type: 'SET_IMAGE_ERROR', error: null });

        try {
          updateUrlWithHistory(dirPath, item.path);
          dispatch({
            type: 'SET_IMAGE_PREVIEW',
            url: proxyUrl,
            item
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : '未知错误';
          dispatch({ type: 'SET_IMAGE_ERROR', error: errorMessage });
          onError(`加载图片文件失败: ${errorMessage}`);
        } finally {
          dispatch({ type: 'SET_IMAGE_LOADING', loading: false });
        }
    } else if (isWordFile(fileNameLower)) {
      // 使用统一的Office预览组件
      updateUrlWithHistory(dirPath, item.path);
      loadOfficePreview(item, OfficeFileType.WORD);
    } else if (isExcelFile(fileNameLower)) {
      // 使用统一的Office预览组件
      updateUrlWithHistory(dirPath, item.path);
      loadOfficePreview(item, OfficeFileType.EXCEL);
    } else if (isPPTFile(fileNameLower)) {
      // 使用统一的Office预览组件
      updateUrlWithHistory(dirPath, item.path);
      loadOfficePreview(item, OfficeFileType.PPT);
    } else {
      onError('不支持的文件类型');
    }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      onError(`预览文件失败: ${errorMessage}`);
    }
  }, [onError, useTokenMode, muiTheme, loadOfficePreview]);

  // 关闭预览
  const closePreview = useCallback(() => {
    logger.debug('关闭预览组件');

    // 获取当前预览的项目
    const currentItem = currentPreviewItemRef.current;

    if (currentItem !== null) {
      // 从路径中提取目录部分
      const dirPath = currentItem.path.split('/').slice(0, -1).join('/');

      logger.debug(`关闭预览 ${currentItem.path}，返回到目录 ${dirPath}`);

      // 更新 URL，移除预览参数 - 始终创建新的历史条目
      updateUrlWithHistory(dirPath);

      // 重置当前预览项目引用
      currentPreviewItemRef.current = null;
    } else {
      logger.warn('尝试关闭预览，但没有当前预览项目');
    }

    // 重置预览状态
    dispatch({ type: 'RESET_PREVIEW' });
    hasActivePreviewRef.current = false;
  }, []);


  // 图像全屏切换
  const toggleImageFullscreen = useCallback(() => {
    dispatch({ type: 'SET_IMAGE_FULLSCREEN', fullscreen: !previewState.isImageFullscreen });
  }, [previewState.isImageFullscreen]);

  // Office全屏切换
  const toggleOfficeFullscreen = useCallback(() => {
    dispatch({ type: 'SET_OFFICE_FULLSCREEN', fullscreen: !previewState.isOfficeFullscreen });
  }, [previewState.isOfficeFullscreen]);


  // 图像错误处理
  const handleImageError = useCallback((error: string) => {
    dispatch({ type: 'SET_IMAGE_ERROR', error });
    dispatch({ type: 'SET_IMAGE_LOADING', loading: false });
    onError(`图像加载失败: ${error}`);
  }, [onError]);

  // Office错误处理
  const handleOfficeError = useCallback((error: string) => {
    dispatch({ type: 'SET_OFFICE_ERROR', error });
    dispatch({ type: 'SET_OFFICE_LOADING', loading: false });
    onError(`Office文档加载失败: ${error}`);
  }, [onError]);

  // 监听浏览器历史导航事件，处理预览的后退操作
  useEffect(() => {
    const handlePopState = (event: PopStateEvent): void => {
      logger.debug('检测到浏览器后退/前进按钮操作');

      // 防止重复处理
      if (isHandlingNavigationRef.current) {
        logger.debug('已在处理导航事件，跳过');
        return;
      }

      isHandlingNavigationRef.current = true;

      try {
        // 从历史状态中获取预览信息
        const state = event.state as { path?: string; preview?: string } | null;
        logger.debug(`历史状态: ${JSON.stringify(state)}`);

        // 当前是否有预览打开 - 使用 ref 值，确保最新状态
        const hasActivePreview = hasActivePreviewRef.current;
        logger.debug(`当前预览状态: ${hasActivePreview ? '活跃' : '非活跃'}`);

        // 检查 URL 是否包含预览参数
        const urlHasPreview = hasPreviewParam();
        const previewPath = getPreviewFromUrl();
        logger.debug(`URL 预览参数: ${urlHasPreview ? previewPath : '无'}`);

        // 如果当前有预览，但 URL 不再包含预览参数，则关闭预览（后退操作）
        if (hasActivePreview && !urlHasPreview) {
          logger.debug('检测到后退关闭预览操作');

          // 重置预览状态
          dispatch({ type: 'RESET_PREVIEW' });
          currentPreviewItemRef.current = null;
          hasActivePreviewRef.current = false;

          logger.debug('预览已关闭');
          return;
        }

        // 如果 URL 包含预览参数，但当前没有预览或预览的是不同文件，则尝试打开预览（前进操作）
        if (urlHasPreview && previewPath !== '') {
          const currentPreviewName = currentPreviewItemRef.current?.name;
          const currentPreviewPath = currentPreviewItemRef.current?.path;

          // 检查文件名是否匹配
          if (!hasActivePreview ||
              (currentPreviewName !== previewPath &&
              !(currentPreviewPath?.endsWith(`/${previewPath}`) ?? false))) {
            logger.debug(`检测到前进打开预览操作: ${previewPath}`);

            // 使用回调函数查找文件项
            if (findFileItemByPath !== undefined) {
              const fileItem = findFileItemByPath(previewPath);

              if (fileItem !== undefined) {
                logger.debug(`找到预览文件项: ${fileItem.path}`);
                // 更新预览引用并打开预览
                currentPreviewItemRef.current = fileItem;
                void selectFile(fileItem);
                logger.debug('正在重新打开预览');
              } else {
                logger.warn(`前进操作无法找到文件: ${previewPath}`);
              }
            } else {
              logger.warn('未提供查找文件的回调函数，无法重新打开预览');
            }
          }
        }
      } finally {
        // 完成处理
        isHandlingNavigationRef.current = false;
      }
    };

    // 添加历史导航事件监听器
    window.addEventListener('popstate', handlePopState);
    logger.debug('已添加 popstate 事件监听器');

    // 组件卸载时移除监听器
    return () => {
      window.removeEventListener('popstate', handlePopState);
      logger.debug('已移除 popstate 事件监听器');
    };
  }, [selectFile, findFileItemByPath]);

  return {
    previewState,
    useTokenMode,
    setUseTokenMode,
    selectFile,
    closePreview,
    toggleImageFullscreen,
    toggleOfficeFullscreen,
    handleImageError,
    handleOfficeError,
    currentPreviewItemRef
  };
};
