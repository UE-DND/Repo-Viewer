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
import { g3BorderRadius, G3_PRESETS } from '../../../theme/g3Curves';

/**
 * 图片预览工具栏组件
 * 提供缩放、旋转、全屏等操作功能
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
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 2,
        p: 1.5,
        bgcolor:
          theme.palette.mode === 'dark'
            ? alpha(theme.palette.background.paper, 0.7)
            : alpha(theme.palette.background.paper, 0.8),
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid',
        borderColor: alpha(theme.palette.divider, 0.1),
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        height: '72px',
        paddingTop: '12px',
        paddingBottom: '12px',
        boxShadow:
          theme.palette.mode === 'dark'
            ? '0 -4px 12px rgba(0,0,0,0.2)'
            : '0 -4px 12px rgba(0,0,0,0.1)',
        ...(fullScreenMode && {
          paddingRight: '120px',
          width: 'calc(100% - 48px)',
          right: '24px',
          left: '24px',
          borderRadius: g3BorderRadius(G3_PRESETS.card),
          bottom: '16px',
          border: '1px solid',
          borderColor: alpha(theme.palette.divider, 0.1),
        }),
      }}
      data-oid="2ux6qrx"
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 2,
          width: '100%',
          paddingLeft: '80px', // 为右侧关闭按钮平衡空间
        }}
        data-oid="wlz6pbm"
      >
        {/* 缩小按钮 */}
        <IconButton
          onClick={zoomOut}
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
          onClick={resetTransform}
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
          onClick={zoomIn}
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
          position: 'absolute',
          right: theme.spacing(2),
          borderRadius: closeButtonBorderRadius,
          minWidth: '80px',
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
        }}
        data-oid="rqnqmvq"
      >
        关闭
      </Button>
    </Box>
  );
};

export default ImageToolbar;
