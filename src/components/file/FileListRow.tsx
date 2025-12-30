import React, { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { motion } from "framer-motion";
import type { MotionStyle } from "framer-motion";
import type { RowComponentProps } from "react-window";

import FileListItem from "./FileListItem";
import { FILE_ITEM_CONFIG } from "./utils/fileListConfig";
import { getDynamicItemVariants, optimizedAnimationStyle } from "./utils/fileListAnimations";
import type { VirtualListItemData } from "./utils/types";

const RowComponent = ({
  ariaAttributes,
  index,
  style,
  ...data
}: RowComponentProps<VirtualListItemData>): ReactElement => {
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

  useEffect(() => {
    const element = rowRef.current;
    if (element === null) {
      return;
    }

    const scrollContainer = element.closest('.virtual-file-list');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting);
        });
      },
      {
        root: scrollContainer ?? null,
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
    return (
      <div
        ref={rowRef}
        style={style}
        {...ariaAttributes}
        aria-hidden="true"
      />
    );
  }

  const isHighlighted = highlightedIndex === index;

  const adjustedStyle: React.CSSProperties = {
    ...style,
    boxSizing: "border-box",
    alignItems: "flex-start",
  };

  const innerStyle: MotionStyle = {
    height: "100%",
    width: "100%",
    paddingTop: 0,
    paddingBottom: FILE_ITEM_CONFIG.spacing.marginBottom,
    paddingRight: "12px",
    boxSizing: "border-box",
    ...optimizedAnimationStyle,
  };

  const currentVariants = getDynamicItemVariants(scrollSpeed, isScrolling);

  return (
    <div
      ref={rowRef}
      style={adjustedStyle}
      className="file-list-item-container"
      {...ariaAttributes}
      aria-hidden={!isVisible ? "true" : undefined}
      data-oid="_c:db-1"
    >
      <motion.div
        style={innerStyle}
        variants={currentVariants}
        custom={index}
        initial="hidden"
        animate="visible"
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
    </div>
  );
};

const Row = React.memo(RowComponent);

Row.displayName = "FileListRow";

export { RowComponent };

export default Row;
