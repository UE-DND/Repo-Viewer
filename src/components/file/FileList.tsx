import React, { useMemo, useEffect, useState } from "react";
import { List, useTheme, Box } from "@mui/material";
import { FixedSizeList, ListChildComponentProps } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { motion } from "framer-motion";
import FileListItem from "./FileListItem";
import { GitHubContent } from "../../types";
import { NavigationDirection } from "../../contexts/github";

// 添加CSS优化，提高动画性能
const optimizedAnimationStyle = {
  willChange: "opacity, transform",
  backfaceVisibility: "hidden" as "hidden",
  WebkitBackfaceVisibility: "hidden" as "hidden",
  perspective: 1000,
  WebkitPerspective: 1000,
};

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
  navigationDirection: NavigationDirection;
  hasReadmePreview?: boolean;
}

// 文件项间距配置
const FILE_ITEM_CONFIG = {
  // 基础行高（不包括间距）
  baseHeight: {
    sm: 48, // 正常屏幕
    xs: 40, // 小屏幕
  },
  // 文件项间距
  spacing: {
    marginBottom: 8, // 固定下边距为8px (0.5rem)，用于高度计算
    visualMarginBottom: 4, // 视觉上的下边距，更小以使列表更紧凑
    paddingY: {
      sm: 6, // 上下内边距（普通屏幕）
      xs: 4, // 上下内边距（小屏幕）
    },
  },
  // 悬停效果配置
  hover: {
    // 悬停时阴影所需的额外空间（像素）
    shadowSpace: {
      sm: 6, // 正常屏幕
      xs: 4, // 小屏幕
    },
    // 悬停时可能的垂直位移（像素）
    verticalOffset: 2,
  },
};

// 列表高度配置
const LIST_HEIGHT_CONFIG = {
  // 最小显示项目数量（即使只有1个文件，也至少留出这么多项的空间）
  minVisibleItems: 1,
  // 最大显示项目数量（超过此数量的文件将需要滚动查看）
  maxVisibleItems: 15,
  // 特殊处理的极少量文件阈值
  veryFewItemsThreshold: 2,
  // 容器内边距（基于文件数量）
  containerPadding: {
    few: { xs: 0.5, sm: 1 },
    normal: { xs: 1, sm: 2 },
  },
  // 非滚动模式下的内边距（像素）
  nonScrollPadding: {
    top: 12, // 增加顶部内边距，为阴影效果提供更多空间
    bottom: 12, // 增加底部内边距，为阴影效果提供更多空间
  },
  // README预览时的高度减少值（像素）
  readmePreviewHeightReduction: {
    few: 15, // 少量文件时的减少值
    normal: 25, // 正常文件数量时的减少值
    many: 30, // 大量文件时的减少值
  },
};

// Define animation variants
const EASE_OUT: [number, number, number, number] = [0.4, 0, 0.2, 1];
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: Math.min(i * 0.01, 0.1),
      duration: 0.12,
      ease: EASE_OUT,
    },
  }),
};

const listAnimationVariants = {
  hidden: {},
  visible: {},
};

// 根据滚动速度动态生成动画变体
const getDynamicItemVariants = (speed: number, isScrolling: boolean) => {
  // 根据滚动速度调整动画参数
  const isFastScrolling = speed > 0.3; // 阈值可以根据实际情况调整

  if (isScrolling && isFastScrolling) {
    // 快速滚动时使用更快的动画
    return {
      hidden: { opacity: 0.7, y: 5 },
      visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: {
          delay: 0, // 没有延迟
          duration: 0.08, // 非常短的动画时长
          ease: EASE_OUT,
        },
      }),
    };
  } else if (isScrolling) {
    // 普通滚动时使用中等速度动画
    return {
      hidden: { opacity: 0, y: 8 },
      visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: {
          delay: Math.min(i * 0.005, 0.05), // 非常小的延迟
          duration: 0.1, // 较短的动画时长
          ease: EASE_OUT,
        },
      }),
    };
  } else {
    // 不滚动时使用标准动画
    return itemVariants;
  }
};

// 列表项渲染器
const Row = React.memo(({ data, index, style }: ListChildComponentProps) => {
  const {
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
    isScrolling,
    scrollSpeed,
  } = data;

  const item = contents[index];

  // 调整样式以确保一致的间距，但使用更小的视觉间距
  const adjustedStyle = {
    ...style,
    // 为了保证列表上下间距始终一致，给每个列表项添加对称的上下内边距（各占 ROW_GAP 的一半）
    paddingTop: FILE_ITEM_CONFIG.spacing.marginBottom / 2,
    paddingBottom: FILE_ITEM_CONFIG.spacing.marginBottom / 2,
    /* 保持虚拟列表固定行高，由 rowHeight 精确控制高度 */
    paddingRight: "3px",
    boxSizing: "border-box" as "border-box",
    ...optimizedAnimationStyle, // 添加优化的动画样式
  };

  // 根据滚动状态和速度选择动画变体
  const currentVariants = getDynamicItemVariants(scrollSpeed, isScrolling);

  return (
    <motion.div
      style={adjustedStyle}
      className="file-list-item-container"
      variants={currentVariants}
      custom={index}
      initial="hidden"
      animate="visible"
      data-oid="_c:db-1"
    >
      <FileListItem
        key={item.path}
        item={item}
        isSmallScreen={isSmallScreen}
        downloadingPath={downloadingPath}
        downloadingFolderPath={downloadingFolderPath}
        folderDownloadProgress={folderDownloadProgress}
        handleItemClick={handleItemClick}
        handleDownloadClick={handleDownloadClick}
        handleFolderDownloadClick={handleFolderDownloadClick}
        handleCancelDownload={handleCancelDownload}
        currentPath={currentPath}
        contents={contents}
        data-oid="k4zj3qr"
      />
    </motion.div>
  );
});

Row.displayName = "FileListRow";

// 优化的文件列表组件
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
    navigationDirection,
    hasReadmePreview = false,
  }) => {
    const theme = useTheme();
    const [availableHeight, setAvailableHeight] = useState(0);
    const [needsScrolling, setNeedsScrolling] = useState(false);
    const [isScrolling, setIsScrolling] = useState(false);
    const [scrollSpeed, setScrollSpeed] = useState(0);
    const scrollTimerRef = React.useRef<NodeJS.Timeout | null>(null);
    const lastScrollTopRef = React.useRef(0);
    const lastScrollTimeRef = React.useRef(Date.now());
    const listRef = React.useRef<FixedSizeList>(null);

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

    // 计算悬停效果所需的额外空间
    const hoverExtraSpace = useMemo(() => {
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

    // 监听窗口大小变化和文件数量变化
    useEffect(() => {
      // 计算可用高度的函数，考虑文件数量
      const calculateAvailableHeight = () => {
        // 获取视口高度
        const viewportHeight = window.innerHeight;
        // 估计顶部导航栏和面包屑的高度（可以根据实际情况调整）
        const topElementsHeight = 180; // 包括导航栏、面包屑和上下 padding
        // 底部预留空间
        const bottomMargin = 50;

        // 计算理论上的最大可用高度
        const maxAvailableHeight =
          viewportHeight - topElementsHeight - bottomMargin;

        // 文件数量
        const fileCount = contents.length;

        // 计算实际内容高度（所有文件项的总高度）
        const contentHeight = fileCount * rowHeight;

        // 判断是否需要滚动
        // 1. 内容高度超过容器高度时启用滚动
        // 2. 在桌面端（非小屏幕）且文件数量大于等于10个时启用滚动
        const needsScrolling =
          contentHeight > maxAvailableHeight ||
          (!isSmallScreen && fileCount >= 10);
        setNeedsScrolling(needsScrolling);

        // 非滚动模式下的高度计算（文件数量小于10个且内容高度不超过最大可用高度）
        if (!needsScrolling) {
          // 根据文件数量调整容器高度
          let paddingMultiplier;
          if (fileCount <= 2) {
            // 极少量文件，使用最紧凑的设置
            paddingMultiplier = isSmallScreen ? 12 : 20;
          } else if (fileCount <= 5) {
            // 少量文件，使用适中的设置
            paddingMultiplier = isSmallScreen ? 16 : 24;
          } else {
            // 中等数量文件，使用稍大的设置
            paddingMultiplier = isSmallScreen ? 20 : 28;
          }

          const compactHeight = contentHeight + paddingMultiplier;
          return Math.min(compactHeight, maxAvailableHeight);
        }

        // 滚动模式下的高度计算
        let scrollModeHeight;

        if (fileCount <= LIST_HEIGHT_CONFIG.maxVisibleItems) {
          // 文件数量不超过最大显示数量时，显示所有文件
          // 在滚动模式下也考虑阴影效果，但只需要为顶部和底部的文件项添加额外空间
          scrollModeHeight = Math.min(
            contentHeight + hoverExtraSpace,
            maxAvailableHeight,
          );
        } else {
          // 文件数量超过最大显示数量时，限制高度为最多显示maxVisibleItems个文件
          // 同样考虑阴影效果
          scrollModeHeight = Math.min(
            LIST_HEIGHT_CONFIG.maxVisibleItems * rowHeight + hoverExtraSpace,
            maxAvailableHeight,
          );
        }

        // 如果有README预览，减少列表高度
        if (hasReadmePreview) {
          // 根据文件数量选择不同的减少值
          let heightReduction;
          if (fileCount <= LIST_HEIGHT_CONFIG.veryFewItemsThreshold) {
            heightReduction =
              LIST_HEIGHT_CONFIG.readmePreviewHeightReduction.few;
          } else if (fileCount <= LIST_HEIGHT_CONFIG.maxVisibleItems) {
            heightReduction =
              LIST_HEIGHT_CONFIG.readmePreviewHeightReduction.normal;
          } else {
            heightReduction =
              LIST_HEIGHT_CONFIG.readmePreviewHeightReduction.many;
          }

          // 应用高度减少，但确保不会小于最小高度
          scrollModeHeight = Math.max(
            scrollModeHeight - heightReduction,
            LIST_HEIGHT_CONFIG.minVisibleItems * rowHeight,
          );
        }

        return scrollModeHeight;
      };

      // 初始计算
      setAvailableHeight(calculateAvailableHeight());

      // 添加窗口大小变化事件监听
      const handleResize = () => {
        setAvailableHeight(calculateAvailableHeight());
      };

      window.addEventListener("resize", handleResize);

      // 清理函数
      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }, [
      contents.length,
      rowHeight,
      isSmallScreen,
      hasReadmePreview,
      hoverExtraSpace,
    ]); // 添加 hoverExtraSpace 作为依赖项

    // 仅当相关数据变化时才更新列表项数据
    const itemData = useMemo(
      () => ({
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
        isScrolling,
        scrollSpeed,
      }),
      [
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
        isScrolling,
        scrollSpeed,
      ],
    );

    // 简化的列表内边距计算
    const listPadding = useMemo(() => {
      // 非滚动模式：使用固定的对称内边距，稍微增加一点
      if (!needsScrolling) {
        const padding = isSmallScreen ? 16 : 20; // 增加4px
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

    // 处理滚动事件
    const handleScroll = React.useCallback(
      ({
        scrollOffset,
        scrollDirection,
      }: {
        scrollOffset: number;
        scrollDirection: "forward" | "backward";
      }) => {
        // 设置为正在滚动状态
        setIsScrolling(true);

        // 计算滚动速度
        const now = Date.now();
        const timeDiff = now - lastScrollTimeRef.current;
        if (timeDiff > 0) {
          const distance = Math.abs(scrollOffset - lastScrollTopRef.current);
          const speed = distance / timeDiff; // 像素/毫秒
          setScrollSpeed(speed);

          lastScrollTopRef.current = scrollOffset;
          lastScrollTimeRef.current = now;
        }

        // 清除之前的定时器（如果有）
        if (scrollTimerRef.current) {
          clearTimeout(scrollTimerRef.current);
        }

        // 设置新的定时器，在滚动停止后延迟将滚动状态设置为false
        scrollTimerRef.current = setTimeout(() => {
          // 使用渐变过渡来隐藏滚动条
          setIsScrolling(false);
          setScrollSpeed(0); // 重置滚动速度
        }, 200); // 减少延迟时间，更快地恢复正常动画
      },
      [],
    );

    // 在组件卸载时清除定时器
    React.useEffect(() => {
      return () => {
        if (scrollTimerRef.current) {
          clearTimeout(scrollTimerRef.current);
        }
      };
    }, []);

    // 简化的虚拟列表样式
    const virtualListStyle = useMemo(() => {
      return {
        overflowX: "hidden" as const,
        overflowY: needsScrolling ? ("auto" as const) : ("hidden" as const),
        ...listPadding,
      };
    }, [needsScrolling, listPadding]);

    // 重构的渲染逻辑：非滚动模式使用简单布局，滚动模式使用虚拟化
    const containerStyle = {
      width: "100%",
      bgcolor: "background.paper",
      borderRadius: 2,
      mb: 2,
      overflow: "hidden",
      boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.05)",
      border: "1px solid",
      borderColor: "divider",
      position: "relative" as const,
      zIndex: 1,
    };

    if (!needsScrolling) {
      // 非滚动模式：简单布局，完美居中
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
              <div key={`${item.name}-${index}`} style={{ height: rowHeight }}>
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
          ...containerStyle,
          height: availableHeight,
          p: containerPadding,
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
    );
  },
);

FileList.displayName = "FileList";

export default FileList;
