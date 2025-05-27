import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Box, CircularProgress, 
  IconButton, Typography, alpha, useTheme, useMediaQuery,
  Button,
  GlobalStyles
} from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Replay as ReplayIcon,
  RotateLeft as RotateLeftIcon,
  RotateRight as RotateRightIcon,
  Fullscreen as FullscreenIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { 
  TransformWrapper, 
  TransformComponent
} from 'react-zoom-pan-pinch';
import FullScreenPreview from '../file/FullScreenPreview';
import { ImagePreviewSkeleton } from '../common/SkeletonComponents';

interface ImagePreviewProps {
  /**
   * 图片URL地址
   */
  imageUrl: string;
  
  /**
   * 图片文件名
   */
  fileName: string;
  
  /**
   * 关闭预览的回调函数
   */
  onClose?: () => void;
  
  /**
   * 是否以全屏模式显示
   * @default false
   */
  isFullScreen?: boolean;
  
  /**
   * 是否默认以缩略图模式显示，点击后打开预览
   * @default false - 直接显示预览组件
   */
  thumbnailMode?: boolean;
  
  /**
   * 缩略图尺寸，仅在thumbnailMode=true时有效
   */
  thumbnailSize?: {
    width: string | number;
    height: string | number;
  };
  
  /**
   * 是否启用懒加载
   * @default true
   */
  lazyLoad?: boolean;
  
  /**
   * 自定义类名
   */
  className?: string;
  
  /**
   * 自定义样式
   */
  style?: React.CSSProperties;
}

/**
 * 统一的图片预览组件
 * 支持缩放、平移、旋转等操作，可选缩略图模式
 */
const ImagePreview: React.FC<ImagePreviewProps> = ({
  imageUrl,
  fileName,
  onClose,
  isFullScreen = false,
  thumbnailMode = false,
  thumbnailSize = { width: '200px', height: '150px' },
  lazyLoad = true,
  className,
  style
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);
  const [fullScreenMode, setFullScreenMode] = useState<boolean>(isFullScreen);
  const [showPreview, setShowPreview] = useState<boolean>(!thumbnailMode);
  const [scale, setScale] = useState<number>(1);
  const [shouldLoad, setShouldLoad] = useState<boolean>(!lazyLoad);
  
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 设置IntersectionObserver监听图片元素
  useEffect(() => {
    if (!lazyLoad) return;
    
    // 创建观察器实例
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setShouldLoad(true);
        // 一旦图片开始加载，就停止观察
        if (observerRef.current && imgRef.current) {
          observerRef.current.unobserve(imgRef.current);
        }
      }
    }, {
      root: null,
      rootMargin: '100px', // 提前100px开始加载
      threshold: 0.1
    });
    
    // 开始观察
    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [lazyLoad]);

  const handleReset = useCallback((resetFunc: () => void) => {
    resetFunc();
    setRotation(0);
    setError(false);
    setLoading(true);
    setScale(1);
  }, []);

  const handleRotateLeft = useCallback(() => {
    setRotation((prev) => prev - 90);
  }, []);

  const handleRotateRight = useCallback(() => {
    setRotation((prev) => prev + 90);
  }, []);

  const toggleFullScreen = useCallback(() => {
    setFullScreenMode((prev) => !prev);
  }, []);

  const handleCloseFullScreen = useCallback(() => {
    setFullScreenMode(false);
    if (onClose) onClose();
  }, [onClose]);

  const handleOpenPreview = useCallback(() => {
    setShowPreview(true);
  }, []);

  const handleClosePreview = useCallback(() => {
    if (thumbnailMode) {
      setShowPreview(false);
    }
    
    if (fullScreenMode) {
      setFullScreenMode(false);
    }
    
    if (onClose) onClose();
  }, [thumbnailMode, fullScreenMode, onClose]);

  const renderPreviewContent = useCallback(() => (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#f5f5f5'
      }}
      className={`${className} image-preview-container`}
      style={style}
    >
      {!isSmallScreen && (
        <Typography 
          variant="h6" 
          sx={{ 
            py: 1.5, 
            px: 2, 
            textAlign: 'center',
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(8px)',
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}
        >
          {fileName}
        </Typography>
      )}
      
      <Box
        sx={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative'
        }}
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
            }
          }}
        />
        {loading && (
          <ImagePreviewSkeleton isSmallScreen={isSmallScreen} />
        )}
        
        {error && (
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
              zIndex: 10
            }}
          >
            <Typography color="error" variant="body1" sx={{ mb: 2 }}>
              图像加载失败
            </Typography>
            <IconButton 
              onClick={() => setError(false)}
              color="primary" 
              sx={{ 
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.2)
                }
              }}
            >
              <ReplayIcon />
            </IconButton>
          </Box>
        )}
        <TransformWrapper
          initialScale={1}
          minScale={0.1}
          maxScale={5}
          centerOnInit={true}
          wheel={{ disabled: error }}
          pinch={{ disabled: error }}
          panning={{ disabled: error }}
          onTransformed={(ref) => {
            setScale(ref.state.scale);
          }}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
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
              >
                {!error && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      transform: `rotate(${rotation}deg)`,
                      transition: 'transform 0.3s ease',
                      transformOrigin: 'center center',
                      width: '100%',
                      height: '100%',
                      position: 'relative',
                    }}
                  >
                    <img
                      ref={imgRef}
                      src={shouldLoad ? imageUrl : ''}
                      alt={fileName}
                      className={!loading ? 'loaded' : ''}
                      style={{
                        maxWidth: '90%',
                        maxHeight: '80%',
                        objectFit: 'contain',
                        transition: 'opacity 0.3s ease',
                      }}
                      onLoad={() => setLoading(false)}
                      onError={() => {
                        setLoading(false);
                        setError(true);
                      }}
                    />
                  </div>
                )}
              </TransformComponent>

              <Box 
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  gap: 2,
                  p: 1.5,
                  bgcolor: theme.palette.mode === 'dark' 
                    ? alpha(theme.palette.background.paper, 0.7) 
                    : alpha(theme.palette.background.paper, 0.8),
                  backdropFilter: 'blur(10px)',
                  borderTop: '1px solid',
                  borderColor: alpha(theme.palette.divider, 0.1),
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  zIndex: 100, // 确保工具栏始终在最上层
                  height: '72px',
                  paddingTop: '12px',
                  paddingBottom: '12px',
                  boxShadow: theme.palette.mode === 'dark' 
                    ? '0 -4px 12px rgba(0,0,0,0.2)' 
                    : '0 -4px 12px rgba(0,0,0,0.1)',
                  ...(fullScreenMode && {
                    paddingRight: '120px',
                    width: 'calc(100% - 48px)',
                    right: '24px',
                    left: '24px',
                    borderRadius: '16px',
                    bottom: '16px',
                    border: '1px solid',
                    borderColor: alpha(theme.palette.divider, 0.1)
                  })
                }}
              >
                <Box 
                  sx={{ 
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 2,
                    width: '100%',
                    paddingLeft: onClose ? '80px' : 0, // 为右侧关闭按钮平衡空间
                  }}
                >
                  <IconButton 
                    onClick={() => zoomOut()}
                    disabled={error}
                    size={isSmallScreen ? "medium" : "large"}
                    sx={{ 
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.2)
                      },
                      borderRadius: '12px',
                      padding: isSmallScreen ? '8px' : '10px',
                      height: isSmallScreen ? '40px' : '48px',
                      width: isSmallScreen ? '40px' : '48px'
                    }}
                  >
                    <ZoomOutIcon fontSize={isSmallScreen ? "small" : "medium"} />
                  </IconButton>
                  
                  <IconButton 
                    onClick={() => resetTransform()}
                    disabled={error}
                    size={isSmallScreen ? "medium" : "large"}
                    sx={{ 
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.2)
                      },
                      borderRadius: '12px',
                      padding: isSmallScreen ? '8px' : '10px',
                      width: isSmallScreen ? '64px' : '80px',
                      minWidth: isSmallScreen ? '64px' : '80px',
                      height: isSmallScreen ? '40px' : '48px',
                      justifyContent: 'center'
                    }}
                  >
                    <Typography 
                      variant={isSmallScreen ? "caption" : "body2"} 
                      sx={{ 
                        fontWeight: 500,
                        minWidth: isSmallScreen ? '36px' : '44px',
                        textAlign: 'center'
                      }}
                    >
                      {Math.round(scale * 100)}%
                    </Typography>
                  </IconButton>
                  
                  <IconButton 
                    onClick={() => zoomIn()}
                    disabled={error}
                    size={isSmallScreen ? "medium" : "large"}
                    sx={{ 
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.2)
                      },
                      borderRadius: '12px',
                      padding: isSmallScreen ? '8px' : '10px',
                      height: isSmallScreen ? '40px' : '48px',
                      width: isSmallScreen ? '40px' : '48px'
                    }}
                  >
                    <ZoomInIcon fontSize={isSmallScreen ? "small" : "medium"} />
                  </IconButton>

                  <IconButton 
                    onClick={handleRotateLeft}
                    disabled={error}
                    size={isSmallScreen ? "medium" : "large"}
                    sx={{ 
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.2)
                      },
                      borderRadius: '12px',
                      padding: isSmallScreen ? '8px' : '10px',
                      height: isSmallScreen ? '40px' : '48px',
                      width: isSmallScreen ? '40px' : '48px'
                    }}
                  >
                    <RotateLeftIcon fontSize={isSmallScreen ? "small" : "medium"} />
                  </IconButton>

                  <IconButton 
                    onClick={handleRotateRight}
                    disabled={error}
                    size={isSmallScreen ? "medium" : "large"}
                    sx={{ 
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.2)
                      },
                      borderRadius: '12px',
                      padding: isSmallScreen ? '8px' : '10px',
                      height: isSmallScreen ? '40px' : '48px',
                      width: isSmallScreen ? '40px' : '48px'
                    }}
                  >
                    <RotateRightIcon fontSize={isSmallScreen ? "small" : "medium"} />
                  </IconButton>

                  {!fullScreenMode && (
                    <IconButton 
                      onClick={toggleFullScreen}
                      disabled={error}
                      size={isSmallScreen ? "medium" : "large"}
                      sx={{ 
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.2)
                        },
                        borderRadius: '12px',
                        padding: isSmallScreen ? '8px' : '10px',
                        height: isSmallScreen ? '40px' : '48px',
                        width: isSmallScreen ? '40px' : '48px'
                      }}
                    >
                      <FullscreenIcon fontSize={isSmallScreen ? "small" : "medium"} />
                    </IconButton>
                  )}
                </Box>
                
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleClosePreview}
                  sx={{
                    position: 'absolute',
                    right: theme.spacing(2),
                    borderRadius: theme.shape.borderRadius * 2,
                    minWidth: '80px',
                    fontWeight: 'bold',
                    backgroundColor: theme.palette.mode === 'dark' 
                      ? theme.palette.primary.dark 
                      : theme.palette.primary.main,
                    color: '#fff',
                    '&:hover': {
                      backgroundColor: theme.palette.mode === 'dark' 
                        ? alpha(theme.palette.primary.dark, 0.9) 
                        : alpha(theme.palette.primary.main, 0.9),
                    },
                    zIndex: theme.zIndex.modal + 50
                  }}
                >
                  关闭
                </Button>
              </Box>
            </>
          )}
        </TransformWrapper>
      </Box>
    </Box>
  ), [className, error, fileName, handleReset, handleRotateLeft, handleRotateRight, imageUrl, isSmallScreen, loading, rotation, style, theme, toggleFullScreen, fullScreenMode, scale, shouldLoad]);

  // 缩略图模式
  if (thumbnailMode && !showPreview) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <Box 
          sx={{ 
            width: thumbnailSize.width, 
            height: thumbnailSize.height, 
            overflow: 'hidden',
            cursor: 'pointer',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            '&:hover': {
              boxShadow: theme.shadows[2]
            }
          }}
          onClick={handleOpenPreview}
        >
          <img 
            ref={imgRef}
            src={shouldLoad ? imageUrl : ''}
            alt={fileName}
            style={{ 
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError(true);
            }}
          />
        </Box>
        
        <Button variant="contained" onClick={handleOpenPreview}>
          查看大图
        </Button>
      </Box>
    );
  }

  // 全屏模式
  if (fullScreenMode) {
    return (
      <FullScreenPreview 
        onClose={handleClosePreview} 
        backgroundColor={theme.palette.mode === 'dark' ? '#1a1a1a' : '#f5f5f5'}
        disablePadding={true}
      >
        {renderPreviewContent()}
      </FullScreenPreview>
    );
  }

  // 直接预览模式
  return renderPreviewContent();
};

export default ImagePreview; 