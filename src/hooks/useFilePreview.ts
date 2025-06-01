import { useReducer, useCallback, useRef, useState, useEffect } from 'react';
import { 
  PreviewState, 
  PreviewAction, 
  GitHubContent,
  OfficeFileType
} from '../types';
import { GitHubService } from '../services/github';
import { isImageFile, isPdfFile, isMarkdownFile, isWordFile, isExcelFile, isPPTFile, logger } from '../utils';
import { getPreviewFromUrl, updateUrlWithHistory, updateUrlWithoutHistory, hasPreviewParam } from '../utils/urlManager';

// 是否强制使用服务端API
const FORCE_SERVER_PROXY = !import.meta.env.DEV || import.meta.env.VITE_USE_TOKEN_MODE === 'true';

// 初始预览状态
const initialPreviewState: PreviewState = {
  // Markdown预览 (仅用于README文件)
  previewContent: null,
  previewingItem: null,
  loadingPreview: false,
  
  // PDF预览
  pdfPreviewUrl: null,
  previewingPdfItem: null,
  loadingPdfPreview: false,
  pdfError: null,
  numPdfPages: null,
  pdfCurrentPage: 1,
  isPdfFullscreen: false,
  isPdfDimmed: false,
  pdfPageInput: '1',
  
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

// 预览状态reducer
function previewReducer(state: PreviewState, action: PreviewAction): PreviewState {
  switch (action.type) {
    case 'RESET_PREVIEW':
      return initialPreviewState;
      
    case 'SET_MD_PREVIEW':
      // 注意：此操作仅用于README文件预览，其他Markdown文件预览功能已禁用
      return {
        ...state,
        previewContent: action.content,
        previewingItem: action.item
      };
      
    case 'SET_MD_LOADING':
      // 注意：此操作仅用于README文件预览，其他Markdown文件预览功能已禁用
      return {
        ...state,
        loadingPreview: action.loading
      };
      
    case 'SET_PDF_PREVIEW':
      return {
        ...state,
        pdfPreviewUrl: action.url,
        previewingPdfItem: action.item
      };
      
    case 'SET_PDF_LOADING':
      return {
        ...state,
        loadingPdfPreview: action.loading
      };
      
    case 'SET_PDF_ERROR':
      return {
        ...state,
        pdfError: action.error
      };
      
    case 'SET_PDF_PAGES':
      return {
        ...state,
        numPdfPages: action.pages
      };
      
    case 'SET_PDF_PAGE':
      return {
        ...state,
        pdfCurrentPage: action.page
      };
      
    case 'SET_PDF_FULLSCREEN':
      return {
        ...state,
        isPdfFullscreen: action.fullscreen
      };
      
    case 'SET_PDF_DIMMED':
      return {
        ...state,
        isPdfDimmed: action.dimmed
      };
      
    case 'SET_PDF_PAGE_INPUT':
      return {
        ...state,
        pdfPageInput: action.input
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

// 自定义Hook，管理文件预览
export const useFilePreview = (
  onError: (message: string) => void,
  findFileItemByPath?: (path: string) => GitHubContent | undefined
) => {
  const [previewState, dispatch] = useReducer(previewReducer, initialPreviewState);
  const [useTokenMode, setUseTokenMode] = useState(true);
  
  // 引用当前状态
  const pdfCurrentPageRef = useRef(previewState.pdfCurrentPage);
  
  // 引用当前预览的项目
  const currentPreviewItemRef = useRef<GitHubContent | null>(null);

  // 跟踪预览是否活跃的 ref
  const hasActivePreviewRef = useRef<boolean>(false);
  
  // 追踪是否正在处理前进/后退操作
  const isHandlingNavigationRef = useRef<boolean>(false);
  
  // 更新活跃预览状态引用
  useEffect(() => {
    const hasActivePreview = !!(
      previewState.previewingItem || 
      previewState.previewingPdfItem || 
      previewState.previewingImageItem || 
      previewState.previewingOfficeItem
    );
    hasActivePreviewRef.current = hasActivePreview;
    logger.debug(`预览状态更新: ${hasActivePreview ? '活跃' : '非活跃'}`);
  }, [
    previewState.previewingItem, 
    previewState.previewingPdfItem, 
    previewState.previewingImageItem, 
    previewState.previewingOfficeItem
  ]);
  
  // 检查 URL 是否包含预览参数
  useEffect(() => {
    const previewPath = getPreviewFromUrl();
    if (previewPath) {
      logger.debug(`从URL加载预览: ${previewPath}`);
      // URL 中有预览参数，但预览状态为空，需要在内容加载后处理
      currentPreviewItemRef.current = {
        path: previewPath,
        name: previewPath.split('/').pop() || '',
        // 下面的字段可能是占位符，将在实际加载内容时更新
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
  
  // 选择文件
  const selectFile = useCallback(async (item: GitHubContent) => {
    if (!item.download_url) {
      onError('无法获取文件下载链接');
      return;
    }
    
    logger.debug(`正在选择文件预览: ${item.path}`);
    
    // 更新当前预览项目引用
    currentPreviewItemRef.current = item;
    
    // 更新 URL，添加预览参数 - 始终创建新的历史条目
    const dirPath = item.path.split('/').slice(0, -1).join('/');
    // 从路径中提取文件名，作为预览参数，缩短 URL 长度
    const fileName = item.path.split('/').pop() || '';
    logger.debug(`使用简化的文件名作为预览参数: ${fileName}`);
    updateUrlWithHistory(dirPath, item.path);
    
    dispatch({ type: 'RESET_PREVIEW' });
    
    // 根据文件类型处理预览
    
    try {
      // 使用代理URL
      let proxyUrl = item.download_url;
      
      // 如果是非开发环境或启用了令牌模式，使用服务端API代理
      if (FORCE_SERVER_PROXY) {
        proxyUrl = `/api/github?action=getFileContent&url=${encodeURIComponent(item.download_url)}`;
      } else {
        // 开发环境下可能需要使用代理
        proxyUrl = GitHubService.transformImageUrl(item.download_url, item.path, useTokenMode) || item.download_url;
      }
    
    const fileNameLower = item.name.toLowerCase();
    
    if (isMarkdownFile(fileNameLower)) {
        // 只预览README.md文件，其他Markdown文件不支持预览
        if (fileNameLower === 'readme.md') {
          // Markdown预览
          dispatch({ type: 'SET_MD_LOADING', loading: true });
          
          try {
            const content = await GitHubService.getFileContent(item.download_url);
            dispatch({ type: 'SET_MD_PREVIEW', content, item });
          } catch (error: any) {
            onError(`加载Markdown文件失败: ${error.message}`);
          } finally {
            dispatch({ type: 'SET_MD_LOADING', loading: false });
          }
        } else {
          // 不支持预览其他Markdown文件
          onError('已禁用Markdown文件预览功能，如需查看内容请下载文件');
          logger.info(`阻止加载非README的Markdown文件: ${item.path}`);
        }
      } 
      else if (isPdfFile(fileNameLower)) {
        // PDF预览
        dispatch({ type: 'SET_PDF_LOADING', loading: true });
        dispatch({ type: 'SET_PDF_ERROR', error: null });
        
        try {
          dispatch({ 
            type: 'SET_PDF_PREVIEW', 
            url: proxyUrl,
            item
          });
        } catch (error: any) {
          dispatch({ type: 'SET_PDF_ERROR', error: error.message });
          onError(`加载PDF文件失败: ${error.message}`);
        } finally {
          dispatch({ type: 'SET_PDF_LOADING', loading: false });
        }
      } 
      else if (isImageFile(fileNameLower)) {
        // 图片预览
        dispatch({ type: 'SET_IMAGE_LOADING', loading: true });
        dispatch({ type: 'SET_IMAGE_ERROR', error: null });
        
        try {
          dispatch({ 
            type: 'SET_IMAGE_PREVIEW', 
            url: proxyUrl,
            item
          });
        } catch (error: any) {
          dispatch({ type: 'SET_IMAGE_ERROR', error: error.message });
          onError(`加载图片文件失败: ${error.message}`);
        } finally {
          dispatch({ type: 'SET_IMAGE_LOADING', loading: false });
        }
    } else if (isWordFile(fileNameLower)) {
      // 使用统一的Office预览组件
      loadOfficePreview(item, OfficeFileType.WORD);
    } else if (isExcelFile(fileNameLower)) {
      // 使用统一的Office预览组件
      loadOfficePreview(item, OfficeFileType.EXCEL);
    } else if (isPPTFile(fileNameLower)) {
      // 使用统一的Office预览组件
      loadOfficePreview(item, OfficeFileType.PPT);
    } else {
      onError('不支持的文件类型');
    }
    } catch (error: any) {
      onError(`预览文件失败: ${error.message}`);
    }
  }, [onError, useTokenMode]);

  // Office预览加载函数
  const loadOfficePreview = useCallback((item: GitHubContent, fileType: OfficeFileType) => {
    if (!item.download_url) return;
    
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
    } catch (error: any) {
      dispatch({ type: 'SET_OFFICE_ERROR', error: error.message });
      onError(`加载${fileType}文件失败: ${error.message}`);
    } finally {
      dispatch({ type: 'SET_OFFICE_LOADING', loading: false });
    }
  }, [onError]);
  
  // 加载Markdown预览 (仅用于README文件)
  const loadMarkdownPreview = useCallback(async (item: GitHubContent) => {
    if (!item.download_url) return;
    
    // 只加载README.md文件
    if (item.name.toLowerCase() !== 'readme.md') {
      onError('已禁用Markdown文件预览功能，如需查看内容请下载文件');
      logger.info(`阻止加载非README的Markdown文件: ${item.path}`);
      return;
    }
    
    dispatch({ type: 'SET_MD_PREVIEW', content: null, item });
    dispatch({ type: 'SET_MD_LOADING', loading: true });
    
    try {
      logger.time('加载Markdown');
      const content = await GitHubService.getFileContent(item.download_url);
      dispatch({ type: 'SET_MD_PREVIEW', content, item });
    } catch (e: any) {
      onError(`加载Markdown失败: ${e.message}`);
    } finally {
      dispatch({ type: 'SET_MD_LOADING', loading: false });
      logger.timeEnd('加载Markdown');
    }
  }, [onError]);
  
  // 加载PDF预览
  const loadPdfPreview = useCallback((item: GitHubContent) => {
    if (!item.download_url) return;
    
    dispatch({ type: 'SET_PDF_PREVIEW', url: item.download_url, item });
    dispatch({ type: 'SET_PDF_LOADING', loading: true });
    
    // PDF加载通过组件处理，这里只设置URL
  }, []);
  
  // 加载图像预览
  const loadImagePreview = useCallback((item: GitHubContent) => {
    if (!item.download_url) return;
    
    dispatch({ type: 'SET_IMAGE_PREVIEW', url: item.download_url, item });
    dispatch({ type: 'SET_IMAGE_LOADING', loading: true });
    
    // 图像加载通过img标签处理，这里只设置URL
  }, []);
  
  // 关闭预览
  const closePreview = useCallback(() => {
    logger.debug('关闭预览组件');
    
    // 获取当前预览的项目
    const currentItem = currentPreviewItemRef.current;
    
    if (currentItem) {
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
  
  // 更新PDF页码
  const updatePdfPage = useCallback((page: number) => {
    pdfCurrentPageRef.current = page;
    dispatch({ type: 'SET_PDF_PAGE', page });
  }, []);
  
  // PDF全屏切换
  const togglePdfFullscreen = useCallback(() => {
    dispatch({ type: 'SET_PDF_FULLSCREEN', fullscreen: !previewState.isPdfFullscreen });
  }, [previewState.isPdfFullscreen]);
  
  // 图像全屏切换
  const toggleImageFullscreen = useCallback(() => {
    dispatch({ type: 'SET_IMAGE_FULLSCREEN', fullscreen: !previewState.isImageFullscreen });
  }, [previewState.isImageFullscreen]);
  
  // Office全屏切换
  const toggleOfficeFullscreen = useCallback(() => {
    dispatch({ type: 'SET_OFFICE_FULLSCREEN', fullscreen: !previewState.isOfficeFullscreen });
  }, [previewState.isOfficeFullscreen]);
  
  // PDF页面加载完成
  const handlePdfPagesLoaded = useCallback((numPages: number) => {
    dispatch({ type: 'SET_PDF_PAGES', pages: numPages });
    dispatch({ type: 'SET_PDF_LOADING', loading: false });
  }, []);
  
  // PDF错误处理
  const handlePdfError = useCallback((error: string) => {
    dispatch({ type: 'SET_PDF_ERROR', error });
    dispatch({ type: 'SET_PDF_LOADING', loading: false });
    onError(`PDF加载失败: ${error}`);
  }, [onError]);
  
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
    const handlePopState = (event: PopStateEvent) => {
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
        if (urlHasPreview && previewPath) {
          const currentPreviewName = currentPreviewItemRef.current?.name;
          const currentPreviewPath = currentPreviewItemRef.current?.path;
          
          // 检查文件名是否匹配
          if (!hasActivePreview || 
              (currentPreviewName !== previewPath && 
               !currentPreviewPath?.endsWith(`/${previewPath}`))) {
            logger.debug(`检测到前进打开预览操作: ${previewPath}`);
            
            // 使用回调函数查找文件项
            if (findFileItemByPath) {
              const fileItem = findFileItemByPath(previewPath);
              
              if (fileItem) {
                logger.debug(`找到预览文件项: ${fileItem.path}`);
                // 更新预览引用并打开预览
                currentPreviewItemRef.current = fileItem;
                selectFile(fileItem);
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
    updatePdfPage,
    togglePdfFullscreen,
    toggleImageFullscreen,
    toggleOfficeFullscreen,
    handlePdfPagesLoaded,
    handlePdfError,
    handleImageError,
    handleOfficeError,
    pdfCurrentPageRef,
    currentPreviewItemRef
  };
}; 