import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  IconButton,
  alpha,
  useTheme,
  GlobalStyles,
} from '@mui/material';
import {
  Replay as ReplayIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ImagePreviewSkeleton } from '@/components/ui/skeletons';
import ImageToolbar from './ImageToolbar';
import type { ImagePreviewContentProps } from './types';

const DEFAULT_ASPECT_RATIO = 16 / 9;
const MAX_RATIO_HISTORY = 6;
const ROUND_RATIO_PRECISION = 2;

const getBucketKey = (value: number): number => Number(value.toFixed(ROUND_RATIO_PRECISION));

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
  hasPrevious = false,
  hasNext = false,
  onPrevious,
  onNext,
  initialAspectRatio,
  onAspectRatioChange,
}) => {
  const theme = useTheme();
  // 导航按钮显示状态：'left' | 'right' | null（互斥显示）
  const [activeNavSide, setActiveNavSide] = useState<'left' | 'right' | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const internalImgRef = React.useRef<HTMLImageElement | null>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const resolvedInitialAspectRatio = useMemo(() => {
    if (typeof initialAspectRatio === 'number' && Number.isFinite(initialAspectRatio) && initialAspectRatio > 0) {
      return initialAspectRatio;
    }
    return DEFAULT_ASPECT_RATIO;
  }, [initialAspectRatio]);
  const ratioSamplesRef = React.useRef<number[]>([resolvedInitialAspectRatio]);
  const ratioBucketsRef = React.useRef<Map<number, number>>(
    new Map([[getBucketKey(resolvedInitialAspectRatio), 1]])
  );
  const lastProcessedImageRef = React.useRef<string | null>(null);
  const previousNotifiedRatioRef = React.useRef<number>(resolvedInitialAspectRatio);
  const [dominantAspectRatio, setDominantAspectRatio] = useState<number>(resolvedInitialAspectRatio);

  const addAspectRatioSample = useCallback((ratio: number): void => {
    if (!Number.isFinite(ratio) || ratio <= 0) {
      return;
    }

    const normalized = Number(ratio.toFixed(4));
    const bucketKey = getBucketKey(normalized);

    const samples = [...ratioSamplesRef.current, normalized];
    if (samples.length > MAX_RATIO_HISTORY) {
      const removed = samples.shift();
      if (removed !== undefined) {
        const removedKey = getBucketKey(removed);
        const currentCount = ratioBucketsRef.current.get(removedKey);
        if (currentCount !== undefined) {
          if (currentCount <= 1) {
            ratioBucketsRef.current.delete(removedKey);
          } else {
            ratioBucketsRef.current.set(removedKey, currentCount - 1);
          }
        }
      }
    }
    ratioSamplesRef.current = samples;

    const existingCount = ratioBucketsRef.current.get(bucketKey) ?? 0;
    ratioBucketsRef.current.set(bucketKey, existingCount + 1);

    let dominantBucket = bucketKey;
    let dominantCount = ratioBucketsRef.current.get(bucketKey) ?? 1;

    ratioBucketsRef.current.forEach((count, key) => {
      if (count > dominantCount) {
        dominantBucket = key;
        dominantCount = count;
      } else if (count === dominantCount && Math.abs(key - bucketKey) < Math.abs(dominantBucket - bucketKey)) {
        dominantBucket = key;
        dominantCount = count;
      }
    });

    const dominantSamples = ratioSamplesRef.current.filter(sample => getBucketKey(sample) === dominantBucket);
    const averageDominantRatio = dominantSamples.reduce((sum, sample) => sum + sample, 0) / (dominantSamples.length > 0 ? dominantSamples.length : 1);

    if (Number.isFinite(averageDominantRatio) && averageDominantRatio > 0) {
      setDominantAspectRatio(prev => (Math.abs(prev - averageDominantRatio) < 0.0001 ? prev : averageDominantRatio));
    }
  }, []);

  const processAspectRatioFromImage = useCallback((img: HTMLImageElement | null): void => {
    if (img === null) {
      return;
    }

    const src = img.currentSrc !== '' ? img.currentSrc : img.src;
    if (typeof src !== 'string' || src === '') {
      return;
    }

    if (lastProcessedImageRef.current === src && img.dataset['rvAspectProcessed'] === 'true') {
      return;
    }

    if (img.naturalWidth <= 0 || img.naturalHeight <= 0) {
      return;
    }

    const ratio = img.naturalWidth / img.naturalHeight;
    addAspectRatioSample(ratio);
    lastProcessedImageRef.current = src;
    img.dataset['rvAspectProcessed'] = 'true';
  }, [addAspectRatioSample]);

  useEffect(() => {
    lastProcessedImageRef.current = null;
    const currentImage = internalImgRef.current;
    if (currentImage !== null) {
      delete currentImage.dataset['rvAspectProcessed'];
    }
  }, [imageUrl]);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return undefined;
    }

    const updateSize = (): void => {
      const rect = container.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    };

    updateSize();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry !== undefined) {
          const { width, height } = entry.contentRect;
          setContainerSize({ width, height });
        }
      });
      observer.observe(container);
      return () => {
        observer.disconnect();
      };
    }

    window.addEventListener('resize', updateSize);
    return () => {
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // 移动端拖动切换状态
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [currentScale, setCurrentScale] = useState(1);

  const normalizedFileName = typeof fileName === 'string' && fileName.trim().length > 0 ? fileName : undefined;
  const displayFileName = normalizedFileName ?? '未知文件';
  const altText = normalizedFileName ?? '图片预览';
  const hasError = error;

  // 图片切换时重置移动端拖动状态
  useEffect(() => {
    // 只重置移动端相关状态，保留桌面端导航按钮的悬停状态
    setDragOffset(0);
    setIsDragging(false);
  }, [imageUrl]);

  // 桌面端导航按钮的鼠标位置追踪
  const handleContainerMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>): void => {
    if (isSmallScreen || hasError || loading) {
      setActiveNavSide(null);
      return;
    }

    const container = containerRef.current;
    if (container === null) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const threshold = 150; // 导航区域宽度

    // 左侧区域（有上一张时）
    if (hasPrevious && x < threshold) {
      setActiveNavSide('left');
    }
    // 右侧区域（有下一张时）
    else if (hasNext && x > width - threshold) {
      setActiveNavSide('right');
    }
    // 中间区域
    else {
      setActiveNavSide(null);
    }
  }, [isSmallScreen, hasError, loading, hasPrevious, hasNext]);

  // 鼠标离开容器
  const handleContainerMouseLeave = useCallback((): void => {
    setActiveNavSide(null);
  }, []);

  // 键盘导航支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // 如果正在加载或有错误，不响应键盘事件
      if (loading || hasError) {
        return;
      }

      if (e.key === 'ArrowLeft' && hasPrevious && onPrevious !== undefined) {
        e.preventDefault();
        onPrevious();
      } else if (e.key === 'ArrowRight' && hasNext && onNext !== undefined) {
        e.preventDefault();
        onNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [loading, hasError, hasPrevious, hasNext, onPrevious, onNext]);
  const rotationTransform = `rotate(${String(rotation)}deg)`;
  const containerClassName = [className, 'image-preview-container']
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ');

  const stageMetrics = useMemo(() => {
    if (containerSize.width <= 0 || containerSize.height <= 0) {
      return null;
    }

    const widthPadding = isSmallScreen ? 0.94 : 0.9;
    const heightPadding = isSmallScreen ? 0.85 : 0.8;

    const availableWidth = containerSize.width * widthPadding;
    const availableHeight = containerSize.height * heightPadding;

    if (availableWidth <= 0 || availableHeight <= 0) {
      return null;
    }

    const aspectRatio = dominantAspectRatio > 0 ? dominantAspectRatio : DEFAULT_ASPECT_RATIO;
    const width = Math.min(availableWidth, availableHeight * aspectRatio);
    const height = width / aspectRatio;

    return {
      width,
      height,
      availableWidth,
      availableHeight,
    };
  }, [containerSize.height, containerSize.width, dominantAspectRatio, isSmallScreen]);

  const stageWidth = stageMetrics?.width ?? null;
  const stageHeight = stageMetrics?.height ?? null;
  const stageMaxWidth = stageMetrics?.availableWidth ?? null;
  const stageMaxHeight = stageMetrics?.availableHeight ?? null;

  useEffect(() => {
    if (typeof onAspectRatioChange === 'function' && Math.abs(previousNotifiedRatioRef.current - dominantAspectRatio) >= 0.0001) {
      previousNotifiedRatioRef.current = dominantAspectRatio;
      onAspectRatioChange(dominantAspectRatio);
    }
  }, [dominantAspectRatio, onAspectRatioChange]);

  // 更新当前缩放比例
  useEffect(() => {
    setCurrentScale(toolbarProps.scale);
  }, [toolbarProps.scale]);

  // 图片引用回调，用于检测缓存
  const handleImageRef = useCallback((img: HTMLImageElement | null): void => {
    if (typeof imgRef === 'object' && 'current' in imgRef) {
      (imgRef as React.RefObject<HTMLImageElement | null> & { current: HTMLImageElement | null }).current = img;
    }

    internalImgRef.current = img;

    if (img !== null) {
      delete img.dataset['rvAspectProcessed'];
    }

    if (img !== null && img.complete && img.naturalHeight !== 0) {
      processAspectRatioFromImage(img);
      onLoad();
    }
  }, [imgRef, onLoad, processAspectRatioFromImage]);

  // 移动端触摸开始
  const handleTouchStart = (e: React.TouchEvent): void => {
    // 只在移动端、未放大、且未加载错误时启用
    if (!isSmallScreen || currentScale !== 1 || hasError || loading) {
      return;
    }

    const touch = e.touches[0];
    if (touch !== undefined) {
      setTouchStart({
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      });
    }
  };

  // 移动端触摸移动
  const handleTouchMove = (e: React.TouchEvent): void => {
    if (touchStart === null || !isSmallScreen || currentScale !== 1 || hasError || loading) {
      return;
    }

    const touch = e.touches[0];
    if (touch === undefined) {
      return;
    }

    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;

    // 判断是否为水平拖动（横向移动大于纵向移动）
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      setIsDragging(true);

      // 限制拖动范围
      let offset = deltaX;

      // 如果没有上一张，限制向右拖动
      if (!hasPrevious && deltaX > 0) {
        offset = deltaX * 0.3;
      }

      // 如果没有下一张，限制向左拖动
      if (!hasNext && deltaX < 0) {
        offset = deltaX * 0.3;
      }

      setDragOffset(offset);
    }
  };

  // 移动端触摸结束
  const handleTouchEnd = (): void => {
    if (touchStart === null || !isSmallScreen || currentScale !== 1 || hasError || loading) {
      setTouchStart(null);
      setDragOffset(0);
      setIsDragging(false);
      return;
    }

    const threshold = 80; // 切换阈值（像素）
    const duration = Date.now() - touchStart.time;
    const velocity = Math.abs(dragOffset) / duration; // 速度（像素/毫秒）

    // 快速滑动或者超过阈值
    if ((Math.abs(dragOffset) > threshold) || (velocity > 0.5 && Math.abs(dragOffset) > 30)) {
      if (dragOffset > 0 && hasPrevious && onPrevious !== undefined) {
        // 向右拖动，上一张
        onPrevious();
      } else if (dragOffset < 0 && hasNext && onNext !== undefined) {
        // 向左拖动，下一张
        onNext();
      }
    }

    // 重置状态
    setTouchStart(null);
    setDragOffset(0);
    setIsDragging(false);
  };

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
        '--rv-image-preview-aspect-ratio': dominantAspectRatio.toFixed(3),
        ...(stageWidth !== null
          ? { '--rv-image-preview-stage-width': `${stageWidth.toString()}px` }
          : {}),
        ...(stageHeight !== null
          ? { '--rv-image-preview-stage-height': `${stageHeight.toString()}px` }
          : {}),
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
        ref={containerRef}
        onMouseMove={handleContainerMouseMove}
        onMouseLeave={handleContainerMouseLeave}
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
            aspectRatio={dominantAspectRatio}
            data-oid="84nup28"
            {...(stageWidth !== null ? { targetWidth: stageWidth } : {})}
            {...(stageHeight !== null ? { targetHeight: stageHeight } : {})}
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
          panning={{ disabled: hasError || (isSmallScreen && currentScale === 1) }}
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
                  transform: isSmallScreen && isDragging ? `translateX(${String(dragOffset)}px)` : undefined,
                  transition: isDragging ? 'none' : 'transform 0.3s ease',
                }}
                wrapperProps={{
                  onTouchStart: handleTouchStart,
                  onTouchMove: handleTouchMove,
                  onTouchEnd: handleTouchEnd,
                  onTouchCancel: handleTouchEnd,
                }}
                data-oid=":ze-2ev"
              >
                {!hasError && !loading && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      transform: rotationTransform,
                      transition: 'transform 0.3s ease, width 0.35s ease, height 0.35s ease',
                      transformOrigin: 'center center',
                      width: stageWidth !== null ? `${stageWidth.toString()}px` : 'auto',
                      height: stageHeight !== null ? `${stageHeight.toString()}px` : 'auto',
                      maxWidth: stageMaxWidth !== null ? `${stageMaxWidth.toString()}px` : '100%',
                      maxHeight: stageMaxHeight !== null ? `${stageMaxHeight.toString()}px` : '100%',
                      position: 'relative',
                    }}
                    data-oid="y6kwode"
                  >
                    <img
                      ref={handleImageRef}
                      src={shouldLoad ? imageUrl : ''}
                      alt={altText}
                      className="loaded"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        opacity: 1,
                        transition: 'opacity 0.3s ease',
                      }}
                      onLoad={(event) => {
                        processAspectRatioFromImage(event.currentTarget);
                        onLoad();
                      }}
                      onError={onError}
                      data-oid="nyva-.q"
                    />
                  </div>
                )}
                {!hasError && loading && (
                  <img
                    ref={handleImageRef}
                    src={shouldLoad ? imageUrl : ''}
                    alt={altText}
                    style={{
                      display: 'none',
                    }}
                    onLoad={(event) => {
                      processAspectRatioFromImage(event.currentTarget);
                      onLoad();
                    }}
                    onError={onError}
                    data-oid="nyva-loading"
                  />
                )}
              </TransformComponent>

              {/* 工具栏 */}
              <ImageToolbar
                {...toolbarProps}
                zoomIn={zoomIn}
                zoomOut={zoomOut}
                resetTransform={resetTransform}
              />

              {/* 移动端拖动视觉反馈 */}
              {isSmallScreen && isDragging && (
                <>
                  {/* 左侧提示（上一张） */}
                  {hasPrevious && dragOffset > 30 && (
                    <Box
                      sx={{
                        position: 'absolute',
                        left: 16,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: 60,
                        opacity: Math.min(dragOffset / 100, 0.8),
                        transition: 'opacity 0.2s ease',
                        pointerEvents: 'none',
                      }}
                      data-oid="drag-left-indicator"
                    >
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          bgcolor: alpha(theme.palette.primary.main, 0.9),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.3)}`,
                        }}
                      >
                        <ChevronLeftIcon
                          sx={{
                            fontSize: '2rem',
                            color: '#fff',
                          }}
                        />
                      </Box>
                    </Box>
                  )}

                  {/* 右侧提示（下一张） */}
                  {hasNext && dragOffset < -30 && (
                    <Box
                      sx={{
                        position: 'absolute',
                        right: 16,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: 60,
                        opacity: Math.min(Math.abs(dragOffset) / 100, 0.8),
                        transition: 'opacity 0.2s ease',
                        pointerEvents: 'none',
                      }}
                      data-oid="drag-right-indicator"
                    >
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          bgcolor: alpha(theme.palette.primary.main, 0.9),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.3)}`,
                        }}
                      >
                        <ChevronRightIcon
                          sx={{
                            fontSize: '2rem',
                            color: '#fff',
                          }}
                        />
                      </Box>
                    </Box>
                  )}
                </>
              )}

              {/* 左侧导航按钮（仅桌面端且有上一张图片时显示） */}
              {!isSmallScreen && hasPrevious && onPrevious !== undefined && (
                <Box
                  sx={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: '72px', // 避开底部工具栏
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    paddingLeft: 2,
                    zIndex: 50,
                    cursor: activeNavSide === 'left' ? 'pointer' : 'default',
                    pointerEvents: activeNavSide === 'left' ? 'auto' : 'none',
                  }}
                  data-oid="prev-nav-area"
                >
                  <IconButton
                    onClick={onPrevious}
                    sx={{
                      bgcolor: alpha(theme.palette.background.paper, activeNavSide === 'left' ? 0.95 : 0),
                      backdropFilter: activeNavSide === 'left' ? 'blur(10px)' : 'none',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.background.paper, 0.98),
                      },
                      width: '56px',
                      height: '56px',
                      opacity: activeNavSide === 'left' ? 1 : 0,
                      transform: activeNavSide === 'left' ? 'translateX(0)' : 'translateX(-20px)',
                      transition: 'all 0.3s ease',
                      boxShadow: activeNavSide === 'left' ? `0 4px 12px ${alpha(theme.palette.common.black, 0.15)}` : 'none',
                      pointerEvents: activeNavSide === 'left' ? 'auto' : 'none',
                    }}
                    data-oid="prev-nav-btn"
                  >
                    <ChevronLeftIcon
                      sx={{
                        fontSize: '2rem',
                        color: theme.palette.text.primary,
                      }}
                      data-oid="prev-icon"
                    />
                  </IconButton>
                </Box>
              )}

              {/* 右侧导航按钮（仅桌面端且有下一张图片时显示） */}
              {!isSmallScreen && hasNext && onNext !== undefined && (
                <Box
                  sx={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: '72px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    paddingRight: 2,
                    zIndex: 50,
                    cursor: activeNavSide === 'right' ? 'pointer' : 'default',
                    pointerEvents: activeNavSide === 'right' ? 'auto' : 'none',
                  }}
                  data-oid="next-nav-area"
                >
                  <IconButton
                    onClick={onNext}
                    sx={{
                      bgcolor: alpha(theme.palette.background.paper, activeNavSide === 'right' ? 0.95 : 0),
                      backdropFilter: activeNavSide === 'right' ? 'blur(10px)' : 'none',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.background.paper, 0.98),
                      },
                      width: '56px',
                      height: '56px',
                      opacity: activeNavSide === 'right' ? 1 : 0,
                      transform: activeNavSide === 'right' ? 'translateX(0)' : 'translateX(20px)',
                      transition: 'all 0.3s ease',
                      boxShadow: activeNavSide === 'right' ? `0 4px 12px ${alpha(theme.palette.common.black, 0.15)}` : 'none',
                      pointerEvents: activeNavSide === 'right' ? 'auto' : 'none',
                    }}
                    data-oid="next-nav-btn"
                  >
                    <ChevronRightIcon
                      sx={{
                        fontSize: '2rem',
                        color: theme.palette.text.primary,
                      }}
                      data-oid="next-icon"
                    />
                  </IconButton>
                </Box>
              )}
            </>
          )}
        </TransformWrapper>
      </Box>
    </Box>
  );
};

export default ImagePreviewContent;
