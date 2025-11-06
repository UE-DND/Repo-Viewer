import {
  LIST_HEIGHT_CONFIG,
  TOP_ELEMENTS_ESTIMATE,
  BOTTOM_RESERVED_SPACE,
  VIEWPORT_FALLBACK_HEIGHT,
} from "./fileListConfig";
import type { FileListLayoutMetrics } from "./types";

interface LayoutMetricsParams {
  fileCount: number;
  rowHeight: number;
  isSmallScreen: boolean;
  hasReadmePreview: boolean;
  hoverExtraSpace: number;
  viewportHeight: number | null;
}

export const calculateLayoutMetrics = ({
  fileCount,
  rowHeight,
  isSmallScreen,
  hasReadmePreview,
  hoverExtraSpace,
  viewportHeight,
}: LayoutMetricsParams): FileListLayoutMetrics => {
  const effectiveViewport = Math.max(
    VIEWPORT_FALLBACK_HEIGHT,
    viewportHeight ?? VIEWPORT_FALLBACK_HEIGHT,
  );

  const maxAvailableHeight = Math.max(
    LIST_HEIGHT_CONFIG.minVisibleItems * rowHeight,
    effectiveViewport - TOP_ELEMENTS_ESTIMATE - BOTTOM_RESERVED_SPACE,
  );

  const contentHeight = fileCount * rowHeight;
  const requiresScroll =
    contentHeight > maxAvailableHeight || (!isSmallScreen && fileCount >= 10);

  if (!requiresScroll) {
    let paddingMultiplier;

    if (fileCount <= 2) {
      paddingMultiplier = isSmallScreen ? 12 : 20;
    } else if (fileCount <= 5) {
      paddingMultiplier = isSmallScreen ? 16 : 24;
    } else {
      paddingMultiplier = isSmallScreen ? 20 : 28;
    }

    const compactHeight = contentHeight + paddingMultiplier;
    const height = Math.min(compactHeight, maxAvailableHeight);

    return {
      height,
      needsScrolling: false,
    };
  }

  let scrollModeHeight: number;

  if (fileCount <= LIST_HEIGHT_CONFIG.maxVisibleItems) {
    scrollModeHeight = Math.min(
      contentHeight + hoverExtraSpace,
      maxAvailableHeight,
    );
  } else {
    scrollModeHeight = Math.min(
      LIST_HEIGHT_CONFIG.maxVisibleItems * rowHeight + hoverExtraSpace,
      maxAvailableHeight,
    );
  }

  if (hasReadmePreview) {
    let heightReduction;

    if (fileCount <= LIST_HEIGHT_CONFIG.veryFewItemsThreshold) {
      heightReduction = LIST_HEIGHT_CONFIG.readmePreviewHeightReduction.few;
    } else if (fileCount <= LIST_HEIGHT_CONFIG.maxVisibleItems) {
      heightReduction = LIST_HEIGHT_CONFIG.readmePreviewHeightReduction.normal;
    } else {
      heightReduction = LIST_HEIGHT_CONFIG.readmePreviewHeightReduction.many;
    }

    scrollModeHeight = Math.max(
      scrollModeHeight - heightReduction,
      LIST_HEIGHT_CONFIG.minVisibleItems * rowHeight,
    );
  }

  return {
    height: scrollModeHeight,
    needsScrolling: true,
  };
};

