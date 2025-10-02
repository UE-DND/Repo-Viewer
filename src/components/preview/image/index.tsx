import React, { useMemo } from 'react';
import { useTheme, useMediaQuery } from '@mui/material';
import FullScreenPreview from '@/components/file/FullScreenPreview';
import ImageThumbnail from './ImageThumbnail';
import ImagePreviewContent from './ImagePreviewContent';
import { useImagePreview } from './hooks/useImagePreview';
import type { ImagePreviewProps, ImageToolbarProps } from './types';

const NOOP: () => void = () => undefined;

const ImagePreview: React.FC<ImagePreviewProps> = ({
  imageUrl,
  fileName,
  onClose,
  isFullScreen = false,
  thumbnailMode = false,
  thumbnailSize = { width: '200px', height: '150px' },
  lazyLoad = true,
  className,
  style,
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const normalizedFileName = typeof fileName === 'string' && fileName.trim().length > 0 ? fileName : undefined;
  const displayFileName = normalizedFileName ?? '未知文件';

  const {
    loading,
    error,
    rotation,
    fullScreenMode,
    showPreview,
    scale,
    shouldLoad,
    imgRef,
    handleRotateLeft,
    handleRotateRight,
    toggleFullScreen,
    handleOpenPreview,
    handleClosePreview,
    handleImageLoad,
    handleImageError,
    handleTransformed,
    setError,
  } = useImagePreview({
    isFullScreen,
    thumbnailMode,
    lazyLoad,
    onClose,
  });

  // 计算关闭按钮边框半径
  const closeButtonBorderRadius = useMemo(() => {
    const radius = theme.shape.borderRadius;
    if (typeof radius === 'number') {
      return radius * 2;
    }
    if (typeof radius === 'string') {
      const trimmedRadius = radius.trim();
      if (trimmedRadius.length > 0) {
        return `calc(${trimmedRadius} * 2)`;
      }
    }
    return radius;
  }, [theme.shape.borderRadius]);

  // 工具栏Props
  const toolbarProps: ImageToolbarProps = {
    error,
    scale,
    isSmallScreen,
    fullScreenMode,
    zoomIn: NOOP,
    zoomOut: NOOP,
    resetTransform: NOOP,
    handleRotateLeft,
    handleRotateRight,
    toggleFullScreen,
    handleClosePreview,
    closeButtonBorderRadius,
  };

  // 预览内容组件的Props
  const previewContentProps = {
    imageUrl,
    fileName: displayFileName,
    rotation,
    loading,
    error,
    shouldLoad,
    isSmallScreen,
    imgRef,
    className,
    style,
    toolbarProps: { ...toolbarProps, setError },
    onLoad: handleImageLoad,
    onError: handleImageError,
    onTransformed: handleTransformed,
  };

  // 缩略图模式
  if (thumbnailMode && !showPreview) {
    return (
      <ImageThumbnail
        imageUrl={imageUrl}
        fileName={displayFileName}
        thumbnailSize={thumbnailSize}
        shouldLoad={shouldLoad}
        onOpenPreview={handleOpenPreview}
        onLoad={handleImageLoad}
        onError={handleImageError}
        imgRef={imgRef}
      />
    );
  }

  // 全屏模式
  if (fullScreenMode) {
    return (
      <FullScreenPreview
        onClose={handleClosePreview}
        backgroundColor={theme.palette.mode === 'dark' ? '#1a1a1a' : '#f5f5f5'}
        disablePadding={true}
        data-oid=":0opztf"
      >
        <ImagePreviewContent {...previewContentProps} />
      </FullScreenPreview>
    );
  }

  // 直接预览模式
  return <ImagePreviewContent {...previewContentProps} />;
};

export default ImagePreview;
