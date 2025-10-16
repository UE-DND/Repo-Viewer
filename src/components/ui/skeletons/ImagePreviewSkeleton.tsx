import React from "react";
import {
  Box,
  Skeleton,
  useTheme,
} from "@mui/material";
import { getSkeletonStyles, getContainerTransitionStyles, useSkeletonVisibility } from "./shared";
import { g3BorderRadius, G3_PRESETS } from "@/theme/g3Curves";

/**
 * 图片预览骨架屏组件
 * 
 * 在图片加载时显示的占位骨架屏。
 */
export const ImagePreviewSkeleton: React.FC<{
  isSmallScreen?: boolean;
  visible?: boolean;
  onExited?: () => void;
}> = ({ isSmallScreen = false, visible = true, onExited }) => {
  const theme = useTheme();
  const skeletonStyles = getSkeletonStyles(theme);
  const isExiting = useSkeletonVisibility(visible, onExited);

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
          width={isSmallScreen ? "80%" : "60%"}
          height={isSmallScreen ? "50%" : "60%"}
          animation="wave"
          sx={{ borderRadius: g3BorderRadius(G3_PRESETS.image), ...skeletonStyles }}
          data-oid="g91oyf4"
        />
      </Box>
    </Box>
  );
};
