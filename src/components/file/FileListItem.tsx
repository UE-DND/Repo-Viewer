import React, { memo } from "react";
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  Typography,
  Box,
  Tooltip,
  IconButton,
  CircularProgress,
  alpha,
  useTheme,
} from "@mui/material";
import {
  Folder as FolderIcon,
  Download as DownloadIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";

// 导入必要的变量和函数
import { getFileIcon, logger } from "../../utils";
import { GitHubContent } from "../../types";

import { getFeaturesConfig } from '../../config';

// 从统一配置获取配置
const featuresConfig = getFeaturesConfig();
const HOMEPAGE_FILTER_ENABLED = featuresConfig.homepageFilter.enabled;
const HOMEPAGE_ALLOWED_FOLDERS = featuresConfig.homepageFilter.allowedFolders;
const HIDE_MAIN_FOLDER_DOWNLOAD = featuresConfig.hideDownload.enabled; 
const HIDE_DOWNLOAD_FOLDERS = featuresConfig.hideDownload.hiddenFolders;

interface FileListItemProps {
  item: GitHubContent;
  downloadingPath: string | null;
  downloadingFolderPath: string | null;
  folderDownloadProgress: number;
  handleItemClick: (item: GitHubContent) => void;
  handleDownloadClick: (e: React.MouseEvent, item: GitHubContent) => void;
  handleFolderDownloadClick: (e: React.MouseEvent, item: GitHubContent) => void;
  handleCancelDownload: (e: React.MouseEvent) => void;
  currentPath: string;
  contents?: GitHubContent[];
}

// 使用memo来优化FileListItem组件，避免不必要的重复渲染
const FileListItem = memo<FileListItemProps>(
  ({
    item,
    downloadingPath,
    downloadingFolderPath,
    folderDownloadProgress,
    handleItemClick,
    handleDownloadClick,
    handleFolderDownloadClick,
    handleCancelDownload,
    currentPath,
    contents = [], // 提供默认空数组值
  }) => {
    // 使用useTheme代替直接传递theme
    const theme = useTheme();

    const isDownloading = downloadingPath === item.path;
    const isFolderDownloading = downloadingFolderPath === item.path;
    const isItemDownloading = isDownloading || isFolderDownloading;

    // 优化：缓存图标组件的引用
    const IconComponent = React.useMemo(() => {
      return item.type === "dir" ? FolderIcon : getFileIcon(item.name);
    }, [item.type, item.name]);

    // 检查是否是首页文件夹（用于显示过滤）
    const isMainFolder =
      currentPath === "" &&
      item.type === "dir" &&
      HOMEPAGE_FILTER_ENABLED &&
      HOMEPAGE_ALLOWED_FOLDERS.includes(item.name);

    // 检查是否需要隐藏下载按钮（独立逻辑）
    const shouldHideDownloadButton = React.useMemo(() => {
      return (
        currentPath === "" &&
        item.type === "dir" &&
        HIDE_MAIN_FOLDER_DOWNLOAD &&
        HIDE_DOWNLOAD_FOLDERS.includes(item.name)
      );
    }, [currentPath, item.type, item.name]);

    // 记录调试信息 - 仅在开发模式下执行
    React.useEffect(() => {
      if (import.meta.env.DEV) {
        if (currentPath === "" && item.type === "dir") {
          logger.debug(
            `首页文件夹 ${item.name}: 是主文件夹=${isMainFolder}, 隐藏下载按钮=${shouldHideDownloadButton}`,
          );
        }
      }
    }, [
      currentPath,
      item.type,
      item.name,
      isMainFolder,
      shouldHideDownloadButton,
    ]);

    // 判断是否禁用涟漪效果（针对大列表优化）
    const { disableRipple, disableTouchRipple } = React.useMemo(() => {
      const windowWidth = window.innerWidth;
      const contentLength = contents.length;
      return {
        disableRipple: windowWidth < 768 && contentLength > 50,
        disableTouchRipple: windowWidth < 768 && contentLength > 100,
      };
    }, [contents.length]);

    // 点击处理函数，避免每次渲染都创建新函数
    const handleFileItemClick = React.useCallback(() => {
      handleItemClick(item);
    }, [handleItemClick, item]);

    const handleFileDownloadClick = React.useCallback(
      (e: React.MouseEvent) => {
        handleDownloadClick(e, item);
      },
      [handleDownloadClick, item],
    );

    const handleFileFolderDownloadClick = React.useCallback(
      (e: React.MouseEvent) => {
        handleFolderDownloadClick(e, item);
      },
      [handleFolderDownloadClick, item],
    );

    const onCancelDownload = React.useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        handleCancelDownload(e);
      },
      [handleCancelDownload],
    );

    return (
      <ListItem
        disablePadding
        sx={{
          overflow: "visible",
          width: "100%",
          position: "relative",
          minHeight: { xs: "40px", sm: "48px" },
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center" /* 居中ListItem内的内容 */,
        }}
        secondaryAction={
          !shouldHideDownloadButton ? (
            <Tooltip
              title={
                isItemDownloading
                  ? "取消下载"
                  : item.type === "file"
                    ? `下载 ${item.name}`
                    : `下载文件夹 ${item.name}`
              }
              disableInteractive
              placement="left"
              enterDelay={300}
              leaveDelay={0}
              componentsProps={{
                tooltip: {
                  sx: {
                    bgcolor: "background.paper",
                    color: "text.primary",
                    boxShadow: 3,
                    borderRadius: 2,
                    p: 1.5,
                    border: "1px solid",
                    borderColor: "divider",
                    fontWeight: 500,
                    fontSize: { xs: "0.7rem", sm: "0.75rem" },
                  },
                },
              }}
              data-oid="53unr1g"
            >
              <span
                style={{
                  display: "inline-block",
                  cursor: "pointer",
                  position: "absolute",
                  right: "16px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 2,
                }}
                data-oid="p5-7:mp"
              >
                <IconButton
                  className={
                    isItemDownloading ? "cancel-button" : "download-button"
                  }
                  edge="end"
                  aria-label={
                    isItemDownloading
                      ? "cancel download"
                      : item.type === "file"
                        ? "download file"
                        : "download folder"
                  }
                  onClick={
                    isItemDownloading
                      ? onCancelDownload
                      : item.type === "file"
                        ? handleFileDownloadClick
                        : handleFileFolderDownloadClick
                  }
                  sx={{
                    position: "relative",
                    padding: { xs: 1, sm: 1.5 },
                    color: isItemDownloading ? "error.main" : "inherit",
                  }}
                  data-oid="bwl9ig-"
                >
                  {isItemDownloading ? (
                    <Box
                      sx={{ position: "relative", display: "inline-flex" }}
                      data-oid="02vmy6b"
                    >
                      <CircularProgress
                        size={20}
                        variant={
                          isFolderDownloading && folderDownloadProgress > 0
                            ? "determinate"
                            : "indeterminate"
                        }
                        value={folderDownloadProgress}
                        color="error"
                        data-oid="0oqwaa-"
                      />

                      <Box
                        sx={{
                          top: 0,
                          left: 0,
                          bottom: 0,
                          right: 0,
                          position: "absolute",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        data-oid="g-4-y6c"
                      >
                        <CancelIcon
                          fontSize="small"
                          sx={{ fontSize: "0.8rem", color: "error.main" }}
                          data-oid="6_m3uc-"
                        />
                      </Box>
                    </Box>
                  ) : (
                    <DownloadIcon fontSize="small" data-oid="9-.24f5" />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          ) : null
        }
        data-oid=".a2fg5_"
      >
        <ListItemButton
          onClick={handleFileItemClick}
          disabled={isDownloading || isFolderDownloading}
          disableRipple={disableRipple}
          disableTouchRipple={disableTouchRipple}
          sx={{
            borderRadius: 2, // 与外部容器保持一致的圆角
            transition:
              "transform 0.1s ease-in-out, background-color 0.1s ease-in-out, box-shadow 0.1s ease-in-out",
            "&:hover": {
              transform: "translateX(3px)",
              backgroundColor: alpha(theme.palette.primary.main, 0.04),
              boxShadow: `-1px 2px 3px ${alpha(theme.palette.common.black, 0.1)}`,
            },
            pr: { xs: 7, sm: 9 },
            py: { xs: 0.75, sm: 1.25 },
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "flex-start", sm: "center" },
            flex: 1,
            mx: "auto" /* 确保水平居中 */,
            position: "relative",
            willChange: "transform, background-color",
            transform: "translateZ(0)",
          }}
          data-oid="y0qdjig"
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              width: "100%",
              minWidth: 0,
              py: { xs: 0.25, sm: 0.5 },
            }}
            data-oid=".58zkds"
          >
            <ListItemIcon
              sx={{
                minWidth: { xs: "32px", sm: "40px" },
                mt: "2px",
                mr: { xs: 1, sm: 1.5 },
              }}
              data-oid=":ewe_8t"
            >
              <IconComponent
                sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }}
                data-oid="ekhgl12"
              />
            </ListItemIcon>
            <Typography
              variant="body2"
              noWrap
              sx={{
                fontSize: { xs: "0.8rem", sm: "0.875rem" },
                fontWeight: 400,
                color: theme.palette.text.primary,
                width: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                display: "block",
              }}
              data-oid="al5kw84"
            >
              {item.name}
            </Typography>
          </Box>
        </ListItemButton>
      </ListItem>
    );
  },
);

FileListItem.displayName = "FileListItem";

export default FileListItem;
