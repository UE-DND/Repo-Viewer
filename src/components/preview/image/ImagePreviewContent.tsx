import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  alpha,
  useTheme,
  GlobalStyles,
} from '@mui/material';
import { Replay as ReplayIcon } from '@mui/icons-material';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ImagePreviewSkeleton } from '@/components/ui/skeletons';
import ImageToolbar from './ImageToolbar';
import type { ImagePreviewContentProps } from './types';

/**
 * 图片预览内容组件
 * 
 * 显示图片预览主体内容，支持缩放、旋转和拖拽。
 */
const ImagePreviewContent: React.FC<ImagePreviewContentProps> = ({
  imageUrl,
  fileName,
  rotation,
  loading,
  error,
  shouldLoad,
  isSmallScreen,
  imgRef,
  className,
  style,
  toolbarProps,
  onLoad,
  onError,
  onTransformed,
}) => {
  const theme = useTheme();
  const normalizedFileName = typeof fileName === 'string' && fileName.trim().length > 0 ? fileName : undefined;
  const displayFileName = normalizedFileName ?? '未知文件';
  const altText = normalizedFileName ?? '图片预览';
  const hasError = error;
  const rotationTransform = `rotate(${String(rotation)}deg)`;
  const containerClassName = [className, 'image-preview-container']
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ');

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#f5f5f5',
      }}
      className={containerClassName.length > 0 ? containerClassName : 'image-preview-container'}
      style={style}
      data-oid="j_s1bp2"
    >
      {/* 文件名标题（仅在非小屏幕时显示） */}
      {!isSmallScreen && (
        <Typography
          variant="h6"
          sx={{
            py: 1.5,
            px: 2,
            textAlign: 'center',
            bgcolor:
              theme.palette.mode === 'dark'
                ? 'rgba(0,0,0,0.4)'
                : 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(8px)',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
          data-oid="5q_.d-t"
        >
          {displayFileName}
        </Typography>
      )}

      {/* 主要内容区域 */}
      <Box
        sx={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
        }}
        data-oid="znlgest"
      >
        {/* 全局样式 */}
        <GlobalStyles
          styles={{
            '.react-transform-wrapper': {
              width: '100%',
              height: '100%',
            },
            '.react-transform-component': {
              width: '100%',
              height: '100%',
            },
          }}
          data-oid="v02yxzy"
        />

        {/* 加载骨架屏 */}
        {loading && (
          <ImagePreviewSkeleton
            isSmallScreen={isSmallScreen}
            data-oid="84nup28"
          />
        )}

        {/* 错误状态显示 */}
        {hasError && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              p: 4,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 10,
            }}
            data-oid="w:-3iqj"
          >
            <Typography
              color="error"
              sx={{ mb: 2 }}
              data-oid="tex3zwr"
            >
              图像加载失败
            </Typography>
            <IconButton
              onClick={() => {
                if (typeof toolbarProps.setError === 'function') {
                  toolbarProps.setError(false);
                }
              }}
              color="primary"
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.2),
                },
              }}
            >
              <ReplayIcon data-oid=":znocig" />
            </IconButton>
          </Box>
        )}

        {/* 缩放平移组件 */}
        <TransformWrapper
          initialScale={1}
          minScale={0.1}
          maxScale={5}
          centerOnInit={true}
          wheel={{ disabled: hasError }}
          pinch={{ disabled: hasError }}
          panning={{ disabled: hasError }}
          onTransformed={(ref) => {
            onTransformed(ref.state.scale);
          }}
          data-oid="2kb8slc"
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              {/* 图片内容 */}
              <TransformComponent
                wrapperStyle={{
                  width: '100%',
                  height: '100%',
                  boxSizing: 'border-box',
                }}
                contentStyle={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                data-oid=":ze-2ev"
              >
                {!hasError && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      transform: rotationTransform,
                      transition: 'transform 0.3s ease',
                      transformOrigin: 'center center',
                      width: '100%',
                      height: '100%',
                      position: 'relative',
                    }}
                    data-oid="y6kwode"
                  >
                    <img
                      ref={imgRef}
                      src={shouldLoad ? imageUrl : ''}
                      alt={altText}
                      className={!loading ? 'loaded' : ''}
                      style={{
                        maxWidth: '90%',
                        maxHeight: '80%',
                        objectFit: 'contain',
                        transition: 'opacity 0.3s ease',
                      }}
                      onLoad={onLoad}
                      onError={onError}
                      data-oid="nyva-.q"
                    />
                  </div>
                )}
              </TransformComponent>

              {/* 工具栏 */}
              <ImageToolbar
                {...toolbarProps}
                zoomIn={zoomIn}
                zoomOut={zoomOut}
                resetTransform={resetTransform}
              />
            </>
          )}
        </TransformWrapper>
      </Box>
    </Box>
  );
};

export default ImagePreviewContent;
