import { useCallback, useEffect, useState } from 'react';
import type { TouchEvent as ReactTouchEvent } from 'react';

interface UseTouchNavigationParams {
  isSmallScreen: boolean;
  currentScale: number;
  hasError: boolean;
  loading: boolean;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious?: (() => void) | undefined;
  onNext?: (() => void) | undefined;
  imageUrl: string;
}

interface UseTouchNavigationResult {
  dragOffset: number;
  isDragging: boolean;
  handleTouchStart: (e: ReactTouchEvent) => void;
  handleTouchMove: (e: ReactTouchEvent) => void;
  handleTouchEnd: () => void;
}

export const useTouchNavigation = ({
  isSmallScreen,
  currentScale,
  hasError,
  loading,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  imageUrl,
}: UseTouchNavigationParams): UseTouchNavigationResult => {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setDragOffset(0);
    setIsDragging(false);
  }, [imageUrl]);

  const handleTouchStart = useCallback((e: ReactTouchEvent): void => {
    if (!isSmallScreen || currentScale !== 1 || hasError || loading) {
      return;
    }

    const touch = e.touches[0];
    if (touch !== undefined) {
      setTouchStart({
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      });
    }
  }, [isSmallScreen, currentScale, hasError, loading]);

  const handleTouchMove = useCallback((e: ReactTouchEvent): void => {
    if (touchStart === null || !isSmallScreen || currentScale !== 1 || hasError || loading) {
      return;
    }

    const touch = e.touches[0];
    if (touch === undefined) {
      return;
    }

    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      setIsDragging(true);

      let offset = deltaX;

      if (!hasPrevious && deltaX > 0) {
        offset = deltaX * 0.3;
      }

      if (!hasNext && deltaX < 0) {
        offset = deltaX * 0.3;
      }

      setDragOffset(offset);
    }
  }, [touchStart, isSmallScreen, currentScale, hasError, loading, hasPrevious, hasNext]);

  const handleTouchEnd = useCallback((): void => {
    if (touchStart === null || !isSmallScreen || currentScale !== 1 || hasError || loading) {
      setTouchStart(null);
      setDragOffset(0);
      setIsDragging(false);
      return;
    }

    const threshold = 80;
    const duration = Date.now() - touchStart.time;
    const velocity = Math.abs(dragOffset) / duration;

    if ((Math.abs(dragOffset) > threshold) || (velocity > 0.5 && Math.abs(dragOffset) > 30)) {
      if (dragOffset > 0 && hasPrevious && onPrevious !== undefined) {
        onPrevious();
      } else if (dragOffset < 0 && hasNext && onNext !== undefined) {
        onNext();
      }
    }

    setTouchStart(null);
    setDragOffset(0);
    setIsDragging(false);
  }, [touchStart, isSmallScreen, currentScale, hasError, loading, dragOffset, hasPrevious, hasNext, onPrevious, onNext]);

  return {
    dragOffset,
    isDragging,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
};

