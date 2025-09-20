import { useState, useCallback, useRef, useEffect } from 'react';
import type { UseImagePreviewReturn, ImagePreviewProps } from '../types';

/**
 * 图片预览功能的自定义Hook
 * 管理图片预览的状态和交互逻辑
 */
export const useImagePreview = ({
  isFullScreen = false,
  thumbnailMode = false,
  lazyLoad = true,
  onClose,
}: Pick<ImagePreviewProps, 'isFullScreen' | 'thumbnailMode' | 'lazyLoad' | 'onClose'>): UseImagePreviewReturn => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);
  const [fullScreenMode, setFullScreenMode] = useState<boolean>(isFullScreen);
  const [showPreview, setShowPreview] = useState<boolean>(!thumbnailMode);
  const [scale, setScale] = useState<number>(1);
  const [shouldLoad, setShouldLoad] = useState<boolean>(!lazyLoad);

  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 设置IntersectionObserver监听图片元素
  useEffect(() => {
    if (!lazyLoad) return;

    // 创建观察器实例
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShouldLoad(true);
          // 一旦图片开始加载，就停止观察
          if (observerRef.current && imgRef.current) {
            observerRef.current.unobserve(imgRef.current);
          }
        }
      },
      {
        root: null,
        rootMargin: '100px', // 提前100px开始加载
        threshold: 0.1,
      },
    );

    // 开始观察
    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [lazyLoad]);

  const handleReset = useCallback((resetFunc: () => void) => {
    resetFunc();
    setRotation(0);
    setError(false);
    setLoading(true);
    setScale(1);
  }, []);

  const handleRotateLeft = useCallback(() => {
    setRotation((prev) => prev - 90);
  }, []);

  const handleRotateRight = useCallback(() => {
    setRotation((prev) => prev + 90);
  }, []);

  const toggleFullScreen = useCallback(() => {
    setFullScreenMode((prev) => !prev);
  }, []);

  const handleOpenPreview = useCallback(() => {
    setShowPreview(true);
  }, []);

  const handleClosePreview = useCallback(() => {
    if (thumbnailMode) {
      setShowPreview(false);
    }

    if (fullScreenMode) {
      setFullScreenMode(false);
    }

    if (onClose) onClose();
  }, [thumbnailMode, fullScreenMode, onClose]);

  const handleImageLoad = useCallback(() => {
    setLoading(false);
  }, []);

  const handleImageError = useCallback(() => {
    setLoading(false);
    setError(true);
  }, []);

  const handleTransformed = useCallback((newScale: number) => {
    setScale(newScale);
  }, []);

  return {
    loading,
    error,
    rotation,
    fullScreenMode,
    showPreview,
    scale,
    shouldLoad,
    imgRef,
    handleReset,
    handleRotateLeft,
    handleRotateRight,
    toggleFullScreen,
    handleOpenPreview,
    handleClosePreview,
    handleImageLoad,
    handleImageError,
    handleTransformed,
    setError,
  };
};
