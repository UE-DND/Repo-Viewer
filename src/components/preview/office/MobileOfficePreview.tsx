import React from "react";
import {
  Box,
  Typography,
  useTheme,
  IconButton,
  Button,
  Tooltip,
  alpha,
  Paper,
} from "@mui/material";
import { g3BorderRadius, G3_PRESETS } from "@/theme/g3Curves";
import type { OfficePreviewProps } from "./types";
import {
  Close as CloseIcon,
  Fullscreen as FullscreenIcon,
  Download as DownloadIcon,
  Info as InfoIcon,
} from "@mui/icons-material";
import { getFileTypeName, generatePreviewUrl } from './utils';

type MobileOfficePreviewProps = OfficePreviewProps;

const MobileOfficePreview: React.FC<MobileOfficePreviewProps> = ({
  fileUrl,
  fileType,
  fileName,
  onClose,
  className,
  style,
}) => {
  const theme = useTheme();

  // 处理下载文件
  const handleDownload = (): void => {
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = fileName;
    a.target = "_blank";
    a.click();
  };

  // 在新窗口中打开
  const handleOpenInNewWindow = (): void => {
    const previewUrl = generatePreviewUrl(fileUrl);
    window.open(previewUrl, "_blank");
  };

  const containerClassName = [
    typeof className === "string" && className.trim().length > 0 ? className : null,
    `${fileType}-preview-container`,
  ]
    .filter((value): value is string => value !== null)
    .join(" ");

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        bgcolor: theme.palette.mode === "dark" ? "#1a1a1a" : "#f5f5f5",
        borderRadius: g3BorderRadius(G3_PRESETS.card),
      }}
      style={style}
      className={containerClassName}
      data-oid="d6q8zg3"
    >
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
          backdropFilter: "blur(8px)",
        }}
        data-oid="adr-8nq"
      >
        <Typography
          variant="subtitle1"
          noWrap
          sx={{ flex: 1 }}
          data-oid="ootqlv8"
        >
          {fileName}
        </Typography>

        {typeof onClose === "function" ? (
          <Tooltip title="关闭" data-oid="xx6ol5c">
            <IconButton
              onClick={onClose}
              size="small"
              aria-label="关闭"
              sx={{
                bgcolor: alpha(theme.palette.error.main, 0.1),
                color: theme.palette.error.main,
                "&:hover": {
                  bgcolor: alpha(theme.palette.error.main, 0.2),
                },
              }}
              data-oid="dkhvy9a"
            >
              <CloseIcon fontSize="small" data-oid="tgccf_d" />
            </IconButton>
          </Tooltip>
        ) : null}
      </Box>

      {/* 移动端提示界面 */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
          gap: 3,
        }}
        data-oid="vf0oxp8"
      >
        <Paper
          elevation={2}
          sx={{
            p: 3,
            maxWidth: "90%",
            width: "100%",
            textAlign: "center",
            bgcolor: alpha(theme.palette.info.main, 0.05),
            border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
          }}
          data-oid="ey75mwy"
        >
          <InfoIcon
            color="info"
            sx={{ fontSize: 48, mb: 2 }}
            data-oid="6s2c4yf"
          />

          <Typography variant="h6" gutterBottom data-oid="fw1fx83">
            移动设备暂不支持{getFileTypeName(fileType)}在线预览
          </Typography>

          <Typography variant="body2" sx={{ mb: 3 }} data-oid="_hrenso">
            由于移动设备的限制，无法直接在应用内预览{getFileTypeName(fileType)}文档。
            您可以选择在浏览器中打开或下载文件后查看。
          </Typography>

          <Box
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
            data-oid="54i-p:q"
          >
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={handleOpenInNewWindow}
              startIcon={<FullscreenIcon data-oid="qmy:4p8" />}
              data-oid="3t_-_z3"
            >
              在浏览器中打开
            </Button>

            <Button
              variant="outlined"
              color="primary"
              fullWidth
              onClick={handleDownload}
              startIcon={<DownloadIcon data-oid="kwepvf1" />}
              data-oid="-vl1:gq"
            >
              下载文件
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default MobileOfficePreview;
