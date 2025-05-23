import React, { useRef, useState, useEffect } from 'react';
import { Container, useTheme, useMediaQuery, Box, Typography } from '@mui/material';
import BreadcrumbNavigation from './BreadcrumbNavigation';
import FileList from '../file/FileList';
import MarkdownPreview from '../preview/MarkdownPreview';
import ImagePreview from '../preview/ImagePreview';
import PDFPreview from '../preview/PDFPreview';
import OfficePreview from '../preview/OfficePreview';
import ErrorDisplay from '../common/ErrorDisplay';
import LoadingSpinner from '../common/LoadingSpinner';
import FullScreenPreview from '../file/FullScreenPreview';
import { useGitHub } from '../../contexts/GitHubContext';
import { FileListSkeleton } from '../common/SkeletonComponents';
import { getPreviewFromUrl } from '../../utils/urlManager';
import { logger } from '../../utils';

const MainContent: React.FC = () => {
  // 获取主题和响应式布局
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  
  // 创建引用
  const breadcrumbsContainerRef = useRef<HTMLDivElement>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const lastVisiblePagesRef = useRef<{page: number, ratio: number}[]>([]);
  const isPdfInitializingRef = useRef<boolean>(false);
  
  // 自动计算面包屑最大项目数
  const [breadcrumbsMaxItems, setBreadcrumbsMaxItems] = useState<number>(0); // 0表示不限制
  
  // 从上下文获取数据和方法
  const {
    currentPath,
    contents,
    readmeContent,
    loading,
    loadingReadme,
    error,
    handleRetry,
    navigateTo,
    previewState,
    downloadState,
    downloadFile,
    downloadFolder,
    selectFile,
    closePreview,
    refresh,
    cancelDownload,
    currentPreviewItemRef
  } = useGitHub();
  
  // 生成面包屑导航路径段
  const generateBreadcrumbSegments = () => {
    const segments = [{ name: 'Home', path: '' }];
    
    if (currentPath) {
      const pathParts = currentPath.split('/');
      let currentSegmentPath = '';
      
      for (let i = 0; i < pathParts.length; i++) {
        currentSegmentPath += (i === 0 ? '' : '/') + pathParts[i];
        segments.push({
          name: pathParts[i],
          path: currentSegmentPath
        });
      }
    }
    
    return segments;
  };
  
  const breadcrumbSegments = generateBreadcrumbSegments();
  
  // 处理面包屑点击
  const handleBreadcrumbClick = (path: string) => {
    navigateTo(path);
  };
  
  // 处理文件/文件夹点击
  const handleItemClick = (item: any) => {
    if (item.type === 'dir') {
      navigateTo(item.path);
    } else {
      selectFile(item);
    }
  };
  
  // 处理下载点击
  const handleDownloadClick = (e: React.MouseEvent, item: any) => {
    e.preventDefault();
    e.stopPropagation();
    downloadFile(item);
  };
  
  // 处理文件夹下载点击
  const handleFolderDownloadClick = (e: React.MouseEvent, item: any) => {
    e.preventDefault();
    e.stopPropagation();
    downloadFolder(item.path, item.name);
  };

  // 处理取消下载点击
  const handleCancelDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    cancelDownload();
  };

  // 确定是否有活跃的预览
  const hasActivePreview = 
    (previewState.previewingPdfItem && previewState.pdfPreviewUrl) ||
    (previewState.previewingImageItem && previewState.imagePreviewUrl);
  
  // 自动调整面包屑显示
  useEffect(() => {
    const breadcrumbSegments = generateBreadcrumbSegments();
    
    // 在移动端，使用更激进的折叠策略
    if (isSmallScreen) {
      // 路径段数超过3个时，在移动端强制折叠
      if (breadcrumbSegments.length > 3) {
        setBreadcrumbsMaxItems(3);
      } else {
        setBreadcrumbsMaxItems(0); // 少于或等于3个时不折叠
      }
      return;
    }
    
    // 桌面端逻辑
    // 如果面包屑项目少于或等于3个，不需要限制
    if (breadcrumbSegments.length <= 3) {
      setBreadcrumbsMaxItems(0); // 0表示不限制
      return;
    }
    
    // 创建ResizeObserver监听容器尺寸变化
    const resizeObserver = new ResizeObserver(() => {
      if (!breadcrumbsContainerRef.current) return;
      
      // 如果路径太长（超过8段），则设置合理的限制
      if (breadcrumbSegments.length > 8) {
        setBreadcrumbsMaxItems(8);
        return;
      }
      
      // 不限制项目数量，使用CSS处理溢出
      setBreadcrumbsMaxItems(0);
    });
    
    if (breadcrumbsContainerRef.current) {
      resizeObserver.observe(breadcrumbsContainerRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [currentPath, isSmallScreen, generateBreadcrumbSegments]);
  
  // 处理从 URL 加载预览
  useEffect(() => {
    // 只在内容加载完成且没有错误时处理
    if (!loading && !error && contents.length > 0) {
      const previewFileName = getPreviewFromUrl();
      
      if (!previewFileName) return;
      
      logger.debug(`从URL获取预览文件名: ${previewFileName}`);
      
      // 查找匹配的文件
      // 首先尝试使用文件名直接匹配
      let fileItem = contents.find(item => item.name === previewFileName);
      
      // 如果没找到，尝试查找路径末尾匹配的文件
      if (!fileItem) {
        fileItem = contents.find(item => item.path.endsWith(`/${previewFileName}`));
      }
      
      if (fileItem) {
        logger.debug(`找到匹配的文件: ${fileItem.path}`);
        // 更新当前预览引用
        currentPreviewItemRef.current = fileItem;
        
        // 避免重复加载已经打开的预览
        const hasActivePreview = !!(
          previewState.previewingItem?.path === fileItem.path || 
          previewState.previewingPdfItem?.path === fileItem.path || 
          previewState.previewingImageItem?.path === fileItem.path || 
          previewState.previewingOfficeItem?.path === fileItem.path
        );
        
        if (!hasActivePreview) {
          logger.debug(`预览文件未打开，正在加载: ${fileItem.path}`);
          selectFile(fileItem);
        } else {
          logger.debug(`预览文件已经打开: ${fileItem.path}`);
        }
      } else {
        logger.warn(`无法找到预览文件: ${previewFileName}`);
      }
    }
  }, [loading, error, contents, currentPreviewItemRef, previewState, selectFile]);
  
  return (
    <Container component="main" sx={{ 
      flexGrow: 1, 
      py: 4,
      overflow: 'hidden'
    }}>
      <BreadcrumbNavigation
        breadcrumbSegments={breadcrumbSegments}
        handleBreadcrumbClick={handleBreadcrumbClick}
        breadcrumbsMaxItems={breadcrumbsMaxItems}
        isSmallScreen={isSmallScreen}
        breadcrumbsContainerRef={breadcrumbsContainerRef}
      />
      
      {loading ? (
        <FileListSkeleton 
          isSmallScreen={isSmallScreen} 
          itemCount={8}
        />
      ) : error ? (
        <ErrorDisplay
          errorMessage={error}
          onRetry={handleRetry}
          isSmallScreen={isSmallScreen}
        />
      ) : (
        <>
          <FileList 
            contents={contents}
            isSmallScreen={isSmallScreen}
            downloadingPath={downloadState.downloadingPath}
            downloadingFolderPath={downloadState.downloadingFolderPath}
            folderDownloadProgress={downloadState.folderDownloadProgress}
            handleItemClick={handleItemClick}
            handleDownloadClick={handleDownloadClick}
            handleFolderDownloadClick={handleFolderDownloadClick}
            handleCancelDownload={handleCancelDownload}
            currentPath={currentPath}
          />
          
          {/* README预览 - 底部展示 */}
          {readmeContent && (
            <Box 
              className="readme-container" 
              sx={{ 
                position: 'relative', 
                width: '100%', 
                mb: 4,
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 600, 
                  mb: 2,
                  display: 'flex',
                  alignItems: 'center',
                  color: 'text.primary'
                }}
              />
              
              <MarkdownPreview 
                readmeContent={readmeContent}
                loadingReadme={loadingReadme}
                isSmallScreen={isSmallScreen}
                isReadme={true}
                lazyLoad={true}
              />
            </Box>
          )}
          
          {/* PDF全屏预览 */}
          {previewState.previewingPdfItem && previewState.pdfPreviewUrl && (
            <FullScreenPreview onClose={closePreview} fitToPage={true}>
              <PDFPreview 
                pdfUrl={previewState.pdfPreviewUrl}
                fileName={previewState.previewingPdfItem.name}
                isSmallScreen={isSmallScreen}
                pdfContainerRef={pdfContainerRef}
                lastVisiblePagesRef={lastVisiblePagesRef}
                isPdfInitializingRef={isPdfInitializingRef}
                fitToPage={true}
                onClose={closePreview}
              />
            </FullScreenPreview>
          )}
          
          {/* 图像预览 */}
          {previewState.previewingImageItem && previewState.imagePreviewUrl && (
            <ImagePreview 
              imageUrl={previewState.imagePreviewUrl}
              fileName={previewState.previewingImageItem.name}
              isFullScreen={true}
              onClose={closePreview}
              lazyLoad={false}
            />
          )}
          
          {/* Office文档预览 */}
          {previewState.previewingOfficeItem && previewState.officePreviewUrl && previewState.officeFileType && (
            <FullScreenPreview onClose={closePreview}>
              <OfficePreview 
                fileUrl={previewState.officePreviewUrl}
                fileType={previewState.officeFileType}
                fileName={previewState.previewingOfficeItem.name}
                isFullScreen={previewState.isOfficeFullscreen}
                onClose={closePreview}
              />
            </FullScreenPreview>
          )}
        </>
      )}
    </Container>
  );
};

export default MainContent; 