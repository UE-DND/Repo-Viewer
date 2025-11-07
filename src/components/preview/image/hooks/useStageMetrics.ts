import { useMemo } from 'react';
import { DEFAULT_ASPECT_RATIO } from './useAspectRatioTracker';

interface ContainerSize {
  width: number;
  height: number;
}

interface StageMetrics {
  width: number;
  height: number;
  availableWidth: number;
  availableHeight: number;
}

interface UseStageMetricsParams {
  containerSize: ContainerSize;
  dominantAspectRatio: number;
  isSmallScreen: boolean;
}

export const useStageMetrics = ({
  containerSize,
  dominantAspectRatio,
  isSmallScreen,
}: UseStageMetricsParams): StageMetrics | null => {
  return useMemo(() => {
    if (containerSize.width <= 0 || containerSize.height <= 0) {
      return null;
    }

    const widthPadding = isSmallScreen ? 0.94 : 0.9;
    const heightPadding = isSmallScreen ? 0.85 : 0.8;

    const availableWidth = containerSize.width * widthPadding;
    const availableHeight = containerSize.height * heightPadding;

    if (availableWidth <= 0 || availableHeight <= 0) {
      return null;
    }

    const aspectRatio = dominantAspectRatio > 0 ? dominantAspectRatio : DEFAULT_ASPECT_RATIO;
    const width = Math.min(availableWidth, availableHeight * aspectRatio);
    const height = width / aspectRatio;

    return {
      width,
      height,
      availableWidth,
      availableHeight,
    };
  }, [containerSize.height, containerSize.width, dominantAspectRatio, isSmallScreen]);
};

