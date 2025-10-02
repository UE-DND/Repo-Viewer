import React, { useState, useEffect, useRef, useCallback } from "react";
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
import {
  Close as CloseIcon,
  Fullscreen as FullscreenIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";
import { OfficePreviewSkeleton } from "@/components/ui/skeletons";
import type { OfficePreviewProps } from "./types";
import { getFileTypeName, generatePreviewUrl } from './utils';
import { IFRAME_LOAD_TIMEOUT, SKELETON_EXIT_TIMEOUT } from './constants';
import { logger } from '@/utils';

type DesktopOfficePreviewProps = OfficePreviewProps;

const DesktopOfficePreview: React.FC<DesktopOfficePreviewProps> = ({
  fileUrl,
  fileType,
  fileName,
  onClose,
  className,
  style,
}) => {
  const theme = useTheme();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [useBackupPreview, setUseBackupPreview] = useState<boolean>(false);
  const [triedBackup, setTriedBackup] = useState<boolean>(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<number | null>(null);
  const loadingRef = useRef<boolean>(true);
  const isIframeLoadedRef = useRef(false);

  const actualPreviewUrl = generatePreviewUrl(fileUrl, useBackupPreview);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);
  const handleIframeLoad = useCallback(() => {
    logger.info(`${getFileTypeName(fileType)}预览iframe加载完成:`, actualPreviewUrl);
    logger.debug("当前加载状态:", loading);
    isIframeLoadedRef.current = true;
    setLoading(false);
    logger.debug("已设置加载状态为 false");
  }, [actualPreviewUrl, fileType, loading]);

  useEffect(() => {
    if (isIframeLoadedRef.current) {
      logger.debug("iframe 已加载，确保 loading 状态为 false");
      setLoading(false);
    }

    return () => {
      if (refreshKey > 0) {
        isIframeLoadedRef.current = false;
      }
    };
  }, [refreshKey]);

  useEffect(() => {
    if (!loading) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      logger.warn("强制退出骨架屏：超时");
      setLoading(false);
    }, SKELETON_EXIT_TIMEOUT);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loading]);

  const handleIframeError = useCallback(() => {
    logger.error(`${getFileTypeName(fileType)}预览iframe加载失败:`, actualPreviewUrl);

    if (!useBackupPreview && !triedBackup) {
      logger.info("尝试使用备用预览方式");
      setUseBackupPreview(true);
      setTriedBackup(true);
      setLoading(true);
      return;
    }

    logger.error(`${getFileTypeName(fileType)}预览所有方式都失败`);
    setError(
      `无法加载${getFileTypeName(fileType)}文档预览，可能是网络问题导致无法访问微软预览服务`,
    );
    setLoading(false);
  }, [useBackupPreview, triedBackup, actualPreviewUrl, fileType]);

  // 刷新预览
  const handleRefresh = useCallback(() => {
    setLoading(true);
    setError(null);
    setRefreshKey((prev) => prev + 1);
  }, []);

  // 处理下载文件
  const handleDownload = useCallback(() => {
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = fileName;
    a.target = "_blank";
    a.click();
  }, [fileUrl, fileName]);

  // 在新窗口中打开
  const handleOpenInNewWindow = useCallback(() => {
    const previewUrl = generatePreviewUrl(fileUrl);
    window.open(previewUrl, "_blank");
  }, [fileUrl]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      if (loadingRef.current) {
        logger.warn("预览加载超时");
        setError("加载预览超时，请尝试使用下载按钮下载文件");
        setLoading(false);
      }
    }, IFRAME_LOAD_TIMEOUT);

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [fileUrl, refreshKey]);

  const containerClassName = [
    typeof className === "string" && className.trim().length > 0 ? className : null,
    `${fileType}-preview-container`
  ]
    .filter((value): value is string => value !== null)
    .join(" ");

  if (loading) {
    return (
      <OfficePreviewSkeleton isSmallScreen={false} data-oid=":hn6lc1" />
    );
  }

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
      data-oid=":ag4zt-"
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
        data-oid="hxfyt6h"
      >
        <Typography
          variant="subtitle1"
          noWrap
          sx={{ flex: 1 }}
          data-oid="zhl9r6m"
        >
          {fileName}
        </Typography>

        <Box sx={{ display: "flex", gap: 1 }} data-oid="qsn6ka6">
          <Tooltip title="刷新" data-oid="1egra:v">
            <IconButton
              onClick={handleRefresh}
              size="small"
              aria-label="刷新"
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                "&:hover": {
                  bgcolor: alpha(theme.palette.primary.main, 0.2),
                },
              }}
              data-oid="2j2-ue7"
            >
              <RefreshIcon fontSize="small" data-oid="_e7ub-d" />
            </IconButton>
          </Tooltip>

          <Tooltip title="下载文件" data-oid="_mftks4">
            <IconButton
              onClick={handleDownload}
              size="small"
              aria-label="下载文件"
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                "&:hover": {
                  bgcolor: alpha(theme.palette.primary.main, 0.2),
                },
              }}
              data-oid="tnszat5"
            >
              <DownloadIcon fontSize="small" data-oid="96tgpvu" />
            </IconButton>
          </Tooltip>

          <Tooltip title="在新标签页打开" data-oid=":z1ck50">
            <IconButton
              onClick={handleOpenInNewWindow}
              size="small"
              aria-label="在新标签页打开"
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                "&:hover": {
                  bgcolor: alpha(theme.palette.primary.main, 0.2),
                },
              }}
              data-oid="4t84717"
            >
              <FullscreenIcon fontSize="small" data-oid="b06.1a1" />
            </IconButton>
          </Tooltip>

          {typeof onClose === "function" ? (
            <Tooltip title="关闭" data-oid="8zq5ing">
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
                data-oid="va:d1:1"
              >
                <CloseIcon fontSize="small" data-oid="se24oz7" />
              </IconButton>
            </Tooltip>
          ) : null}
        </Box>
      </Box>

      {/* 内容区域 */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
        data-oid=":p2y7md"
      >
        {error !== null ? (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 20,
              bgcolor: theme.palette.mode === "dark" ? "#1a1a1a" : "#f5f5f5",
              p: 3,
            }}
            data-oid="iv9ai67"
          >
            <Paper
              elevation={2}
              sx={{
                p: 4,
                maxWidth: "400px",
                width: "100%",
                textAlign: "center",
                bgcolor: alpha(theme.palette.error.main, 0.05),
                border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
              }}
              data-oid="z_ck2m_"
            >
              <Typography
                variant="h6"
                color="error"
                gutterBottom
                data-oid="sq5wafn"
              >
                预览加载失败
              </Typography>
              <Typography variant="body2" data-oid="_s1vt7y">
                {error}
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  mt: 2,
                  width: "100%",
                  justifyContent: "center",
                }}
                data-oid="55mfg3n"
              >
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleRefresh}
                  startIcon={<RefreshIcon data-oid="h0oyq:-" />}
                  data-oid="7cumc.y"
                >
                  重试
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleDownload}
                  startIcon={<DownloadIcon data-oid="rsniu.r" />}
                  data-oid="rpxx1p2"
                >
                  下载文件
                </Button>
              </Box>
            </Paper>
          </Box>
        ) : (
          <iframe
            ref={iframeRef}
            src={`${actualPreviewUrl}#view=fitH`}
            title={`${fileName} 预览`}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              display: "block",
            }}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            key={`iframe-${fileType}-${String(refreshKey)}-${useBackupPreview ? "backup" : "main"}`}
            data-oid="gtas:rh"
          />
        )}
      </Box>
    </Box>
  );
};

export default DesktopOfficePreview;
