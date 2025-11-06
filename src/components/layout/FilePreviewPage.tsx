import React, { useMemo, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Chip,
  useTheme,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import BreadcrumbNavigation from "@/components/layout/BreadcrumbNavigation";
import { LazyMarkdownPreview, LazyImagePreview, LazyTextPreview } from "@/utils/lazy-loading";
import type { PreviewState, GitHubContent } from "@/types";
import type { BreadcrumbSegment } from "@/types";
import type { NavigationDirection } from "@/contexts/unified";
import { formatFileSize } from "@/utils/format/formatters";

interface FilePreviewPageProps {
  previewState: PreviewState;
  onClose: () => void;
  isSmallScreen: boolean;
  currentBranch: string;
  breadcrumbSegments: BreadcrumbSegment[];
  breadcrumbsMaxItems: number;
  handleBreadcrumbClick: (path: string, direction?: NavigationDirection) => void;
  breadcrumbsContainerRef: React.RefObject<HTMLDivElement | null>;
  shouldShowInToolbar: boolean;
  hasPreviousImage: boolean;
  hasNextImage: boolean;
  onPreviousImage: () => void;
  onNextImage: () => void;
}

const FilePreviewPage: React.FC<FilePreviewPageProps> = ({
  previewState,
  onClose,
  isSmallScreen,
  currentBranch,
  breadcrumbSegments,
  breadcrumbsMaxItems,
  handleBreadcrumbClick,
  breadcrumbsContainerRef,
  shouldShowInToolbar,
  hasPreviousImage,
  hasNextImage,
  onPreviousImage,
  onNextImage,
}) => {
  const theme = useTheme();

  const previewingFile: GitHubContent | null =
    previewState.previewingItem ?? previewState.previewingImageItem;

  const htmlUrl =
    typeof previewingFile?.html_url === "string"
      ? previewingFile.html_url.trim()
      : "";

  const fileSizeLabel = useMemo(() => {
    if (previewingFile === null || typeof previewingFile.size !== "number") {
      return "";
    }
    return formatFileSize(previewingFile.size);
  }, [previewingFile]);

  const fileTypeLabel = useMemo(() => {
    if (previewState.previewType === "markdown") {
      return "Markdown";
    }

    if (previewState.previewType === "text") {
      return "文本";
    }

    if (previewState.previewingImageItem !== null) {
      const name = previewState.previewingImageItem.name;
      const extension = name.includes(".") ? name.split(".").pop() ?? "" : "";
      return extension.length > 0 ? extension.toUpperCase() : "图片";
    }

    return "";
  }, [previewState]);

  const handleOpenInGithub = useCallback(() => {
    if (htmlUrl.length === 0) {
      return;
    }

    window.open(htmlUrl, "_blank", "noopener,noreferrer");
  }, [htmlUrl]);

  const imagePreviewUrl =
    previewState.previewingImageItem !== null && typeof previewState.imagePreviewUrl === "string"
      ? previewState.imagePreviewUrl
      : null;

  const hasImagePreview = imagePreviewUrl !== null;

  const hasMarkdownPreview =
    previewState.previewType === "markdown" && previewState.previewContent !== null;

  const hasTextPreview =
    previewState.previewType === "text" && previewState.previewContent !== null;

  if (previewingFile === null) {
    return null;
  }

  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        pb: { xs: 4, md: 6 },
        gap: { xs: 2, md: 2.5 },
      }}
      data-oid="preview-page-root"
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: "1200px",
          display: "flex",
          flexDirection: "column",
          gap: { xs: 2.5, md: 3 },
        }}
        data-oid="preview-page-content"
      >
        <Box
          sx={{
            opacity: shouldShowInToolbar ? 0 : 1,
            transform: shouldShowInToolbar ? "translateY(-20px)" : "translateY(0)",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            pointerEvents: shouldShowInToolbar ? "none" : "auto",
          }}
        >
          <BreadcrumbNavigation
            breadcrumbSegments={breadcrumbSegments}
            handleBreadcrumbClick={handleBreadcrumbClick}
            breadcrumbsMaxItems={breadcrumbsMaxItems}
            isSmallScreen={isSmallScreen}
            breadcrumbsContainerRef={breadcrumbsContainerRef}
          />
        </Box>

        <Paper
          elevation={0}
          sx={{
            borderRadius: 1,
            px: { xs: 2.25, sm: 3, md: 4 },
            py: { xs: 2, sm: 2.5 },
            border: "1px solid",
            borderColor: "divider",
            boxShadow: theme.shadows[1],
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: { xs: "flex-start", md: "center" },
            gap: { xs: 2, md: 3 },
          }}
          data-oid="preview-page-header"
        >
          <Box sx={{ flex: 1, minWidth: 0 }} data-oid="preview-page-info">
            <Typography
              variant={isSmallScreen ? "h6" : "h5"}
              sx={{ fontWeight: 600, wordBreak: "break-word" }}
              data-oid="preview-page-title"
            >
              {previewingFile.name}
            </Typography>

            <Typography
              variant="body2"
              sx={{ mt: 0.5, color: "text.secondary", wordBreak: "break-all" }}
              data-oid="preview-page-subtitle"
            >
              {previewingFile.path}
            </Typography>
          </Box>

          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            flexWrap="wrap"
            sx={{
              alignItems: "center",
              justifyContent: { xs: "flex-start", md: "flex-end" },
            }}
            data-oid="preview-page-meta"
          >
            {fileTypeLabel.length > 0 ? (
              <Chip
                size="small"
                label={`类型：${fileTypeLabel}`}
                color="primary"
                variant="outlined"
                data-oid="preview-page-type"
              />
            ) : null}
            {fileSizeLabel.length > 0 ? (
              <Chip
                size="small"
                label={`大小：${fileSizeLabel}`}
                variant="outlined"
                data-oid="preview-page-size"
              />
            ) : null}
            {currentBranch.trim().length > 0 ? (
              <Chip
                size="small"
                label={`分支：${currentBranch}`}
                variant="outlined"
                data-oid="preview-page-branch"
              />
            ) : null}
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            sx={{
              flexWrap: "wrap",
              justifyContent: { xs: "flex-start", md: "flex-end" },
            }}
            data-oid="preview-page-actions"
          >
            {htmlUrl.length > 0 ? (
              <Button
                variant="outlined"
                size="small"
                startIcon={<OpenInNewIcon fontSize="small" />}
                onClick={handleOpenInGithub}
                data-oid="preview-page-open-github"
              >
                GitHub
              </Button>
            ) : null}

            <Button
              variant="contained"
              size="small"
              startIcon={<ArrowBackIcon fontSize="small" />}
              onClick={onClose}
              data-oid="preview-page-close"
            >
              返回目录
            </Button>
          </Stack>
        </Paper>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: { xs: 2.5, md: 3 },
            minHeight: hasImagePreview ? "auto" : "320px",
          }}
          data-oid="preview-page-view"
        >
          {hasMarkdownPreview ? (
            <LazyMarkdownPreview
              readmeContent={previewState.previewContent}
              loadingReadme={previewState.loadingPreview}
              isSmallScreen={isSmallScreen}
              previewingItem={previewState.previewingItem}
              lazyLoad={false}
              currentBranch={currentBranch}
              data-oid="preview-page-markdown"
            />
          ) : null}

          {hasTextPreview ? (
            <LazyTextPreview
              content={previewState.previewContent}
              loading={previewState.loadingPreview}
              isSmallScreen={isSmallScreen}
              previewingItem={previewState.previewingItem}
              data-oid="preview-page-text"
            />
          ) : null}

          {imagePreviewUrl !== null ? (
            <Box
              sx={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <LazyImagePreview
                imageUrl={imagePreviewUrl}
                fileName={previewState.previewingImageItem?.name ?? "图片预览"}
                onClose={onClose}
                isFullScreen={false}
                lazyLoad={false}
                hasPrevious={hasPreviousImage}
                hasNext={hasNextImage}
                onPrevious={hasPreviousImage ? onPreviousImage : undefined}
                onNext={hasNextImage ? onNextImage : undefined}
                data-oid="preview-page-image"
              />
            </Box>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
};

export default FilePreviewPage;
