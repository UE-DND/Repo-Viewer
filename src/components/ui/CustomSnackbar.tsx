import React, { forwardRef, memo } from "react";
import {
  Alert,
  AlertTitle,
  Box,
  IconButton,
  LinearProgress,
  alpha,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useSnackbar } from "notistack";
import type { CustomContentProps } from "notistack";
import { eventEmitter, EVENTS } from "@/utils/events/eventEmitter";
import { g3BorderRadius, G3_PRESETS } from "@/theme/g3Curves";

/**
 * 自定义通知组件属性接口
 */
interface CustomSnackbarProps extends CustomContentProps {
  progress?: number;
}

/**
 * 自定义通知组件
 * 
 * 提供增强的通知UI，支持进度显示和自定义样式。
 */
const CustomSnackbar = memo(
  forwardRef<HTMLDivElement, CustomSnackbarProps>(
    ({ id, message, variant, progress }, ref) => {
      const { closeSnackbar } = useSnackbar();

      const handleDismiss = (): void => {
        if (isDownloadRelated()) {
          eventEmitter.dispatch(EVENTS.CANCEL_DOWNLOAD, { downloadId: String(id) });
        }
        closeSnackbar(id);
      };

      const severity = variant === "default" ? "info" : variant;
      const title =
        variant === "success"
          ? "成功"
          : variant === "error"
            ? "错误"
            : variant === "warning"
              ? "警告"
              : "信息";

      const isDownloadRelated = (): boolean => {
        if (
          variant === "success" &&
          typeof message === "string" &&
          message.includes("下载成功")
        ) {
          return false;
        }

        if (progress !== undefined && progress >= 0) {
          return true;
        }

        if (React.isValidElement(message)) {
          const hasProgressBar = (node: React.ReactNode): boolean => {
            if (!React.isValidElement(node)) {
              return false;
            }

            if (node.type === LinearProgress) {
              return true;
            }

            const { children } = node.props as { children?: React.ReactNode };

            if (children === null || children === undefined) {
              return false;
            }

            if (Array.isArray(children)) {
              return children.some(hasProgressBar);
            }

            return hasProgressBar(children);
          };

          return hasProgressBar(message);
        }

        if (
          typeof message === "string" &&
          (message.includes("下载") || message.includes("准备"))
        ) {
          return !message.includes("下载成功");
        }

        return false;
      };

      return (
        <Alert
          ref={ref}
          severity={severity}
          variant="filled"
          sx={{
            width: { xs: "90%", sm: "auto" },
            margin: { xs: "auto", sm: "initial" },
            minWidth: { sm: "344px" },
            alignItems: "center",
            borderRadius: g3BorderRadius(G3_PRESETS.card),
          }}
          action={
            isDownloadRelated() ? (
              <IconButton
                size="small"
                color="inherit"
                onClick={handleDismiss}
                data-oid="b8064jp"
              >
                <CloseIcon fontSize="small" data-oid="x-n8pii" />
              </IconButton>
            ) : null
          }
          data-oid=".slx-sd"
        >
          <AlertTitle sx={{ fontWeight: 500 }} data-oid="hfm3m:r">
            {title}
          </AlertTitle>
          <Box sx={{ width: "100%" }} data-oid="r4:ptg2">
            {message}
            {progress !== undefined && progress >= 0 && (
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  mt: 1,
                  height: 6,
                  borderRadius: g3BorderRadius(G3_PRESETS.button),
                  backgroundColor: (theme) =>
                    alpha(theme.palette.common.white, 0.3),
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: (theme) => theme.palette.common.white,
                  },
                }}
                data-oid="1g6mk45"
              />
            )}
          </Box>
        </Alert>
      );
    },
  ),
);

CustomSnackbar.displayName = "CustomSnackbar";

export default CustomSnackbar;
