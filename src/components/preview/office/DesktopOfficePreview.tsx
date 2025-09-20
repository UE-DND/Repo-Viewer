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
import {
  Close as CloseIcon,
  Fullscreen as FullscreenIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";
import { OfficePreviewSkeleton } from "../../ui/skeletons";
import { OfficePreviewProps } from './types';
import { getFileTypeName, generatePreviewUrl } from './utils';
import { IFRAME_LOAD_TIMEOUT, SKELETON_EXIT_TIMEOUT } from './constants';

interface DesktopOfficePreviewProps extends OfficePreviewProps {}

/**
 * 桌面端Office文档预览组件
 * 使用iframe嵌入微软Office在线预览服务
 */
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
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingRef = useRef<boolean>(true);
  const isIframeLoadedRef = useRef(false);

  // 获取实际使用的预览URL
  const actualPreviewUrl = generatePreviewUrl(fileUrl, useBackupPreview);

  // 更新loadingRef以反映当前的loading状态
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  // iframe加载事件处理
  const handleIframeLoad = useCallback(() => {
    console.log(`${getFileTypeName(fileType)}预览iframe加载完成:`, actualPreviewUrl);
    console.log("当前加载状态:", loading);
    isIframeLoadedRef.current = true;
    setLoading(false);
    console.log("已设置加载状态为 false");
  }, [actualPreviewUrl, fileType, loading]);

  // 添加 useEffect 钩子检查 iframe 加载状态
  useEffect(() => {
    if (isIframeLoadedRef.current) {
      console.log("iframe 已加载，确保 loading 状态为 false");
      setLoading(false);
    }

    return () => {
      // 当 URL 变化时重置加载状态引用
      if (refreshKey > 0) {
        isIframeLoadedRef.current = false;
      }
    };
  }, [refreshKey]);

  // 添加强制退出骨架屏的超时处理
  useEffect(() => {
    // 如果正在加载，设置一个超时处理
    if (loading) {
      const timeoutId = setTimeout(() => {
        console.log("强制退出骨架屏：超时");
        setLoading(false);
      }, SKELETON_EXIT_TIMEOUT);

      return () => clearTimeout(timeoutId);
    }
    
    // 如果不在loading状态，返回空清理函数
    return () => {};
  }, [loading]);

  // 处理iframe加载错误
  const handleIframeError = useCallback(() => {
    console.error(`${getFileTypeName(fileType)}预览iframe加载失败:`, actualPreviewUrl);

    // 如果主预览失败但还未尝试备用预览，切换到备用预览
    if (!useBackupPreview && !triedBackup) {
      console.log("尝试使用备用预览方式");
      setUseBackupPreview(true);
      setTriedBackup(true);
      setLoading(true);
      return;
    }

    // 如果备用预览也失败，显示错误
    console.error(`${getFileTypeName(fileType)}预览所有方式都失败`);
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
    // 重置状态
    setLoading(true);
    setError(null);

    // 清除之前的超时计时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 设置超时检测
    timeoutRef.current = setTimeout(() => {
      // 如果仍在加载状态
      if (loadingRef.current) {
        console.log("预览加载超时");
        setError("加载预览超时，请尝试使用下载按钮下载文件");
        setLoading(false);
      }
    }, IFRAME_LOAD_TIMEOUT);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [fileUrl, refreshKey]);

  // 在渲染部分使用骨架屏
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
        borderRadius: 1,
      }}
      style={style}
      className={`${className} ${fileType}-preview-container`}
      data-oid=":ag4zt-"
    >
      {/* 标题栏和工具栏 */}
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

          {onClose && (
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
          )}
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
        {error ? (
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
            key={`iframe-${fileType}-${refreshKey}-${useBackupPreview ? "backup" : "main"}`}
            data-oid="gtas:rh"
          />
        )}
      </Box>
    </Box>
  );
};

export default DesktopOfficePreview;