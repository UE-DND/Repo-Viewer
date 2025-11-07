import React from 'react';
import { Box, useTheme } from '@mui/material';
import { LazyMarkdownPreview, LazyImagePreview } from '@/utils/lazy-loading';
import type { GitHubContent } from '@/types';

interface PreviewOverlayProps {
  // Markdown 预览
  previewingItem: GitHubContent | null;
  previewContent: string | null;
  loadingPreview: boolean;

  // 图片预览
  previewingImageItem: GitHubContent | null;
  imagePreviewUrl: string | null;

  // 图片导航
  hasPreviousImage: boolean;
  hasNextImage: boolean;
  onPreviousImage: () => void;
  onNextImage: () => void;

  // 通用
  isSmallScreen: boolean;
  currentBranch: string;
  onClose: () => void;
}

/**
 * 预览覆盖层组件
 *
 * 处理 Markdown 和图片的全屏预览显示
 */
const PreviewOverlay: React.FC<PreviewOverlayProps> = ({
  previewingItem,
  previewContent,
  loadingPreview,
  previewingImageItem,
  imagePreviewUrl,
  hasPreviousImage,
  hasNextImage,
  onPreviousImage,
  onNextImage,
  isSmallScreen,
  currentBranch,
  onClose
}) => {
  const theme = useTheme();

  return (
    <>
      {/* Markdown文件预览（非README） */}
      {previewingItem !== null && previewContent !== null && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: theme.zIndex.modal + 100,
            bgcolor: "background.default",
            overflow: "auto",
            p: { xs: 2, sm: 3, md: 4 },
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
          data-oid="md-preview-fs"
        >
          <Box
            sx={{
              maxWidth: "1200px",
              mx: "auto",
              width: "100%",
            }}
            data-oid="md-preview-container"
          >
            <LazyMarkdownPreview
              readmeContent={previewContent}
              loadingReadme={loadingPreview}
              isSmallScreen={isSmallScreen}
              previewingItem={previewingItem}
              onClose={onClose}
              lazyLoad={false}
              currentBranch={currentBranch}
              data-oid="md-file-preview"
            />
          </Box>
        </Box>
      )}

      {/* 图像预览 */}
      {previewingImageItem !== null && imagePreviewUrl !== null && (
        <LazyImagePreview
          imageUrl={imagePreviewUrl}
          fileName={previewingImageItem.name}
          isFullScreen={true}
          onClose={onClose}
          lazyLoad={false}
          hasPrevious={hasPreviousImage}
          hasNext={hasNextImage}
          onPrevious={onPreviousImage}
          onNext={onNextImage}
          data-oid="yfv5ld-"
        />
      )}
    </>
  );
};

export default PreviewOverlay;

