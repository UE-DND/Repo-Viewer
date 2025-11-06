import type React from "react";
import type { GitHubContent } from "@/types";

export interface VirtualListItemData {
  contents: GitHubContent[];
  downloadingPath: string | null;
  downloadingFolderPath: string | null;
  folderDownloadProgress: number;
  handleItemClick: (item: GitHubContent) => void;
  handleDownloadClick: (e: React.MouseEvent, item: GitHubContent) => void;
  handleFolderDownloadClick: (e: React.MouseEvent, item: GitHubContent) => void;
  handleCancelDownload: (e: React.MouseEvent) => void;
  currentPath: string;
  isScrolling: boolean;
  scrollSpeed: number;
  highlightedIndex: number | null;
}

export interface FileListLayoutMetrics {
  height: number;
  needsScrolling: boolean;
}

