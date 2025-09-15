import { useReducer, useCallback, useRef, useState, useEffect } from 'react';
import { useTheme } from '@mui/material';
import { 
  PreviewState, 
  PreviewAction, 
  GitHubContent,
  OfficeFileType
} from '../types';
import { GitHubService } from '../services/github';
import { isImageFile, isPdfFile, isMarkdownFile, isWordFile, isExcelFile, isPPTFile, logger } from '../utils';
import { getPreviewFromUrl, updateUrlWithHistory, updateUrlWithoutHistory, hasPreviewParam } from '../utils/urlManager';
import { extractPDFThemeColors, generatePDFLoadingHTML, generatePDFErrorHTML } from '../utils/pdfLoading';

const FORCE_SERVER_PROXY = !import.meta.env.DEV || import.meta.env.VITE_USE_TOKEN_MODE === 'true';

const initialPreviewState: PreviewState = {
  previewContent: null,
  previewingItem: null,
  loadingPreview: false,
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

export const useFilePreview = (
  onError: (message: string) => void,
  findFileItemByPath?: (path: string) => GitHubContent | undefined
) => {
  const [previewState, dispatch] = useReducer(previewReducer, initialPreviewState);
  const [useTokenMode, setUseTokenMode] = useState(true);
  const muiTheme = useTheme();
  const pdfCurrentPageRef = useRef(previewState.pdfCurrentPage);
  const currentPreviewItemRef = useRef<GitHubContent | null>(null);
  const hasActivePreviewRef = useRef<boolean>(false);
  const isHandlingNavigationRef = useRef<boolean>(false);
  
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
  
  useEffect(() => {
    const previewPath = getPreviewFromUrl();
    if (previewPath) {
      logger.debug(`从URL加载预览: ${previewPath}`);
      currentPreviewItemRef.current = {
        path: previewPath,
        name: previewPath.split('/').pop() || '',
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
  
  const selectFile = useCallback(async (item: GitHubContent) => {
    if (!item.download_url) {
      onError('无法获取文件下载链接');
      return;
    }
    
    logger.debug(`正在选择文件预览: ${item.path}`);
    currentPreviewItemRef.current = item;
    const dirPath = item.path.split('/').slice(0, -1).join('/');
    const fileName = item.path.split('/').pop() || '';
    logger.debug(`使用简化的文件名作为预览参数: ${fileName}`);
    
    dispatch({ type: 'RESET_PREVIEW' });
    
    try {
      let proxyUrl = item.download_url;
      if (FORCE_SERVER_PROXY) {
        proxyUrl = `/api/github?action=getFileContent&url=${encodeURIComponent(item.download_url)}`;
      } else {
        proxyUrl = GitHubService.transformImageUrl(item.download_url, item.path, useTokenMode) || item.download_url;
      }
    
    const fileNameLower = item.name.toLowerCase();
    
    if (isMarkdownFile(fileNameLower)) {
        if (fileNameLower === 'readme.md') {
          updateUrlWithHistory(dirPath, item.path);
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
          onError('已禁用Markdown文件预览功能，如需查看内容请下载文件');
          logger.info(`阻止加载非README的Markdown文件: ${item.path}`);
        }
      } 
      else if (isPdfFile(fileNameLower)) {
        try {
          let newTab: Window | null = window.open('', '_blank');
          if (!newTab) {
            const a = document.createElement('a');
            a.href = item.download_url;
            a.target = '_blank';
            a.rel = 'noopener';
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            a.remove();
            return;
          }

          const themeColors = extractPDFThemeColors(muiTheme);
          try { logger.debug('PDF 预览使用的主题色:', themeColors); } catch {}

          const loadingHTML = generatePDFLoadingHTML(item.name, themeColors);
          newTab.document.write(loadingHTML);
          newTab.document.close();

          if (import.meta.env.DEV) {
            try {
              const statusEl = newTab.document.getElementById('status');
              const progressEl = newTab.document.getElementById('progress');
              const viewerEl = newTab.document.getElementById('viewer') as HTMLIFrameElement | null;
              const loaderEl = newTab.document.getElementById('loader');
              const progressCircle = newTab.document.getElementById('progress-circle') as SVGCircleElement | null;

              // 创建 AbortController 用于取消请求
              const abortController = new AbortController();
              // 将 abortController 设置到新标签页的全局变量中
              (newTab as any).abortController = abortController;

              const resp = await fetch(item.download_url, { 
                mode: 'cors',
                signal: abortController.signal
              });
              if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`);

              const contentLengthHeader = resp.headers.get('Content-Length') || resp.headers.get('content-length');
              const total = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;
              let loaded = 0;
              const reader = resp.body.getReader();
              const chunks: Uint8Array[] = [];

              const formatBytes = (n: number) => `${(n / 1048576).toFixed(2)} MB`;
              const circumference = 2 * Math.PI * 20; // radius = 20

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (value) {
                  chunks.push(value);
                  loaded += value.byteLength;
                  const pct = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : null;
                  
                  // 更新文本进度
                  if (progressEl) {
                    progressEl.textContent = total > 0
                      ? `已下载 ${formatBytes(loaded)} / ${formatBytes(total)} (${pct}%)`
                      : `已下载 ${formatBytes(loaded)}`;
                  }
                  
                  // 更新圆形进度条
                  if (progressCircle && total > 0 && pct !== null) {
                    progressCircle.classList.add('determinate');
                    const dashOffset = circumference - (circumference * pct / 100);
                    progressCircle.style.strokeDashoffset = dashOffset.toString();
                  }
                }
              }

              const blob = new Blob(chunks as BlobPart[], { type: 'application/pdf' });
              const blobUrl = URL.createObjectURL(blob);
              setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);

              if (viewerEl) {
                viewerEl.src = blobUrl;
                viewerEl.style.visibility = 'visible';
              } else {
                newTab.location.replace(blobUrl);
              }
              if (loaderEl) loaderEl.style.display = 'none';
              // 隐藏取消按钮，因为加载已完成
              const cancelBtn = newTab.document.getElementById('cancel-btn');
              if (cancelBtn) cancelBtn.style.display = 'none';
              newTab.document.title = item.name || 'PDF';
            } catch (e: any) {
              // 检查是否是用户主动取消
              if (e.name === 'AbortError') {
                // 用户取消，不显示错误信息
                return;
              }
              // 使用统一的错误页面模板
              const loaderEl = newTab.document.getElementById('loader');
              if (loaderEl) {
                const errorHTML = generatePDFErrorHTML(item.name, (e && e.message) || '未知错误', item.download_url, themeColors);
                loaderEl.innerHTML = errorHTML;
              } else {
                newTab.location.replace(item.download_url);
              }
            }
          } else {
            try {
              const proxyUrl = `/api/github?action=getFileContent&url=${encodeURIComponent(item.download_url)}`;
              
              if (newTab.document.getElementById('status')) {
                newTab.document.getElementById('status')!.textContent = '正在载入预览';
              }
              
              if (newTab.document.getElementById('progress')) {
                newTab.document.getElementById('progress')!.textContent = '若等待时间过长，请尝试直接下载';
              }
              
              const cancelBtn = newTab.document.getElementById('cancel-btn');
              if (cancelBtn) cancelBtn.style.display = 'none';
              setTimeout(() => {
                newTab!.location.replace(proxyUrl);
              }, 800);
            } catch (e: any) {
              const loaderEl = newTab.document.getElementById('loader');
              if (loaderEl) {
                const proxyUrl = `/api/github?action=getFileContent&url=${encodeURIComponent(item.download_url)}`;
                const errorHTML = generatePDFErrorHTML(item.name, '加载失败，请直接打开', proxyUrl, themeColors);
                loaderEl.innerHTML = errorHTML;
              }
            }
          }
          logger.info(`已在新标签页打开 PDF: ${item.path}`);
        } catch (error: any) {
          onError(`打开PDF失败: ${error.message}`);
        }
        // 对于原生预览，不在应用内维护预览状态，也不使用预览参数
        return;
      } 
      else if (isImageFile(fileNameLower)) {
        // 图片预览
        dispatch({ type: 'SET_IMAGE_LOADING', loading: true });
        dispatch({ type: 'SET_IMAGE_ERROR', error: null });
        
        try {
          // 更新 URL，添加预览参数（仅对内嵌预览类型使用）
          updateUrlWithHistory(dirPath, item.path);
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
      // 更新 URL，添加预览参数（仅对内嵌预览类型使用）
      updateUrlWithHistory(dirPath, item.path);
      loadOfficePreview(item, OfficeFileType.WORD);
    } else if (isExcelFile(fileNameLower)) {
      // 使用统一的Office预览组件
      // 更新 URL，添加预览参数（仅对内嵌预览类型使用）
      updateUrlWithHistory(dirPath, item.path);
      loadOfficePreview(item, OfficeFileType.EXCEL);
    } else if (isPPTFile(fileNameLower)) {
      // 使用统一的Office预览组件
      // 更新 URL，添加预览参数（仅对内嵌预览类型使用）
      updateUrlWithHistory(dirPath, item.path);
      loadOfficePreview(item, OfficeFileType.PPT);
    } else {
      onError('不支持的文件类型');
    }
    } catch (error: any) {
      onError(`预览文件失败: ${error.message}`);
    }
  }, [onError, useTokenMode, muiTheme]);

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