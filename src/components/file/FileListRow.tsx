import React from "react";
import type { ReactElement } from "react";
import { motion } from "framer-motion";
import type { MotionStyle } from "framer-motion";
import type { ListChildComponentProps } from "react-window";

import FileListItem from "./FileListItem";
import { FILE_ITEM_CONFIG } from "./utils/fileListConfig";
import { getDynamicItemVariants, optimizedAnimationStyle } from "./utils/fileListAnimations";
import type { VirtualListItemData } from "./utils/types";

const RowComponent = ({ data, index, style }: ListChildComponentProps<VirtualListItemData>): ReactElement | null => {
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
        data-oid="k4zj3qr"
      />
    </motion.div>
  );
};

const Row = React.memo(RowComponent);

Row.displayName = "FileListRow";

export default Row;

