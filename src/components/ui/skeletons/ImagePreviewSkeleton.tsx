import React from "react";
import {
  Box,
  Skeleton,
  useTheme,
} from "@mui/material";
import { getSkeletonStyles, getContainerTransitionStyles, useSkeletonVisibility } from "./shared";
import { g3BorderRadius, G3_PRESETS } from "@/theme/g3Curves";

interface ImagePreviewSkeletonProps {
  isSmallScreen?: boolean;
  visible?: boolean;
  onExited?: () => void;
  targetWidth?: number;
  targetHeight?: number;
  aspectRatio?: number;
  'data-oid'?: string;
}

/**
 * 图片预览骨架屏组件
 *
 * 在图片加载时显示的占位骨架屏。
 */
export const ImagePreviewSkeleton: React.FC<ImagePreviewSkeletonProps> = ({
  isSmallScreen = false,
  visible = true,
  onExited,
  targetWidth,
  targetHeight,
  aspectRatio,
  ...rest
}) => {
  const theme = useTheme();
  const skeletonStyles = getSkeletonStyles(theme);
  const isExiting = useSkeletonVisibility(visible, onExited);

  const fallbackWidth = isSmallScreen ? "88%" : "60%";
  const fallbackHeight = isSmallScreen ? "54%" : "60%";
  const resolvedWidth = typeof targetWidth === "number" && targetWidth > 0
    ? Math.round(targetWidth)
    : fallbackWidth;
  const resolvedHeight = typeof targetHeight === "number" && targetHeight > 0
    ? Math.round(targetHeight)
    : fallbackHeight;
  const normalizedAspectRatio = typeof aspectRatio === "number" && aspectRatio > 0 ? aspectRatio : undefined;

  return (
    <Box
      sx={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        bgcolor: theme.palette.mode === "dark" ? "#1a1a1a" : "#f5f5f5",
        zIndex: 10,
        ...getContainerTransitionStyles(isExiting),
      }}
      data-oid="8od.96t"
      {...rest}
    >
      {/* 图片区域 */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          position: "relative",
        }}
        data-oid="494nx3n"
      >
        <Skeleton
          variant="rectangular"
          width={resolvedWidth}
          height={resolvedHeight}
          animation="wave"
          sx={{
            borderRadius: g3BorderRadius(G3_PRESETS.image),
            ...skeletonStyles,
            maxWidth: "100%",
            maxHeight: "100%",
            aspectRatio: normalizedAspectRatio ? `${normalizedAspectRatio}` : undefined,
          }}
          data-oid="g91oyf4"
        />
      </Box>
    </Box>
  );
};
