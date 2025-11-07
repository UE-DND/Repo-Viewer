import React, { useMemo, useEffect, useState, useCallback } from "react";
import { Box } from "@mui/material";
import { FixedSizeList } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { motion } from "framer-motion";
import AlphabetIndex from "./AlphabetIndex";
import Row from "./FileListRow";
import { FILE_ITEM_CONFIG, LIST_HEIGHT_CONFIG } from "./utils/fileListConfig";
import { listAnimationVariants } from "./utils/fileListAnimations";
import { calculateLayoutMetrics } from "./utils/fileListLayout";
import type { VirtualListItemData, FileListLayoutMetrics } from "./utils/types";
import type { GitHubContent } from "@/types";
import { theme } from "@/utils";
import { useOptimizedScroll } from "@/hooks/useScroll";

/**
 * 文件列表组件属性接口
 */
interface FileListProps {
  contents: GitHubContent[];
  isSmallScreen: boolean;
  downloadingPath: string | null;
  downloadingFolderPath: string | null;
  folderDownloadProgress: number;
  handleItemClick: (item: GitHubContent) => void;
  handleDownloadClick: (e: React.MouseEvent, item: GitHubContent) => void;
  handleFolderDownloadClick: (e: React.MouseEvent, item: GitHubContent) => void;
  handleCancelDownload: (e: React.MouseEvent) => void;
  currentPath: string;
  hasReadmePreview?: boolean;
  isPreviewActive?: boolean;
}

/**
 * 文件列表组件
 *
 * 显示文件和文件夹列表，支持虚拟化滚动、动画和下载功能。
 * 自动根据内容数量选择普通或虚拟化渲染模式。
 */
const FileList = React.memo<FileListProps>(
  ({
    contents,
    isSmallScreen,
    downloadingPath,
    downloadingFolderPath,
    folderDownloadProgress,
    handleItemClick,
    handleDownloadClick,
    handleFolderDownloadClick,
    handleCancelDownload,
    currentPath,
    hasReadmePreview = false,
    isPreviewActive = false,
  }) => {
    const { isScrolling, scrollSpeed, handleScroll: handleScrollEvent } = useOptimizedScroll({
      maxSamples: 5,
      scrollEndDelay: 1000,
      fastScrollThreshold: 0.3
    });

    const listRef = React.useRef<FixedSizeList>(null);
    const [showAlphabetIndex, setShowAlphabetIndex] = React.useState(false);
    const [highlightedIndex, setHighlightedIndex] = React.useState<number | null>(null);
    const highlightTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    // 当预览状态变化时，自动关闭字母索引
    React.useEffect(() => {
      if (isPreviewActive) {
        setShowAlphabetIndex(false);
      }
    }, [isPreviewActive]);

    // 计算每个文件项的高度（包括间距）
    // 这个计算需要与 FileListItem 的实际高度保持一致
    const rowHeight = useMemo(() => {
      // 基础高度
      const baseHeight = isSmallScreen
        ? FILE_ITEM_CONFIG.baseHeight.xs
        : FILE_ITEM_CONFIG.baseHeight.sm;

      // 行间距（上下各分一半）
      const rowGap = FILE_ITEM_CONFIG.spacing.marginBottom;

      // 计算总高度：基础高度 + 行间距
      return baseHeight + rowGap;
    }, [isSmallScreen]);

    /**
     * 滚动到指定索引的文件
     */
    const handleScrollToIndex = useCallback((index: number) => {
      if (listRef.current !== null) {
        // 在回调中动态计算行高
        const baseHeight = isSmallScreen
          ? FILE_ITEM_CONFIG.baseHeight.xs
          : FILE_ITEM_CONFIG.baseHeight.sm;
        const rowGap = FILE_ITEM_CONFIG.spacing.marginBottom;
        const calculatedRowHeight = baseHeight + rowGap;

        const targetOffset = index * calculatedRowHeight;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
        const outerElement = (listRef.current as any)._outerRef;

        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (outerElement) {
          // 使用原生的平滑滚动
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          outerElement.scrollTo({
            top: targetOffset,
            behavior: 'smooth'
          });
        } else {
          // 降级到直接跳转
          listRef.current.scrollToItem(index, 'start');
        }

        setHighlightedIndex(index);

        if (highlightTimeoutRef.current !== null) {
          clearTimeout(highlightTimeoutRef.current);
        }

        highlightTimeoutRef.current = setTimeout(() => {
          setHighlightedIndex(null);
        }, 1500);
      }
    }, [isSmallScreen]);

    // 清理定时器
    React.useEffect(() => {
      return () => {
        if (highlightTimeoutRef.current !== null) {
          clearTimeout(highlightTimeoutRef.current);
        }
      };
    }, []);

    // 计算悬停效果所需的额外空间
    const hoverExtraSpace = useMemo((): number => {
      // 悬停时阴影所需的额外空间
      const shadowSpace = isSmallScreen
        ? FILE_ITEM_CONFIG.hover.shadowSpace.xs
        : FILE_ITEM_CONFIG.hover.shadowSpace.sm;

      // 悬停时可能的垂直位移
      const verticalOffset = FILE_ITEM_CONFIG.hover.verticalOffset;

      // 计算总的额外空间
      return shadowSpace + verticalOffset;
    }, [isSmallScreen]);

    // 判断是否为少量文件
    const hasFewItems =
      contents.length <= LIST_HEIGHT_CONFIG.veryFewItemsThreshold;

    // 确定容器内边距
    const containerPadding = hasFewItems
      ? LIST_HEIGHT_CONFIG.containerPadding.few
      : LIST_HEIGHT_CONFIG.containerPadding.normal;

    const computeMetrics = useCallback((): FileListLayoutMetrics => {
      const viewportHeight = typeof window !== "undefined" ? window.innerHeight : null;
      return calculateLayoutMetrics({
        fileCount: contents.length,
        rowHeight,
        isSmallScreen,
        hasReadmePreview,
        hoverExtraSpace,
        viewportHeight,
      });
    }, [contents.length, rowHeight, isSmallScreen, hasReadmePreview, hoverExtraSpace]);

    const [layoutMetrics, setLayoutMetrics] = useState<FileListLayoutMetrics>(() => computeMetrics());
    const { height: availableHeight, needsScrolling } = layoutMetrics;

    // 监听窗口大小变化和文件数量变化
    useEffect(() => {
      setLayoutMetrics(computeMetrics());

      if (typeof window === "undefined") {
        return;
      }

      let rafId: number | null = null;

      const handleResize = (): void => {
        if (rafId !== null) {
          window.cancelAnimationFrame(rafId);
        }
        rafId = window.requestAnimationFrame(() => {
          setLayoutMetrics(computeMetrics());
        });
      };

      window.addEventListener("resize", handleResize);

      return () => {
        if (rafId !== null) {
          window.cancelAnimationFrame(rafId);
        }
        window.removeEventListener("resize", handleResize);
      };
    }, [computeMetrics]);

    // 仅当相关数据变化时才更新列表项数据
    const itemData = useMemo(
      (): VirtualListItemData => ({
        contents,
        downloadingPath,
        downloadingFolderPath,
        folderDownloadProgress,
        handleItemClick,
        handleDownloadClick,
        handleFolderDownloadClick,
        handleCancelDownload,
        currentPath,
        isScrolling,
        scrollSpeed,
        highlightedIndex,
      }),
      [
        contents,
        downloadingPath,
        downloadingFolderPath,
        folderDownloadProgress,
        handleItemClick,
        handleDownloadClick,
        handleFolderDownloadClick,
        handleCancelDownload,
        currentPath,
        isScrolling,
        scrollSpeed,
        highlightedIndex,
      ],
    );

    // 简化的列表内边距计算
    const listPadding = useMemo((): { paddingTop: number; paddingBottom: number } => {
      // 非滚动模式：使用固定的对称内边距，稍微增加一点
      if (!needsScrolling) {
        const padding = isSmallScreen ? 16 : 20;
        return {
          paddingTop: padding,
          paddingBottom: padding,
        };
      }

      // 滚动模式：使用较小的内边距
      return {
        paddingTop: 8,
        paddingBottom: 8,
      };
    }, [needsScrolling, isSmallScreen]);

    // 处理滚动事件（适配 react-window 接口）
    const handleScroll = React.useCallback(
      ({
        scrollOffset,
      }: {
        scrollOffset: number;
        scrollDirection: "forward" | "backward";
      }): void => {
        handleScrollEvent(scrollOffset);
      },
      [handleScrollEvent]
    );

    // 简化的虚拟列表样式
    const virtualListStyle = useMemo((): React.CSSProperties => {
      return {
        overflowX: "hidden" as const,
        overflowY: needsScrolling ? ("auto" as const) : ("hidden" as const),
        ...listPadding,
      };
    }, [needsScrolling, listPadding]);

    const containerStyle = {
      width: "100%",
      bgcolor: "background.paper",
      borderRadius: theme.responsiveG3Styles.fileListContainer(isSmallScreen),
      mb: 2,
      overflow: "hidden",
      boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.05)",
      border: "1px solid",
      borderColor: "divider",
      position: "relative" as const,
      zIndex: 1,
    };

    if (!needsScrolling) {
      const totalContentHeight = contents.length * rowHeight;
      const finalHeight = totalContentHeight + listPadding.paddingTop + listPadding.paddingBottom;

      return (
        <Box
          sx={{
            ...containerStyle,
            height: finalHeight,
            p: containerPadding,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          className={`file-list-container ${hasFewItems ? "few-items" : ""} no-scroll`}
        >
          <motion.div
            style={{
              width: "100%",
              paddingTop: listPadding.paddingTop,
              paddingBottom: listPadding.paddingBottom,
            }}
            key={currentPath}
            variants={listAnimationVariants}
            initial="hidden"
            animate="visible"
          >
            {contents.map((item, index) => (
              <div key={`${item.name}-${String(index)}`} style={{ height: rowHeight }}>
                <Row index={index} style={{ height: rowHeight }} data={itemData} />
              </div>
            ))}
          </motion.div>
        </Box>
      );
    }

    // 滚动模式：使用虚拟化
    return (
      <Box
        sx={{
          position: 'relative',
        }}
      >
        <Box
          sx={{
            ...containerStyle,
            height: availableHeight,
            pl: { xs: 0.5, sm: 1.0 },
            py: containerPadding,
          }}
          className={`file-list-container ${hasFewItems ? "few-items" : ""}`}
        >
          <motion.div
            style={{ height: "100%", width: "100%" }}
            key={currentPath}
            variants={listAnimationVariants}
            initial="hidden"
            animate="visible"
          >
            <AutoSizer>
              {({ width, height }: { width: number; height: number }) => (
                <FixedSizeList
                  ref={listRef}
                  height={height}
                  width={width}
                  itemCount={contents.length}
                  itemSize={rowHeight}
                  itemData={itemData}
                  style={virtualListStyle}
                  onScroll={handleScroll}
                  overscanCount={10}
                  className={`virtual-file-list ${isScrolling ? "is-scrolling" : ""}`}
                >
                  {Row}
                </FixedSizeList>
              )}
            </AutoSizer>
          </motion.div>
        </Box>

        {/* 右侧悬停触发区域 */}
        <Box
          sx={{
            position: 'absolute',
            right: { xs: -32, sm: -36 },
            top: 0,
            bottom: 0,
            width: { xs: 60, sm: 64 },
            zIndex: 5,
            cursor: 'default',
            // 预览时禁用指针事件
            pointerEvents: isPreviewActive ? 'none' : 'auto',
            // 预览时完全隐藏（不占用空间）
            display: isPreviewActive ? 'none' : 'block',
          }}
          onMouseEnter={() => {
            setShowAlphabetIndex(true);
          }}
          onMouseLeave={() => {
            setShowAlphabetIndex(false);
          }}
        >
          {/* 字母索引 */}
          <AlphabetIndex
            contents={contents}
            onScrollToIndex={handleScrollToIndex}
            visible={showAlphabetIndex}
          />
        </Box>
      </Box>
    );
  },
);

FileList.displayName = "FileList";

export default FileList;
