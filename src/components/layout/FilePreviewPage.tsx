import React, { useCallback } from "react";
import { Box } from "@mui/material";
import { motion, type Variants } from "framer-motion";
import BreadcrumbNavigation from "@/components/layout/BreadcrumbNavigation";
import { LazyMarkdownPreview, LazyImagePreview, LazyTextPreview } from "@/utils/lazy-loading";
import type { PreviewState, GitHubContent } from "@/types";
import type { BreadcrumbSegment } from "@/types";
import type { NavigationDirection } from "@/contexts/unified";

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

const previewAnimation: Variants = {
  hidden: { opacity: 0, marginTop: 16 },
  visible: {
    opacity: 1,
    marginTop: 0,
    transition: {
      duration: 0.18,
      ease: [0.4, 0, 0.2, 1] as const,
    },
  },
};

const MotionBox = motion(Box);

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
  const previewingFile: GitHubContent | null =
    previewState.previewingItem ?? previewState.previewingImageItem;

  const htmlUrl =
    typeof previewingFile?.html_url === "string"
      ? previewingFile.html_url.trim()
      : "";

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
          gap: 0,
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
            showBackButton={false}
          />
        </Box>

        <MotionBox
          initial="hidden"
          animate="visible"
          variants={previewAnimation}
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
              onClose={onClose}
              data-oid="preview-page-markdown"
            />
          ) : null}

          {hasTextPreview ? (
            <LazyTextPreview
              content={previewState.previewContent}
              loading={previewState.loadingPreview}
              isSmallScreen={isSmallScreen}
              previewingItem={previewState.previewingItem}
              onClose={onClose}
              {...(htmlUrl.length > 0 ? { onOpenInGithub: handleOpenInGithub } : {})}
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
        </MotionBox>
      </Box>
    </Box>
  );
};

export default FilePreviewPage;
