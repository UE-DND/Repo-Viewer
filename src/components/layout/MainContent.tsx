import React, { useRef, useState, useEffect, useMemo } from "react";
import {
  Container,
  useTheme,
  useMediaQuery,
  Box,
  Typography,
} from "@mui/material";
import BreadcrumbNavigation from "./BreadcrumbNavigation";
import FileList from "../file/FileList";
import MarkdownPreview from "../preview/MarkdownPreview";
import ImagePreview from "../preview/ImagePreview";
import OfficePreview from "../preview/OfficePreview";
import ErrorDisplay from "../ui/ErrorDisplay";
import FullScreenPreview from "../file/FullScreenPreview";
import { 
  useContentContext, 
  usePreviewContext, 
  useDownloadContext,
  NavigationDirection
} from "../../contexts/unified";
import { FileListSkeleton } from "../ui/skeletons";
import { getPreviewFromUrl } from "../../utils/routing/urlManager";
import { logger } from "../../utils";
import DynamicSEO from "../seo/DynamicSEO";
import ScrollToTopFab from "../interactions/ScrollToTopFab";
import EmptyState from "../ui/EmptyState";

const MainContent: React.FC = () => {
  // 获取主题和响应式布局
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  // 创建引用
  const breadcrumbsContainerRef = useRef<HTMLDivElement>(null);
  // PDF 预览已改为浏览器原生新标签页打开，不再需要 PDF 容器引用

  // 自动计算面包屑最大项目数
  const [breadcrumbsMaxItems, setBreadcrumbsMaxItems] = useState<number>(0); // 0表示不限制

  // 从上下文获取数据和方法
  const {
    currentPath,
    contents,
    readmeContent,
    loading,
    loadingReadme,
    readmeLoaded,
    error,
    handleRetry,
    navigateTo,
    repoOwner,
    repoName,
  } = useContentContext();

  const {
    previewState,
    selectFile,
    closePreview,
    currentPreviewItemRef,
  } = usePreviewContext();

  const {
    downloadState,
    downloadFile,
    downloadFolder,
    cancelDownload,
  } = useDownloadContext();

  // 检测当前目录中是否有README.md文件
  const hasReadmeFile = useMemo(() => {
    if (!Array.isArray(contents) || contents.length === 0) return false;

    // 检查是否有任何名称为README.md的文件（不区分大小写）
    return contents.some((item) => {
      if (!item || typeof item.name !== "string") return false;
      const fileName = item.name.toLowerCase();
      return fileName === "readme.md" || fileName === "readme.markdown";
    });
  }, [contents]);

  // 生成面包屑导航路径段
  const generateBreadcrumbSegments = () => {
    const segments = [{ name: "Home", path: "" }];

    if (currentPath) {
      const pathParts = currentPath.split("/");
      let currentSegmentPath = "";

      for (let i = 0; i < pathParts.length; i++) {
        currentSegmentPath += (i === 0 ? "" : "/") + pathParts[i];
        segments.push({
          name: pathParts[i] || "",
          path: currentSegmentPath,
        });
      }
    }

    return segments;
  };

  const breadcrumbSegments = generateBreadcrumbSegments();

  // 处理面包屑点击
  const handleBreadcrumbClick = (
    path: string,
    direction: NavigationDirection = "backward",
  ) => {
    navigateTo(path, direction);
  };

  // 处理文件/文件夹点击
  const handleItemClick = (item: any) => {
    if (item.type === "dir") {
      navigateTo(item.path, "forward");
    } else {
      selectFile(item);
    }
  };

  // 处理下载点击
  const handleDownloadClick = (e: React.MouseEvent, item: any) => {
    e.preventDefault();
    e.stopPropagation();
    downloadFile(item);
  };

  // 处理文件夹下载点击
  const handleFolderDownloadClick = (e: React.MouseEvent, item: any) => {
    e.preventDefault();
    e.stopPropagation();
    downloadFolder(item.path, item.name);
  };

  // 处理取消下载点击
  const handleCancelDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    cancelDownload();
  };


  // 自动调整面包屑显示
  useEffect(() => {
    const breadcrumbSegments = generateBreadcrumbSegments();

    // 在移动端，使用更激进的折叠策略
    if (isSmallScreen) {
      // 路径段数超过3个时，在移动端强制折叠
      if (breadcrumbSegments.length > 3) {
        setBreadcrumbsMaxItems(3);
      } else {
        setBreadcrumbsMaxItems(0); // 少于或等于3个时不折叠
      }
      return;
    }

    // 桌面端逻辑
    // 如果面包屑项目少于或等于3个，不需要限制
    if (breadcrumbSegments.length <= 3) {
      setBreadcrumbsMaxItems(0); // 0表示不限制
      return;
    }

    // 创建ResizeObserver监听容器尺寸变化
    const resizeObserver = new ResizeObserver(() => {
      if (!breadcrumbsContainerRef.current) return;

      // 如果路径太长（超过8段），则设置合理的限制
      if (breadcrumbSegments.length > 8) {
        setBreadcrumbsMaxItems(8);
        return;
      }

      // 不限制项目数量，使用CSS处理溢出
      setBreadcrumbsMaxItems(0);
    });

    if (breadcrumbsContainerRef.current) {
      resizeObserver.observe(breadcrumbsContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [currentPath, isSmallScreen, generateBreadcrumbSegments]);

  // 处理从 URL 加载预览
  useEffect(() => {
    // 只在内容加载完成且没有错误时处理
    if (!loading && !error && contents.length > 0) {
      const previewFileName = getPreviewFromUrl();

      if (!previewFileName) return;

      logger.debug(`从URL获取预览文件名: ${previewFileName}`);

      // 查找匹配的文件
      // 首先尝试使用文件名直接匹配
      let fileItem = contents.find((item) => item.name === previewFileName);

      // 如果没找到，尝试查找路径末尾匹配的文件
      if (!fileItem) {
        fileItem = contents.find((item) =>
          item.path.endsWith(`/${previewFileName}`),
        );
      }

      if (fileItem) {
        logger.debug(`找到匹配的文件: ${fileItem.path}`);
        // 更新当前预览引用
        currentPreviewItemRef.current = fileItem;

        // 避免重复加载已经打开的预览
        const hasActivePreview = !!(
          previewState.previewingItem?.path === fileItem.path ||
          previewState.previewingPdfItem?.path === fileItem.path ||
          previewState.previewingImageItem?.path === fileItem.path ||
          previewState.previewingOfficeItem?.path === fileItem.path
        );

        if (!hasActivePreview) {
          logger.debug(`预览文件未打开，正在加载: ${fileItem.path}`);
          selectFile(fileItem);
        } else {
          logger.debug(`预览文件已经打开: ${fileItem.path}`);
        }
      } else {
        logger.warn(`无法找到预览文件: ${previewFileName}`);
      }
    }
  }, [
    loading,
    error,
    contents,
    currentPreviewItemRef,
    previewState,
    selectFile,
  ]);

  // 获取当前文件或目录的信息用于SEO
  const seoInfo = useMemo(() => {
    // 如果正在预览文件，使用文件信息
    if (previewState.previewingItem) {
      return {
        title: previewState.previewingItem.name,
        filePath: previewState.previewingItem.path,
        isDirectory: false,
        fileType: previewState.previewingItem.name.split(".").pop() || "",
      };
    } else if (previewState.previewingImageItem) {
      return {
        title: previewState.previewingImageItem.name,
        filePath: previewState.previewingImageItem.path,
        isDirectory: false,
        fileType: "Image",
      };
    } else if (previewState.previewingOfficeItem) {
      return {
        title: previewState.previewingOfficeItem.name,
        filePath: previewState.previewingOfficeItem.path,
        isDirectory: false,
        fileType: previewState.officeFileType || "文档",
      };
    }

    // 否则使用当前目录信息
    return {
      title: currentPath ? currentPath.split("/").pop() || "根目录" : "根目录",
      filePath: currentPath || "",
      isDirectory: true,
      fileType: "",
    };
  }, [
    currentPath,
    previewState.previewingItem,
    previewState.previewingImageItem,
    previewState.previewingOfficeItem,
    previewState.officeFileType,
  ]);

  return (
    <Container
      component="main"
      sx={{
        flexGrow: 1,
        py: 4,
        overflow: "hidden",
      }}
      data-oid="7powvvf"
    >
      {/* 动态SEO组件 */}
      <DynamicSEO
        title={seoInfo.title}
        filePath={seoInfo.filePath}
        isDirectory={seoInfo.isDirectory}
        fileType={seoInfo.fileType}
        repoOwner={repoOwner}
        repoName={repoName}
        data-oid="8ov3blv"
      />

      <BreadcrumbNavigation
        breadcrumbSegments={breadcrumbSegments}
        handleBreadcrumbClick={handleBreadcrumbClick}
        breadcrumbsMaxItems={breadcrumbsMaxItems}
        isSmallScreen={isSmallScreen}
        breadcrumbsContainerRef={breadcrumbsContainerRef}
        data-oid="c02a2p5"
      />

      {loading ? (
        <FileListSkeleton
          isSmallScreen={isSmallScreen}
          itemCount={8}
          data-oid="-mkjng2"
        />
      ) : error ? (
        <ErrorDisplay
          errorMessage={error}
          onRetry={handleRetry}
          isSmallScreen={isSmallScreen}
          data-oid="j0jgapo"
        />
      ) : contents.length === 0 ? (
        <EmptyState
          type="empty-directory"
          onAction={handleRetry}
          isSmallScreen={isSmallScreen}
        />
      ) : (
        <>
          <FileList
            contents={contents}
            isSmallScreen={isSmallScreen}
            downloadingPath={downloadState.downloadingPath}
            downloadingFolderPath={downloadState.downloadingFolderPath}
            folderDownloadProgress={downloadState.folderDownloadProgress}
            handleItemClick={handleItemClick}
            handleDownloadClick={handleDownloadClick}
            handleFolderDownloadClick={handleFolderDownloadClick}
            handleCancelDownload={handleCancelDownload}
            currentPath={currentPath}
            hasReadmePreview={!!readmeContent && hasReadmeFile}
            data-oid="_qfxtvv"
          />

          {/* README预览 - 底部展示 */}
          {readmeContent && readmeLoaded && !loadingReadme && (
            <Box
              className="readme-container fade-in"
              sx={{
                position: "relative",
                width: "100%",
                mb: 4,
                display: "flex",
                flexDirection: "column",
              }}
              data-oid="0zc9q5:"
            >
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 600,
                  mb: 2,
                  display: "flex",
                  alignItems: "center",
                  color: "text.primary",
                }}
                data-oid="iawc_6m"
              />

              <MarkdownPreview
                readmeContent={readmeContent}
                loadingReadme={false}
                isSmallScreen={isSmallScreen}
                isReadme={true}
                lazyLoad={false}
                data-oid="6nohd:r"
              />
            </Box>
          )}

          {/* PDF 预览已改为浏览器原生打开，不在应用内渲染 */}

          {/* 图像预览 */}
          {previewState.previewingImageItem && previewState.imagePreviewUrl && (
            <ImagePreview
              imageUrl={previewState.imagePreviewUrl}
              fileName={previewState.previewingImageItem.name}
              isFullScreen={true}
              onClose={closePreview}
              lazyLoad={false}
              data-oid="yfv5ld-"
            />
          )}

          {/* Office文档预览 */}
          {previewState.previewingOfficeItem &&
            previewState.officePreviewUrl &&
            previewState.officeFileType && (
              <FullScreenPreview onClose={closePreview} data-oid="oa2lre0">
                <OfficePreview
                  fileUrl={previewState.officePreviewUrl}
                  fileType={previewState.officeFileType as any}
                  fileName={previewState.previewingOfficeItem.name}
                  isFullScreen={previewState.isOfficeFullscreen}
                  onClose={closePreview}
                  data-oid="-vdkwr8"
                />
              </FullScreenPreview>
            )}
        </>
      )}

      {/* 返回顶部浮动操作按钮 */}
      <ScrollToTopFab />
    </Container>
  );
};

export default MainContent;
