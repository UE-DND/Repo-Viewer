import React, { memo } from "react";
import {
  Box,
  CircularProgress,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";

interface LoadingSpinnerProps {
  message?: string;
  isSmallScreen: boolean;
  fullHeight?: boolean;
}

const LoadingSpinner = memo<LoadingSpinnerProps>(
  ({ message = "加载中...", isSmallScreen, fullHeight = false }) => {
    // 使用useTheme钩子获取主题
    const theme = useTheme();

    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          height: fullHeight ? "100%" : "auto",
          minHeight: fullHeight ? "60vh" : "200px",
          p: 4,
        }}
        data-oid="ygnuy3y"
      >
        <CircularProgress
          color="primary"
          size={isSmallScreen ? 32 : 40}
          sx={{ mb: 2 }}
          data-oid="v-vl.mu"
        />

        {message && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              textAlign: "center",
              maxWidth: "300px",
              fontSize: { xs: "0.8rem", sm: "0.875rem" },
            }}
            data-oid=".x07k0m"
          >
            {message}
          </Typography>
        )}
      </Box>
    );
  },
);

// 添加显示名称以便调试
LoadingSpinner.displayName = "LoadingSpinner";

export default LoadingSpinner;
