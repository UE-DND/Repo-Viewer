import React from "react";
import {
  Box,
  Skeleton,
  useTheme,
  alpha,
} from "@mui/material";
import { getSkeletonStyles, getContainerTransitionStyles, useSkeletonVisibility } from "./shared";
import { g3BorderRadius, G3_PRESETS } from "@/theme/g3Curves";

// 图片预览骨架屏
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
      {/* 标题 */}
      {!isSmallScreen && (
        <Box
          sx={{
            py: 1.5,
            px: 2,
            textAlign: "center",
            bgcolor:
              theme.palette.mode === "dark"
                ? "rgba(0,0,0,0.4)"
                : "rgba(255,255,255,0.8)",
            backdropFilter: "blur(8px)",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
          data-oid="o49p_ga"
        >
          <Skeleton
            variant="text"
            width="40%"
            height={28}
            animation="wave"
            sx={{ mx: "auto", ...skeletonStyles }}
            data-oid="70ox67l"
          />
        </Box>
      )}

      {/* 图片区域 */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          position: "relative",
          pb: "72px",
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

      {/* 控制按钮 - 更新为固定位置的底部栏 */}
      <Box
        sx={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 2,
          p: 1.5,
          height: "72px",
          bgcolor:
            theme.palette.mode === "dark"
              ? alpha(theme.palette.background.paper, 0.7)
              : alpha(theme.palette.background.paper, 0.8),
          backdropFilter: "blur(10px)",
          borderTop: "1px solid",
          borderColor: alpha(theme.palette.divider, 0.1),
          boxShadow:
            theme.palette.mode === "dark"
              ? "0 -4px 12px rgba(0,0,0,0.2)"
              : "0 -4px 12px rgba(0,0,0,0.1)",
        }}
        data-oid="2jqrv4."
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 2,
            width: "100%",
          }}
          data-oid="xd2656s"
        >
          <Skeleton
            variant="circular"
            width={isSmallScreen ? 40 : 48}
            height={isSmallScreen ? 40 : 48}
            animation="wave"
            sx={skeletonStyles}
            data-oid="p0p5ax3"
          />
          <Skeleton
            variant="rectangular"
            width={isSmallScreen ? 64 : 80}
            height={isSmallScreen ? 40 : 48}
            animation="wave"
            sx={{ borderRadius: g3BorderRadius(G3_PRESETS.button), ...skeletonStyles }}
            data-oid="4d6i3x4"
          />

          <Skeleton
            variant="circular"
            width={isSmallScreen ? 40 : 48}
            height={isSmallScreen ? 40 : 48}
            animation="wave"
            sx={skeletonStyles}
            data-oid="d2rxw9g"
          />
        </Box>
      </Box>
    </Box>
  );
};
