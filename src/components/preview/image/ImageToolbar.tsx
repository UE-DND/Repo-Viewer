import React from 'react';
import {
  Box,
  IconButton,
  Typography,
  Button,
  alpha,
  useTheme,
} from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  RotateLeft as RotateLeftIcon,
  RotateRight as RotateRightIcon,
  Fullscreen as FullscreenIcon,
} from '@mui/icons-material';
import type { ImageToolbarProps } from './types';
import { g3BorderRadius, G3_PRESETS } from '@/theme/g3Curves';

/**
 * 图片工具栏组件
 * 
 * 提供图片预览的控制功能，包括缩放、旋转、全屏和关闭。
 */
const ImageToolbar: React.FC<ImageToolbarProps> = ({
  error,
  scale,
  isSmallScreen,
  fullScreenMode,
  zoomIn,
  zoomOut,
  resetTransform,
  handleRotateLeft,
  handleRotateRight,
  toggleFullScreen,
  handleClosePreview,
  closeButtonBorderRadius,
  variant = 'inline',
}) => {
  const theme = useTheme();
  const isFloating = variant === 'floating' && !fullScreenMode;
  const isInline = variant === 'inline';
  const isOverlayFullWidth = variant === 'full-width' || (fullScreenMode && !isInline);

  const containerBg = theme.palette.mode === 'dark'
    ? alpha(theme.palette.background.paper, isFloating ? 0.72 : isInline ? 0.78 : 0.7)
    : alpha(theme.palette.background.paper, isFloating ? 0.85 : isInline ? 0.9 : 0.8);

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: { xs: 1, sm: 1.5, md: 2 },
        px: { xs: 1.25, sm: 1.75, md: 2 },
        py: { xs: 1, sm: 1.25, md: 1.5 },
        bgcolor: containerBg,
        backdropFilter: 'blur(16px)',
        border: 'none',
        position: isFloating || isOverlayFullWidth ? 'absolute' : 'relative',
        bottom: isFloating || isOverlayFullWidth ? 0 : undefined,
        left: isFloating || isOverlayFullWidth ? 0 : undefined,
        right: isFloating || isOverlayFullWidth ? 0 : undefined,
        zIndex: 100,
        minHeight: isSmallScreen ? '64px' : '72px',
        height: 'auto',
        paddingTop: isSmallScreen ? '10px' : '14px',
        paddingBottom: isSmallScreen ? '10px' : '14px',
        boxShadow: isFloating
          ? theme.shadows[6]
          : isInline
            ? theme.shadows[2]
            : (theme.palette.mode === 'dark'
                ? '0 -4px 12px rgba(0,0,0,0.2)'
                : '0 -4px 12px rgba(0,0,0,0.1)'),
        flexWrap: isSmallScreen ? 'wrap' : 'nowrap',
        borderRadius: isInline ? 1 : (isFloating ? g3BorderRadius(G3_PRESETS.card) : 0),
        pointerEvents: 'auto',
        width: isInline ? 'auto' : undefined,
        maxWidth: '100%',
        alignSelf: 'center',
        ...(fullScreenMode && variant === 'full-width' ? {
          paddingRight: isSmallScreen ? '8px' : '120px',
          paddingLeft: isSmallScreen ? '8px' : undefined,
          width: isSmallScreen ? 'calc(100% - 16px)' : 'calc(100% - 48px)',
          right: isSmallScreen ? '8px' : '24px',
          left: isSmallScreen ? '8px' : '24px',
          borderRadius: g3BorderRadius(G3_PRESETS.card),
          bottom: isSmallScreen ? '8px' : '16px',
          border: 'none',
        } : {}),
      }}
      data-oid="2ux6qrx"
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: { xs: 0.75, sm: 1, md: 2 },
          flex: isInline ? '0 1 auto' : '1 1 auto',
          minWidth: 0,
          paddingLeft: isInline ? 0 : (isSmallScreen ? 0 : '56px'),
          paddingRight: isInline ? 0 : (isSmallScreen ? '72px' : 0),
          flexWrap: isInline && isSmallScreen ? 'wrap' : 'nowrap',
          rowGap: isInline && isSmallScreen ? 1 : 0,
        }}
        data-oid="wlz6pbm"
      >
        {/* 缩小按钮 */}
        <IconButton
          onClick={() => {
            zoomOut();
          }}
          disabled={error}
          size={isSmallScreen ? 'medium' : 'large'}
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.2),
            },
            borderRadius: g3BorderRadius(G3_PRESETS.button),
            padding: isSmallScreen ? '8px' : '10px',
            height: isSmallScreen ? '40px' : '48px',
            width: isSmallScreen ? '40px' : '48px',
          }}
          data-oid=":4kbc4k"
        >
          <ZoomOutIcon
            fontSize={isSmallScreen ? 'small' : 'medium'}
            data-oid="3-:jjhw"
          />
        </IconButton>

        {/* 缩放比例显示和重置按钮 */}
        <IconButton
          onClick={() => {
            resetTransform();
          }}
          disabled={error}
          size={isSmallScreen ? 'medium' : 'large'}
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.2),
            },
            borderRadius: g3BorderRadius(G3_PRESETS.button),
            padding: isSmallScreen ? '8px' : '10px',
            width: isSmallScreen ? '64px' : '80px',
            minWidth: isSmallScreen ? '64px' : '80px',
            height: isSmallScreen ? '40px' : '48px',
            justifyContent: 'center',
          }}
          data-oid="mx.rtt4"
        >
          <Typography
            variant={isSmallScreen ? 'caption' : 'body2'}
            sx={{
              fontWeight: 500,
              minWidth: isSmallScreen ? '36px' : '44px',
              textAlign: 'center',
            }}
            data-oid="vn9ul2y"
          >
            {Math.round(scale * 100)}%
          </Typography>
        </IconButton>

        {/* 放大按钮 */}
        <IconButton
          onClick={() => {
            zoomIn();
          }}
          disabled={error}
          size={isSmallScreen ? 'medium' : 'large'}
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.2),
            },
            borderRadius: g3BorderRadius(G3_PRESETS.button),
            padding: isSmallScreen ? '8px' : '10px',
            height: isSmallScreen ? '40px' : '48px',
            width: isSmallScreen ? '40px' : '48px',
          }}
          data-oid="rpj_u5-"
        >
          <ZoomInIcon
            fontSize={isSmallScreen ? 'small' : 'medium'}
            data-oid="78o_sgq"
          />
        </IconButton>

        {/* 左旋转按钮 */}
        <IconButton
          onClick={handleRotateLeft}
          disabled={error}
          size={isSmallScreen ? 'medium' : 'large'}
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.2),
            },
            borderRadius: g3BorderRadius(G3_PRESETS.button),
            padding: isSmallScreen ? '8px' : '10px',
            height: isSmallScreen ? '40px' : '48px',
            width: isSmallScreen ? '40px' : '48px',
          }}
          data-oid="eorlbul"
        >
          <RotateLeftIcon
            fontSize={isSmallScreen ? 'small' : 'medium'}
            data-oid="mg660l-"
          />
        </IconButton>

        {/* 右旋转按钮 */}
        <IconButton
          onClick={handleRotateRight}
          disabled={error}
          size={isSmallScreen ? 'medium' : 'large'}
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.2),
            },
            borderRadius: g3BorderRadius(G3_PRESETS.button),
            padding: isSmallScreen ? '8px' : '10px',
            height: isSmallScreen ? '40px' : '48px',
            width: isSmallScreen ? '40px' : '48px',
          }}
          data-oid="e.aaidi"
        >
          <RotateRightIcon
            fontSize={isSmallScreen ? 'small' : 'medium'}
            data-oid="9xuw2t_"
          />
        </IconButton>

        {/* 全屏按钮（仅在非全屏模式下显示） */}
        {!fullScreenMode && (
          <IconButton
            onClick={toggleFullScreen}
            disabled={error}
            size={isSmallScreen ? 'medium' : 'large'}
            sx={{
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.2),
              },
              borderRadius: g3BorderRadius(G3_PRESETS.button),
              padding: isSmallScreen ? '8px' : '10px',
              height: isSmallScreen ? '40px' : '48px',
              width: isSmallScreen ? '40px' : '48px',
            }}
            data-oid="cul6zri"
          >
            <FullscreenIcon
              fontSize={isSmallScreen ? 'small' : 'medium'}
              data-oid="7ykiypv"
            />
          </IconButton>
        )}
      </Box>

      {/* 关闭按钮 */}
      <Button
        variant="contained"
        color="primary"
        onClick={handleClosePreview}
        sx={{
          position: isInline ? 'relative' : 'absolute',
          right: isInline ? undefined : (isSmallScreen ? theme.spacing(1.5) : theme.spacing(2)),
          marginLeft: isInline ? theme.spacing(2) : 0,
          borderRadius: closeButtonBorderRadius,
          minWidth: isSmallScreen ? '64px' : '80px',
          height: isSmallScreen ? '40px' : '48px',
          fontSize: isSmallScreen ? '0.875rem' : '1rem',
          fontWeight: 'bold',
          backgroundColor:
            theme.palette.mode === 'dark'
              ? theme.palette.primary.dark
              : theme.palette.primary.main,
          color: '#fff',
          '&:hover': {
            backgroundColor:
              theme.palette.mode === 'dark'
                ? alpha(theme.palette.primary.dark, 0.9)
                : alpha(theme.palette.primary.main, 0.9),
          },
          zIndex: theme.zIndex.modal + 50,
          padding: isSmallScreen ? '8px 12px' : '8px 16px',
        }}
        data-oid="rqnqmvq"
      >
        关闭
      </Button>
    </Box>
  );
};

export default ImageToolbar;
