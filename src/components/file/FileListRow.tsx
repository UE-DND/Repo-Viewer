import React, { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { motion } from "framer-motion";
import type { MotionStyle } from "framer-motion";
import type { ListChildComponentProps } from "react-window";

import FileListItem from "./FileListItem";
import { FILE_ITEM_CONFIG } from "./utils/fileListConfig";
import { getDynamicItemVariants, optimizedAnimationStyle } from "./utils/fileListAnimations";
import type { VirtualListItemData } from "./utils/types";

const RowComponent = ({ data, index, style }: ListChildComponentProps<VirtualListItemData>): ReactElement | null => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const {
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
  } = data;

  const item = contents[index];

  // 使用 IntersectionObserver 检测项是否在视口中
  useEffect(() => {
    const element = rowRef.current;
    if (element === null) {
      return;
    }

    // 查找最近的滚动容器（FixedSizeList 的滚动容器）
    const scrollContainer: HTMLElement | null = element.closest('.virtual-file-list') ?? null;

    // 创建 IntersectionObserver 来检测可见性
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting);
        });
      },
      {
        root: scrollContainer,
        rootMargin: "100px",
        threshold: 0.01,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  if (item === undefined) {
    return null;
  }

  const isHighlighted = highlightedIndex === index;

  const adjustedStyle: MotionStyle = {
    ...(style as MotionStyle),
    paddingTop: FILE_ITEM_CONFIG.spacing.marginBottom / 2,
    paddingBottom: FILE_ITEM_CONFIG.spacing.marginBottom / 2,
    paddingRight: "12px",
    boxSizing: "border-box",
    ...optimizedAnimationStyle,
  };

  const currentVariants = getDynamicItemVariants(scrollSpeed, isScrolling);

  return (
    <motion.div
      ref={rowRef}
      style={adjustedStyle}
      className="file-list-item-container"
      variants={currentVariants}
      custom={index}
      initial="hidden"
      animate="visible"
      role="listitem"
      aria-hidden={!isVisible ? "true" : undefined}
      data-oid="_c:db-1"
    >
      <FileListItem
        key={item.path}
        item={item}
        downloadingPath={downloadingPath}
        downloadingFolderPath={downloadingFolderPath}
        folderDownloadProgress={folderDownloadProgress}
        handleItemClick={handleItemClick}
        handleDownloadClick={handleDownloadClick}
        handleFolderDownloadClick={handleFolderDownloadClick}
        handleCancelDownload={handleCancelDownload}
        currentPath={currentPath}
        contents={contents}
        isHighlighted={isHighlighted}
        isVisible={isVisible}
        data-oid="k4zj3qr"
      />
    </motion.div>
  );
};

const Row = React.memo(RowComponent);

Row.displayName = "FileListRow";

export default Row;

