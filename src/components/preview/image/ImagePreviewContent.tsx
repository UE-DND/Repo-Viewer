import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box,
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
import type { ReactZoomPanPinchContentRef } from 'react-zoom-pan-pinch';
import { ImagePreviewSkeleton } from '@/components/ui/skeletons';
import ImageToolbar from './ImageToolbar';
import type { ImagePreviewContentProps } from './types';

const DEFAULT_ASPECT_RATIO = 16 / 9;
const MIN_PREVIEW_HEIGHT = 320;
const VIEWPORT_RESERVE = { mobile: 220, desktop: 280 };
const MAX_ZOOM_SCALE = 8;

interface ViewportSize {
  width: number;
  height: number;
}

const useViewportSize = (): ViewportSize => {
  const getSize = (): ViewportSize => {
    if (typeof window === 'undefined') {
      return { width: 0, height: 0 };
    }
    return { width: window.innerWidth, height: window.innerHeight };
  };

  const [size, setSize] = useState<ViewportSize>(getSize);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleResize = (): void => {
      setSize(getSize());
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return size;
};

const calculateContainedSize = (
  width: number,
  height: number,
  aspectRatio: number,
): { width: number; height: number } => {
  if (width <= 0 || height <= 0 || !Number.isFinite(aspectRatio) || aspectRatio <= 0) {
    return { width: 0, height: 0 };
  }

  const constrainedWidth = Math.min(width, height * aspectRatio);
  const constrainedHeight = constrainedWidth / aspectRatio;

  return {
    width: constrainedWidth,
    height: constrainedHeight,
  };
};

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
  const { width: viewportWidth, height: viewportHeight } = useViewportSize();

  const horizontalMargin = isSmallScreen ? 24 : 64;

  const previewMaxWidth = useMemo(() => {
    if (viewportWidth === 0) {
      return isSmallScreen ? 360 : 960;
    }
    const available = viewportWidth - horizontalMargin * 2;
    const minWidth = isSmallScreen ? 320 : 640;
    return Math.max(minWidth, available);
  }, [viewportWidth, isSmallScreen, horizontalMargin]);

  const previewMaxHeight = useMemo(() => {
    const reserve = isSmallScreen ? VIEWPORT_RESERVE.mobile : VIEWPORT_RESERVE.desktop;
    if (viewportHeight === 0) {
      return 520;
    }
    return Math.max(MIN_PREVIEW_HEIGHT, viewportHeight - reserve);
  }, [viewportHeight, isSmallScreen]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(previewMaxWidth);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry !== undefined) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    const dominantSamples = ratioSamplesRef.current.filter(sample => getBucketKey(sample) === dominantBucket);
    const averageDominantRatio = dominantSamples.reduce((sum, sample) => sum + sample, 0) / (dominantSamples.length > 0 ? dominantSamples.length : 1);

  const [activeNavSide, setActiveNavSide] = useState<'left' | 'right' | null>(null);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [currentScale, setCurrentScale] = useState(1);
  const internalImgRef = useRef<HTMLImageElement | null>(null);
  const transformRef = useRef<ReactZoomPanPinchContentRef | null>(null);

  const [aspectRatio, setAspectRatio] = useState<number>(initialAspectRatio ?? DEFAULT_ASPECT_RATIO);

    const src = img.currentSrc !== '' ? img.currentSrc : img.src;
    if (typeof src !== 'string' || src === '') {
      return;
    }
    setAspectRatio(ratio);
    onAspectRatioChange?.(ratio);
  }, [onAspectRatioChange]);

  const handleImageMetrics = useCallback((img: HTMLImageElement | null): void => {
    if (img === null) {
      return;
    }
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      updateAspectRatio(img.naturalWidth / img.naturalHeight);
    }
  }, [updateAspectRatio]);

  useEffect(() => {
    setCurrentScale(toolbarProps.scale);
  }, [toolbarProps.scale]);

  const availableWidth = containerWidth > 0 ? containerWidth : previewMaxWidth;
  const availableHeight = Math.max(previewMaxHeight, 200);

  const { width: contentWidth, height: contentHeight } = useMemo(() => {
    return calculateContainedSize(availableWidth, availableHeight, aspectRatio);
  }, [availableWidth, availableHeight, aspectRatio]);

  const targetWidth = contentWidth > 0 ? contentWidth : availableWidth;
  const targetHeight = contentHeight > 0 ? contentHeight : availableHeight;
  const displayHeight = useMemo(() => {
    const minHeight = Math.max(targetHeight, MIN_PREVIEW_HEIGHT);
    return Math.min(previewMaxHeight, minHeight);
  }, [targetHeight, previewMaxHeight]);
  const toolbarContainerWidth = useMemo(() => {
    const minWidth = isSmallScreen ? 280 : 360;
    const width = containerWidth > 0 ? containerWidth : previewMaxWidth;
    return Math.max(width, minWidth);
  }, [isSmallScreen, containerWidth, previewMaxWidth]);

  const rotationTransform = `rotate(${String(rotation)}deg)`;
  const altText = typeof fileName === 'string' && fileName.trim().length > 0 ? fileName : '图片预览';

  const applyCenteredTransform = useCallback((targetScale: number, animationTime = 200): boolean => {
    const instance = transformRef.current;
    if (instance === null) {
      return false;
    }

    const wrapperWidth = containerWidth > 0 ? containerWidth : previewMaxWidth;
    const wrapperHeight = displayHeight;

    if (
      !Number.isFinite(wrapperWidth)
      || !Number.isFinite(wrapperHeight)
      || wrapperWidth <= 0
      || wrapperHeight <= 0
      || targetWidth <= 0
      || targetHeight <= 0
    ) {
      return false;
    }

    const effectiveWidth = targetWidth * targetScale;
    const effectiveHeight = targetHeight * targetScale;

    const offsetX = (wrapperWidth - effectiveWidth) / 2;
    const offsetY = (wrapperHeight - effectiveHeight) / 2;

    instance.setTransform(offsetX, offsetY, targetScale, animationTime);
    return true;
  }, [containerWidth, previewMaxWidth, displayHeight, targetWidth, targetHeight]);

  useEffect(() => {
    if (currentScale !== 1) {
      return;
    }
    applyCenteredTransform(1, 0);
  }, [applyCenteredTransform, imageUrl, rotation, containerWidth, displayHeight, targetWidth, targetHeight, currentScale]);

  const fitWidthScale = useMemo(() => {
    const baseWidth = targetWidth;
    if (baseWidth <= 0) {
      return 1;
    }
    const wrapperWidth = containerWidth > 0 ? containerWidth : previewMaxWidth;
    if (!Number.isFinite(wrapperWidth) || wrapperWidth <= 0) {
      return 1;
    }
    return wrapperWidth / baseWidth;
  }, [targetWidth, containerWidth, previewMaxWidth]);

  const handleContainerMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>): void => {
    if (isSmallScreen || error || loading) {
      setActiveNavSide(null);
      return;
    }

    const container = containerRef.current;
    if (container === null) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const threshold = Math.min(160, rect.width * 0.18);

    if (hasPrevious && x < threshold) {
      setActiveNavSide('left');
      return;
    }

    if (hasNext && x > rect.width - threshold) {
      setActiveNavSide('right');
      return;
    }

    setActiveNavSide(null);
  }, [isSmallScreen, error, loading, hasPrevious, hasNext]);

  const handleContainerMouseLeave = useCallback((): void => {
    setActiveNavSide(null);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (loading || error) {
        return;
      }

      if (event.key === 'ArrowLeft' && hasPrevious && onPrevious !== undefined) {
        event.preventDefault();
        onPrevious();
      } else if (event.key === 'ArrowRight' && hasNext && onNext !== undefined) {
        event.preventDefault();
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

  const handleTouchStart = (event: React.TouchEvent): void => {
    if (!isSmallScreen || currentScale !== 1 || error || loading) {
      return;
    }

    const touch = event.touches[0];
    if (touch !== undefined) {
      setTouchStart({
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      });
    }
  };

  const handleTouchMove = (event: React.TouchEvent): void => {
    if (touchStart === null || !isSmallScreen || currentScale !== 1 || error || loading) {
      return;
    }

    const touch = event.touches[0];
    if (touch === undefined) {
      return;
    }

    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      setIsDragging(true);
      let offset = deltaX;
      if (!hasPrevious && deltaX > 0) {
        offset = deltaX * 0.3;
      }
      if (!hasNext && deltaX < 0) {
        offset = deltaX * 0.3;
      }
      setDragOffset(offset);
    }
  };

  const handleTouchEnd = (): void => {
    if (touchStart === null || !isSmallScreen || currentScale !== 1 || error || loading) {
      setTouchStart(null);
      setDragOffset(0);
      setIsDragging(false);
      return;
    }

    const elapsed = Date.now() - touchStart.time;
    const velocity = Math.abs(dragOffset) / Math.max(elapsed, 1);
    const exceedDistance = Math.abs(dragOffset) > 80;
    const exceedVelocity = velocity > 0.4 && Math.abs(dragOffset) > 30;

    if ((exceedDistance || exceedVelocity) && dragOffset > 0 && hasPrevious && onPrevious !== undefined) {
      onPrevious();
    } else if ((exceedDistance || exceedVelocity) && dragOffset < 0 && hasNext && onNext !== undefined) {
      onNext();
    }

    setTouchStart(null);
    setDragOffset(0);
    setIsDragging(false);
  };

  const handleImageRef = useCallback((img: HTMLImageElement | null): void => {
    imgRef.current = img;
    internalImgRef.current = img;
    if (img !== null && img.complete && img.naturalHeight !== 0) {
      handleImageMetrics(img);
      onLoad();
    }
  }, [imgRef, handleImageMetrics, onLoad]);

  return (
    <Box
      className={className}
      style={style}
      sx={{
        width: '100%',
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
      data-oid="image-preview-root"
    >
      <Box
        ref={containerRef}
        onMouseMove={handleContainerMouseMove}
        onMouseLeave={handleContainerMouseLeave}
        sx={{
          width: '100%',
          maxWidth: `${previewMaxWidth.toString()}px`,
          minHeight: `${displayHeight.toString()}px`,
          position: 'relative',
          overflow: 'visible',
          borderRadius: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: { xs: 1.5, md: 2 },
          bgcolor: 'transparent',
          mx: 'auto',
        }}
        data-oid="image-preview-stage"
      >
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
        />

        {loading && (
          <ImagePreviewSkeleton
            isSmallScreen={isSmallScreen}
            aspectRatio={aspectRatio}
            targetWidth={targetWidth}
            targetHeight={targetHeight}
            data-oid="image-skeleton"
          />
        )}

        {error && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              zIndex: 5,
              bgcolor: alpha(theme.palette.background.default, 0.72),
            }}
            data-oid="image-error-overlay"
          >
            <IconButton
              size="large"
              color="primary"
              onClick={() => {
                toolbarProps.setError?.(false);
              }}
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.2),
                },
              }}
            >
              <ReplayIcon />
            </IconButton>
          </Box>
        )}

        <Box
          sx={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
        <TransformWrapper
          ref={(instance) => {
            transformRef.current = instance;
          }}
          initialScale={1}
          minScale={0.1}
          maxScale={MAX_ZOOM_SCALE}
          wheel={{ disabled: error }}
          pinch={{ disabled: error }}
          panning={{ disabled: error || (isSmallScreen && currentScale === 1) }}
          centerOnInit={true}
          onTransformed={(ref, state) => {
            transformRef.current = ref;
            onTransformed(state.scale);
          }}
          data-oid="image-transform-wrapper"
        >
          {({ zoomIn, zoomOut, resetTransform }) => {
            const handleApplyScale = (scale: number): boolean => {
              const boundedScale = Math.min(Math.max(scale, 0.1), MAX_ZOOM_SCALE);
              return applyCenteredTransform(boundedScale);
            };

            const handleZoomIn = (): void => {
              const widthScale = Math.min(Math.max(fitWidthScale, 1), MAX_ZOOM_SCALE);
              if (widthScale > currentScale + 0.05 && handleApplyScale(widthScale)) {
                return;
              }
              zoomIn();
            };

            const handleZoomOut = (): void => {
              zoomOut();
            };

            const handleReset = (): void => {
              if (handleApplyScale(1)) {
                return;
              }
              resetTransform();
            };

            return (
              <Box
                sx={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: { xs: 1.5, md: 2 },
                }}
              >
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: `${previewMaxWidth.toString()}px`,
                  minHeight: `${displayHeight.toString()}px`,
                  maxHeight: `${previewMaxHeight.toString()}px`,
                  margin: '0 auto',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  mx: 'auto',
                }}
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
                      style={{ display: 'none' }}
                      onLoad={(event) => {
                        handleImageMetrics(event.currentTarget);
                        onLoad();
                      }}
                      onError={onError}
                      data-oid="image-preload"
                    />
                  )}
                </TransformComponent>

                {isSmallScreen && isDragging && (
                  <>
                    {hasPrevious && dragOffset > 30 && (
                      <Box
                        sx={{
                          position: 'absolute',
                          left: 16,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          opacity: Math.min(dragOffset / 100, 0.8),
                          transition: 'opacity 0.2s ease',
                          pointerEvents: 'none',
                        }}
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
                          <ChevronLeftIcon sx={{ fontSize: '2rem', color: '#fff' }} />
                        </Box>
                      </Box>
                    )}

                    {hasNext && dragOffset < -30 && (
                      <Box
                        sx={{
                          position: 'absolute',
                          right: 16,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          opacity: Math.min(Math.abs(dragOffset) / 100, 0.8),
                          transition: 'opacity 0.2s ease',
                          pointerEvents: 'none',
                        }}
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
                          <ChevronRightIcon sx={{ fontSize: '2rem', color: '#fff' }} />
                        </Box>
                      </Box>
                    )}
                  </>
                )}

                {!isSmallScreen && hasPrevious && onPrevious !== undefined && (
                  <Box
                    sx={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      px: 2,
                      opacity: activeNavSide === 'left' ? 1 : 0,
                      pointerEvents: activeNavSide === 'left' ? 'auto' : 'none',
                      transition: 'opacity 0.3s ease',
                    }}
                  >
                    <IconButton
                      onClick={onPrevious}
                      sx={{
                        bgcolor: alpha(theme.palette.background.paper, 0.9),
                        boxShadow: theme.shadows[4],
                        '&:hover': {
                          bgcolor: alpha(theme.palette.background.paper, 0.98),
                        },
                      }}
                    >
                      <ChevronLeftIcon sx={{ fontSize: '2rem' }} />
                    </IconButton>
                  </Box>
                )}

                {!isSmallScreen && hasNext && onNext !== undefined && (
                  <Box
                    sx={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      px: 2,
                      opacity: activeNavSide === 'right' ? 1 : 0,
                      pointerEvents: activeNavSide === 'right' ? 'auto' : 'none',
                      transition: 'opacity 0.3s ease',
                    }}
                  >
                    <IconButton
                      onClick={onNext}
                      sx={{
                        bgcolor: alpha(theme.palette.background.paper, 0.9),
                        boxShadow: theme.shadows[4],
                        '&:hover': {
                          bgcolor: alpha(theme.palette.background.paper, 0.98),
                        },
                      }}
                    >
                      <ChevronRightIcon sx={{ fontSize: '2rem' }} />
                    </IconButton>
                  </Box>
                )}
              </Box>

              <Box
                sx={{
                  width: 'auto',
                  maxWidth: `${toolbarContainerWidth.toString()}px`,
                  mx: 'auto',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <ImageToolbar
                  {...toolbarProps}
                  zoomIn={handleZoomIn}
                  zoomOut={handleZoomOut}
                  resetTransform={handleReset}
                  variant={toolbarProps.fullScreenMode ? 'floating' : 'inline'}
                />
              </Box>
              </Box>
            );
          }}
        </TransformWrapper>
      </Box>
      </Box>

    </Box>
  );
};

export default ImagePreviewContent;
