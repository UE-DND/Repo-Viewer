import React from "react";
import {
  Typography,
  Button,
  alpha,
  useTheme,
} from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import RefreshIcon from "@mui/icons-material/Refresh";

interface ImageErrorDisplayProps {
  imgSrc: string;
  onRetry: () => void;
}

export const ImageErrorDisplay: React.FC<ImageErrorDisplayProps> = ({
  imgSrc,
  onRetry,
}) => {
  const theme = useTheme();

  return (
    <div
      style={{
        position: "relative",
        margin: "1em 0",
        border: `1px dashed ${theme.palette.error.main}`,
        borderRadius: "4px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100px",
        backgroundColor: alpha(theme.palette.error.main, 0.05),
      }}
      data-oid="jygfg5b"
    >
      <ErrorOutlineIcon
        color="error"
        style={{ fontSize: 40, marginBottom: 8 }}
        data-oid="g5glf05"
      />
      <Typography
        variant="body2"
        color="error"
        gutterBottom
        data-oid="wwi58v_"
      >
        图片加载失败
      </Typography>
      <Typography
        variant="caption"
        color="textSecondary"
        style={{
          maxWidth: "90%",
          wordBreak: "break-all",
          textAlign: "center",
          marginBottom: 8,
        }}
        data-oid="dcz6qln"
      >
        {imgSrc || "未知图片路径"}
      </Typography>
      <Button
        startIcon={<RefreshIcon data-oid="d5-tho9" />}
        size="small"
        variant="outlined"
        color="primary"
        onClick={onRetry}
        data-oid="e12fctp"
      >
        重试加载
      </Button>
    </div>
  );
};