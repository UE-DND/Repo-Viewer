import React from "react";
import {
  Box,
  Skeleton,
  useTheme,
} from "@mui/material";
import { getSkeletonStyles, getContainerTransitionStyles, useSkeletonVisibility } from "./shared";
import { g3BorderRadius, G3_PRESETS } from "@/theme/g3Curves";

/**
 * Office文档预览骨架屏组件
 * 
 * 在Office文档加载时显示的占位骨架屏。
 */
export const OfficePreviewSkeleton: React.FC<{
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
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: theme.palette.mode === "dark" ? "#1a1a1a" : "#f5f5f5",
        borderRadius: g3BorderRadius(G3_PRESETS.card),
        ...getContainerTransitionStyles(isExiting),
      }}
      data-oid="mmtnv4s"
    >
      {/* 标题栏 */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 1,
          pl: 2,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor:
            theme.palette.mode === "dark"
              ? "rgba(0,0,0,0.4)"
              : "rgba(255,255,255,0.8)",
        }}
        data-oid="ovnfp1n"
      >
        <Skeleton
          variant="text"
          width={isSmallScreen ? 160 : 200}
          height={isSmallScreen ? 20 : 24}
          animation="wave"
          sx={skeletonStyles}
          data-oid="vrd9l_a"
        />
        <Box sx={{ display: "flex", gap: 1 }} data-oid="4on2d:d">
          <Skeleton
            variant="circular"
            width={isSmallScreen ? 24 : 28}
            height={isSmallScreen ? 24 : 28}
            animation="wave"
            sx={skeletonStyles}
            data-oid="nnpw410"
          />
          <Skeleton
            variant="circular"
            width={isSmallScreen ? 24 : 28}
            height={isSmallScreen ? 24 : 28}
            animation="wave"
            sx={skeletonStyles}
            data-oid="vftxow2"
          />
          <Skeleton
            variant="circular"
            width={isSmallScreen ? 24 : 28}
            height={isSmallScreen ? 24 : 28}
            animation="wave"
            sx={skeletonStyles}
            data-oid="j9gw6l3"
          />
          <Skeleton
            variant="circular"
            width={isSmallScreen ? 24 : 28}
            height={isSmallScreen ? 24 : 28}
            animation="wave"
            sx={skeletonStyles}
            data-oid="yi_v9_-"
          />
        </Box>
      </Box>

      {/* 文档内容 - 单个大框 */}
      <Box
        sx={{
          flex: 1,
          p: 0,
          position: "relative",
          overflow: "hidden",
        }}
        data-oid=":hcb41x"
      >
        <Skeleton
          variant="rectangular"
          width="100%"
          height="100%"
          animation="wave"
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 0,
            ...skeletonStyles,
          }}
          data-oid="-_seb0v"
        />
      </Box>
    </Box>
  );
};
