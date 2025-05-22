import { useReducer, useCallback, useRef, useState } from 'react';
import { 
  PreviewState, 
  PreviewAction, 
  GitHubContent,
  OfficeFileType
} from '../types';
import { GitHubService } from '../services/github';
import { isImageFile, isPdfFile, isMarkdownFile, isWordFile, isExcelFile, isPPTFile, logger } from '../utils';

// 是否强制使用服务端API
const FORCE_SERVER_PROXY = !import.meta.env.DEV || (import.meta.env.USE_TOKEN_MODE || import.meta.env.VITE_USE_TOKEN_MODE) === 'true';

// 初始预览状态
const initialPreviewState: PreviewState = {
  previewContent: null,
  previewingItem: null,
  loadingPreview: false,
  isMdFullscreen: false,
  
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
      
    case 'SET_MD_FULLSCREEN':
      return {
        ...state,
        isMdFullscreen: action.fullscreen
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
export const useFilePreview = (onError: (message: string) => void) => {
  const [previewState, dispatch] = useReducer(previewReducer, initialPreviewState);
  const [useTokenMode, setUseTokenMode] = useState(true);
  
  // 引用当前状态
  const pdfCurrentPageRef = useRef(previewState.pdfCurrentPage);
  
  // 选择文件
  const selectFile = useCallback(async (item: GitHubContent) => {
    if (!item.download_url) {
      onError('无法获取文件下载链接');
      return;
    }
    
    dispatch({ type: 'RESET_PREVIEW' });
    
    // 根据文件类型处理预览
    const fileName = item.name.toLowerCase();
    
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
    
    if (isMarkdownFile(fileName)) {
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
      } 
      else if (isPdfFile(fileName)) {
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
      else if (isImageFile(fileName)) {
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
    } else if (isWordFile(fileName)) {
      // 使用统一的Office预览组件
      loadOfficePreview(item, OfficeFileType.WORD);
    } else if (isExcelFile(fileName)) {
      // 使用统一的Office预览组件
      loadOfficePreview(item, OfficeFileType.EXCEL);
    } else if (isPPTFile(fileName)) {
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
  
  // 加载Markdown预览
  const loadMarkdownPreview = useCallback(async (item: GitHubContent) => {
    if (!item.download_url) return;
    
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
    dispatch({ type: 'RESET_PREVIEW' });
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
  
  // Markdown全屏切换
  const toggleMdFullscreen = useCallback(() => {
    dispatch({ type: 'SET_MD_FULLSCREEN', fullscreen: !previewState.isMdFullscreen });
  }, [previewState.isMdFullscreen]);
  
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
  
  return {
    previewState,
    useTokenMode,
    setUseTokenMode,
    selectFile,
    closePreview,
    updatePdfPage,
    togglePdfFullscreen,
    toggleMdFullscreen,
    toggleImageFullscreen,
    toggleOfficeFullscreen,
    handlePdfPagesLoaded,
    handlePdfError,
    handleImageError,
    handleOfficeError,
    pdfCurrentPageRef
  };
}; 