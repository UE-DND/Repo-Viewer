import React from 'react';
import { Box, Button, useTheme } from '@mui/material';
import type { ImageThumbnailProps } from './types';

/**
 * 图片缩略图组件
 * 用于在缩略图模式下显示小图预览，点击后打开完整预览
 */
const ImageThumbnail: React.FC<ImageThumbnailProps> = ({
  imageUrl,
  fileName,
  thumbnailSize,
  shouldLoad,
  onOpenPreview,
  onLoad,
  onError,
  imgRef,
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
      }}
      data-oid="sma03t:"
    >
      {/* 缩略图容器 */}
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
            boxShadow: theme.shadows[2],
          },
        }}
        onClick={onOpenPreview}
        data-oid="4vk_mgq"
      >
        <img
          ref={imgRef}
          src={shouldLoad ? imageUrl : ''}
          alt={fileName || '缩略图'}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          onLoad={onLoad}
          onError={onError}
          data-oid="..bfs6c"
        />
      </Box>

      {/* 查看大图按钮 */}
      <Button
        variant="contained"
        onClick={onOpenPreview}
        data-oid="otw7voa"
      >
        查看大图
      </Button>
    </Box>
  );
};

export default ImageThumbnail;
