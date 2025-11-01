import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import {
  Container,
  useTheme,
  useMediaQuery,
  Box,
  Typography,
  Portal,
} from "@mui/material";
import BreadcrumbNavigation from "@/components/layout/BreadcrumbNavigation";
import FileList from "@/components/file/FileList";
import { LazyMarkdownPreview, LazyImagePreview, preloadPreviewComponents } from "@/utils/lazy-loading";
import ErrorDisplay from "@/components/ui/ErrorDisplay";
import {
  useContentContext,
  usePreviewContext,
  useDownloadContext,
} from "@/contexts/unified";
import { FileListSkeleton, MarkdownPreviewSkeleton } from "@/components/ui/skeletons";
import { getPreviewFromUrl } from "@/utils/routing/urlManager";
import { logger } from "@/utils";
import DynamicSEO from "@/components/seo/DynamicSEO";
import ScrollToTopFab from "@/components/interactions/ScrollToTopFab";
import EmptyState from "@/components/ui/EmptyState";
import type { NavigationDirection } from "@/contexts/unified";
import type { BreadcrumbSegment, GitHubContent } from "@/types";

/**
 * 主内容区组件属性接口
 */
interface MainContentProps {
  showBreadcrumbInToolbar: boolean;
}

/**
 * 主内容区组件
 * 
 * 应用的主要内容区域，包含面包屑导航、文件列表、预览功能等。
 * 自动处理URL参数和内容加载。
 */
const MainContent: React.FC<MainContentProps> = ({ showBreadcrumbInToolbar }) => {
  // 获取主题和响应式布局
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  // 创建引用
  const breadcrumbsContainerRef = useRef<HTMLDivElement>(null);

  // 计算面包屑最大项目数
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
    currentBranch,
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

  // 获取当前目录中的 README 文件，用于统一 Markdown 渲染逻辑
  const readmeFileItem = useMemo<GitHubContent | null>(() => {
    const target = contents.find((item) => {
      if (item.type !== 'file') {
        return false;
      }
      const fileName = item.name.toLowerCase();
      return ['readme.md', 'readme.markdown', 'readme.mdown'].includes(fileName);
    });

    return target ?? null;
  }, [contents]);

  const hasReadmeFile = readmeFileItem !== null;

  // 获取当前目录中的所有图片文件
  const imageFiles = useMemo(() => {
    return contents.filter((item) => {
      if (item.type !== 'file') {
        return false;
      }
      const fileName = item.name.toLowerCase();
      return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].some(ext => 
        fileName.endsWith(`.${ext}`)
      );
    });
  }, [contents]);

  // 获取当前预览图片的索引
  const currentImageIndex = useMemo(() => {
    if (previewState.previewingImageItem === null) {
      return -1;
    }
    return imageFiles.findIndex(
      (item) => item.path === previewState.previewingImageItem?.path
    );
  }, [imageFiles, previewState.previewingImageItem]);

  // 生成面包屑导航路径段
  const breadcrumbSegments = useMemo(() => {
    const segments: BreadcrumbSegment[] = [{ name: "Home", path: "" }];
    
    const normalizedPath = currentPath.trim();
    if (normalizedPath === '') {
      return segments;
    }
    
    const pathParts = normalizedPath.split("/").filter(Boolean);
    
    pathParts.reduce((accPath, part) => {
      const segmentPath = accPath !== '' ? `${accPath}/${part}` : part;
      segments.push({ name: part, path: segmentPath });
      return segmentPath;
    }, '');
    
    return segments;
  }, [currentPath]);

  const isHomePage = breadcrumbSegments.length <= 1;
  const shouldShowInToolbar = showBreadcrumbInToolbar && !isHomePage;

  // 处理面包屑点击
  const handleBreadcrumbClick = useCallback((
    path: string,
    direction: NavigationDirection = "backward",
  ): void => {
    navigateTo(path, direction);
  }, [navigateTo]);

  // 处理文件/文件夹点击
  const handleItemClick = useCallback((item: GitHubContent): void => {
    if (item.type === "dir") {
      navigateTo(item.path, "forward");
      return;
    }

    void selectFile(item);
  }, [navigateTo, selectFile]);

  // 处理下载点击
  const handleDownloadClick = useCallback((
    e: React.MouseEvent,
    item: GitHubContent,
  ): void => {
    e.preventDefault();
    e.stopPropagation();
    void downloadFile(item);
  }, [downloadFile]);

  // 处理文件夹下载点击
  const handleFolderDownloadClick = useCallback((
    e: React.MouseEvent,
    item: GitHubContent,
  ): void => {
    e.preventDefault();
    e.stopPropagation();
    void downloadFolder(item.path, item.name);
  }, [downloadFolder]);

  // 处理取消下载点击
  const handleCancelDownload = useCallback((e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    cancelDownload();
  }, [cancelDownload]);

  // 处理切换到上一张图片
  const handlePreviousImage = useCallback(() => {
    if (currentImageIndex > 0) {
      const previousImage = imageFiles[currentImageIndex - 1];
      if (previousImage !== undefined) {
        void selectFile(previousImage);
      }
    }
  }, [currentImageIndex, imageFiles, selectFile]);

  // 处理切换到下一张图片
  const handleNextImage = useCallback(() => {
    if (currentImageIndex >= 0 && currentImageIndex < imageFiles.length - 1) {
      const nextImage = imageFiles[currentImageIndex + 1];
      if (nextImage !== undefined) {
        void selectFile(nextImage);
      }
    }
  }, [currentImageIndex, imageFiles, selectFile]);

  useEffect(() => {
    const segmentCount = breadcrumbSegments.length;

    // 在移动端，使用更激进的折叠策略
    if (isSmallScreen) {
      if (segmentCount > 3) {
        setBreadcrumbsMaxItems(3);
      } else {
        setBreadcrumbsMaxItems(0);
      }
      return;
    }

    // 桌面端逻辑
    if (segmentCount <= 3) {
      setBreadcrumbsMaxItems(0);
      return;
    }

    // 监听容器尺寸变化
    const resizeObserver = new ResizeObserver(() => {
      const container = breadcrumbsContainerRef.current;

      if (container === null) {
        return;
      }

      // 如果路径太长，则设置限制
      if (breadcrumbSegments.length > 8) {
        setBreadcrumbsMaxItems(8);
        return;
      }

      // 不限制项目数量，使用CSS处理溢出
      setBreadcrumbsMaxItems(0);
    });

    if (breadcrumbsContainerRef.current !== null) {
      resizeObserver.observe(breadcrumbsContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [breadcrumbSegments, isSmallScreen]);

  // 处理从 URL 加载预览
  useEffect(() => {
    const loadPreviewFromUrl = async (): Promise<void> => {
      if (loading) {
        return;
      }

      if (error !== null) {
        return;
      }

      if (contents.length === 0) {
        return;
      }

      const previewFileName = getPreviewFromUrl();

      if (typeof previewFileName !== "string" || previewFileName.trim().length === 0) {
        return;
      }

      const normalizedPreviewFileName = previewFileName.trim();

      logger.debug(`从URL获取预览文件名: ${normalizedPreviewFileName}`);

      const directMatch = contents.find((item) => item.name === normalizedPreviewFileName);
      const pathTailMatch = contents.find((item) =>
        item.path.endsWith(`/${normalizedPreviewFileName}`),
      );
      const fileItem = directMatch ?? pathTailMatch;

      if (fileItem === undefined) {
        logger.warn(`无法找到预览文件: ${normalizedPreviewFileName}`);
        return;
      }

      logger.debug(`找到匹配的文件: ${fileItem.path}`);

      currentPreviewItemRef.current = fileItem;

      const hasActivePreview =
        (previewState.previewingItem !== null && previewState.previewingItem.path === fileItem.path) ||
        (previewState.previewingImageItem !== null && previewState.previewingImageItem.path === fileItem.path);

      if (!hasActivePreview) {
        logger.debug(`预览文件未打开，正在加载: ${fileItem.path}`);
        await selectFile(fileItem);
      } else {
        logger.debug(`预览文件已经打开: ${fileItem.path}`);
      }
    };

    void loadPreviewFromUrl();
  }, [
    loading,
    error,
    contents,
    currentPreviewItemRef,
    previewState,
    selectFile,
  ]);

  // 在内容加载完成后预加载预览组件
  useEffect(() => {
    if (loading) {
      return;
    }

    if (error !== null) {
      return;
    }

    if (contents.length === 0) {
      return;
    }

    // 使用空闲时间预加载预览组件
    preloadPreviewComponents();
  }, [loading, error, contents]);

  // 获取当前文件或目录的信息用于SEO
  const seoInfo = useMemo(() => {
    // 如果正在预览文件，使用文件信息
    if (previewState.previewingItem !== null) {
      return {
        title: previewState.previewingItem.name,
        filePath: previewState.previewingItem.path,
        isDirectory: false,
        fileType: previewState.previewingItem.name.split(".").pop() ?? "",
      };
    } else if (previewState.previewingImageItem !== null) {
      return {
        title: previewState.previewingImageItem.name,
        filePath: previewState.previewingImageItem.path,
        isDirectory: false,
        fileType: "Image",
      };
    }

    // 否则使用当前目录信息
    return {
      title: currentPath.trim().length > 0
        ? currentPath.split("/").pop() ?? "根目录"
        : "根目录",
      filePath: currentPath,
      isDirectory: true,
      fileType: "",
    };
  }, [
    currentPath,
    previewState.previewingItem,
    previewState.previewingImageItem,
  ]);

  // 获取顶部栏面包屑容器
  const [toolbarBreadcrumbContainer, setToolbarBreadcrumbContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const container = document.getElementById('toolbar-breadcrumb-container');
    setToolbarBreadcrumbContainer(container);
  }, []);

  // 渲染面包屑导航组件
  const breadcrumbNavigation = (
    <BreadcrumbNavigation
      breadcrumbSegments={breadcrumbSegments}
      handleBreadcrumbClick={handleBreadcrumbClick}
      breadcrumbsMaxItems={breadcrumbsMaxItems}
      isSmallScreen={isSmallScreen}
      breadcrumbsContainerRef={breadcrumbsContainerRef as React.RefObject<HTMLDivElement>}
      compact={false}
      data-oid="c02a2p5"
    />
  );

  // 紧凑模式的面包屑（用于顶部栏）
  const compactBreadcrumbNavigation = (
    <BreadcrumbNavigation
      breadcrumbSegments={breadcrumbSegments}
      handleBreadcrumbClick={handleBreadcrumbClick}
      breadcrumbsMaxItems={breadcrumbsMaxItems}
      isSmallScreen={isSmallScreen}
      breadcrumbsContainerRef={breadcrumbsContainerRef as React.RefObject<HTMLDivElement>}
      compact={true}
      data-oid="c02a2p5-compact"
    />
  );

  const shouldShowReadmeSection = hasReadmeFile;
  const hasReadmeContent = typeof readmeContent === "string" && readmeContent.trim().length > 0;
  const shouldShowReadmeSkeleton = shouldShowReadmeSection && !hasReadmeContent && (!readmeLoaded || loadingReadme);

  return (
    <Container
      component="main"
      sx={{
        flexGrow: 1,
        py: 4,
        width: "100%",
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

      {/* 面包屑导航 - 根据滚动位置决定渲染位置 */}
      {shouldShowInToolbar && toolbarBreadcrumbContainer !== null ? (
        <Portal container={toolbarBreadcrumbContainer}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              animation: 'slideUpFadeIn 0.3s ease-out',
              '@keyframes slideUpFadeIn': {
                from: { opacity: 0, transform: 'translateY(10px)' },
                to: { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
            {compactBreadcrumbNavigation}
          </Box>
        </Portal>
      ) : null}

      <Box
        sx={{
          opacity: shouldShowInToolbar ? 0 : 1,
          transform: shouldShowInToolbar ? 'translateY(-20px)' : 'translateY(0)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: shouldShowInToolbar ? 'none' : 'auto',
        }}
      >
        {breadcrumbNavigation}
      </Box>

      {loading ? (
        <FileListSkeleton
          isSmallScreen={isSmallScreen}
          itemCount={8}
          data-oid="-mkjng2"
        />
      ) : error !== null ? (
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
            hasReadmePreview={hasReadmeFile}
            data-oid="_qfxtvv"
          />

          {/* README预览 - 底部展示 */}
          {shouldShowReadmeSection && (
            <Box
              className="readme-container"
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

              {shouldShowReadmeSkeleton ? (
                <MarkdownPreviewSkeleton
                  isSmallScreen={isSmallScreen}
                  data-oid="readme-skeleton"
                />
              ) : hasReadmeContent ? (
                <LazyMarkdownPreview
                  readmeContent={readmeContent}
                  loadingReadme={false}
                  isSmallScreen={isSmallScreen}
                  lazyLoad={false}
                  currentBranch={currentBranch}
                  previewingItem={readmeFileItem}
                  data-oid="6nohd:r"
                />
              ) : readmeLoaded ? (
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                    px: { xs: 2, sm: 3, md: 4 },
                    py: { xs: 2, sm: 3 },
                    borderRadius: 2,
                    bgcolor: "background.paper",
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                  data-oid="readme-empty"
                >
                  README 内容为空或加载失败。
                </Typography>
              ) : null}
            </Box>
          )}

          {/* Markdown文件预览（非README） */}
          {previewState.previewingItem !== null && previewState.previewContent !== null && (
            <Box
              sx={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: theme.zIndex.modal + 100,
                bgcolor: "background.default",
                overflow: "auto",
                p: { xs: 2, sm: 3, md: 4 },
              }}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  closePreview();
                }
              }}
              data-oid="md-preview-fs"
            >
              <Box
                sx={{
                  maxWidth: "1200px",
                  mx: "auto",
                  width: "100%",
                }}
                data-oid="md-preview-container"
              >
                <LazyMarkdownPreview
                  readmeContent={previewState.previewContent}
                  loadingReadme={previewState.loadingPreview}
                  isSmallScreen={isSmallScreen}
                  previewingItem={previewState.previewingItem}
                  onClose={closePreview}
                  lazyLoad={false}
                  currentBranch={currentBranch}
                  data-oid="md-file-preview"
                />
              </Box>
            </Box>
          )}

          {/* 图像预览 */}
          {previewState.previewingImageItem !== null && previewState.imagePreviewUrl !== null && (
            <LazyImagePreview
              imageUrl={previewState.imagePreviewUrl}
              fileName={previewState.previewingImageItem.name}
              isFullScreen={true}
              onClose={closePreview}
              lazyLoad={false}
              hasPrevious={currentImageIndex > 0}
              hasNext={currentImageIndex >= 0 && currentImageIndex < imageFiles.length - 1}
              onPrevious={handlePreviousImage}
              onNext={handleNextImage}
              data-oid="yfv5ld-"
            />
          )}
        </>
      )}

      {/* 返回顶部浮动操作按钮 */}
      <ScrollToTopFab />
    </Container>
  );
};

export default MainContent;
