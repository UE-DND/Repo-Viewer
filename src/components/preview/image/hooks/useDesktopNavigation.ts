import { useCallback, useState } from 'react';
import type { MouseEvent, RefObject } from 'react';

type ActiveNavSide = 'left' | 'right' | null;

interface UseDesktopNavigationParams {
  containerRef: RefObject<HTMLDivElement | null>;
  isSmallScreen: boolean;
  hasError: boolean;
  loading: boolean;
  hasPrevious: boolean;
  hasNext: boolean;
}

interface UseDesktopNavigationResult {
  activeNavSide: ActiveNavSide;
  handleContainerMouseMove: (e: MouseEvent<HTMLDivElement>) => void;
  handleContainerMouseLeave: () => void;
}

export const useDesktopNavigation = ({
  containerRef,
  isSmallScreen,
  hasError,
  loading,
  hasPrevious,
  hasNext,
}: UseDesktopNavigationParams): UseDesktopNavigationResult => {
  const [activeNavSide, setActiveNavSide] = useState<ActiveNavSide>(null);

  const handleContainerMouseMove = useCallback((e: MouseEvent<HTMLDivElement>): void => {
    if (isSmallScreen || hasError || loading) {
      setActiveNavSide(null);
      return;
    }

    const container = containerRef.current;
    if (container === null) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const threshold = 150;

    if (hasPrevious && x < threshold) {
      setActiveNavSide('left');
    } else if (hasNext && x > width - threshold) {
      setActiveNavSide('right');
    } else {
      setActiveNavSide(null);
    }
  }, [containerRef, isSmallScreen, hasError, loading, hasPrevious, hasNext]);

  const handleContainerMouseLeave = useCallback((): void => {
    setActiveNavSide(null);
  }, []);

  return {
    activeNavSide,
    handleContainerMouseMove,
    handleContainerMouseLeave,
  };
};

