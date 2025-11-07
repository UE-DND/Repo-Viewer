import React from 'react';
import { Box, Typography } from '@mui/material';
import { LazyMarkdownPreview } from '@/utils/lazy-loading';
import { MarkdownPreviewSkeleton } from '@/components/ui/skeletons';
import type { GitHubContent } from '@/types';

interface ReadmeSectionProps {
  hasReadmeFile: boolean;
  readmeContent: string | null;
  loadingReadme: boolean;
  readmeLoaded: boolean;
  isSmallScreen: boolean;
  currentBranch: string;
  readmeFileItem: GitHubContent | null;
}

/**
 * README 预览区域组件
 *
 * 显示当前目录的 README 文件预览
 */
const ReadmeSection: React.FC<ReadmeSectionProps> = ({
  hasReadmeFile,
  readmeContent,
  loadingReadme,
  readmeLoaded,
  isSmallScreen,
  currentBranch,
  readmeFileItem
}) => {
  if (!hasReadmeFile) {
    return null;
  }

  const hasReadmeContent = typeof readmeContent === "string" && readmeContent.trim().length > 0;
  const shouldShowReadmeSkeleton = !hasReadmeContent && (!readmeLoaded || loadingReadme);

  return (
    <Box
      className="readme-container"
      sx={{
        position: "relative",
        width: "100%",
        mb: 4,
        display: "flex",
        flexDirection: "column",
      }}
      data-oid="0zc9q5:"
    >
      <Typography
        variant="h5"
        sx={{
          fontWeight: 600,
          mb: 2,
          display: "flex",
          alignItems: "center",
          color: "text.primary",
        }}
        data-oid="iawc_6m"
      />

      {shouldShowReadmeSkeleton ? (
        <MarkdownPreviewSkeleton
          isSmallScreen={isSmallScreen}
          data-oid="readme-skeleton"
        />
      ) : hasReadmeContent ? (
        <LazyMarkdownPreview
          readmeContent={readmeContent}
          loadingReadme={false}
          isSmallScreen={isSmallScreen}
          lazyLoad={false}
          currentBranch={currentBranch}
          previewingItem={readmeFileItem}
          data-oid="6nohd:r"
        />
      ) : readmeLoaded ? (
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            px: { xs: 2, sm: 3, md: 4 },
            py: { xs: 2, sm: 3 },
            borderRadius: 2,
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
          }}
          data-oid="readme-empty"
        >
          README 内容为空或加载失败。
        </Typography>
      ) : null}
    </Box>
  );
};

export default ReadmeSection;

