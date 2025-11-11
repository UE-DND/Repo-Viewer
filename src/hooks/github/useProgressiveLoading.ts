import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface UseProgressiveLoadingOptions<T> {
  /** 异步加载函数 */
  loadFn: () => Promise<T>;
  /** 触发器（依赖项），变化时重新加载 */
  trigger?: unknown;
  /** 首次加载占位延迟（ms），默认 500 */
  initialPlaceholderDelay?: number;
  /** 二次加载占位延迟（ms），默认 300 */
  subsequentPlaceholderDelay?: number;
  /** 是否启用渐进式加载 */
  enabled?: boolean;
}

interface UseProgressiveLoadingReturn<T> {
  /** 加载状态 */
  loading: boolean;
  /** 错误信息 */
  error: Error | null;
  /** 加载的数据 */
  data: T | null;
  /** 是否显示占位符 */
  showPlaceholder: boolean;
  /** 重新加载 */
  reload: () => void;
}

/**
 * 渐进式加载 Hook
 *
 * - 首次加载：500ms 后才显示占位组件
 * - 二次加载：300ms 后显示占位组件
 * - 快速响应时不显示加载状态，减少闪烁
 */
export function useProgressiveLoading<T>({
  loadFn,
  trigger,
  initialPlaceholderDelay = 500,
  subsequentPlaceholderDelay = 300,
  enabled = true,
}: UseProgressiveLoadingOptions<T>): UseProgressiveLoadingReturn<T> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);
  const [showPlaceholder, setShowPlaceholder] = useState(false);

  const hasLoadedOnceRef = useRef(false);
  const placeholderTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  const clearPlaceholderTimer = useCallback(() => {
    if (placeholderTimerRef.current !== null) {
      window.clearTimeout(placeholderTimerRef.current);
      placeholderTimerRef.current = null;
    }
  }, []);

  const load = useCallback(async () => {
    if (!enabled) {
      return;
    }

    setLoading(true);
    setError(null);
    clearPlaceholderTimer();

    // 根据是否首次加载决定延迟时间
    const delay = hasLoadedOnceRef.current ? subsequentPlaceholderDelay : initialPlaceholderDelay;

    // 延迟显示占位符
    placeholderTimerRef.current = window.setTimeout(() => {
      if (isMountedRef.current) {
        setShowPlaceholder(true);
      }
    }, delay);

    try {
      const result = await loadFn();

      if (isMountedRef.current) {
        setData(result);
        setError(null);
        hasLoadedOnceRef.current = true;
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        clearPlaceholderTimer();
        setShowPlaceholder(false);
      }
    }
  }, [enabled, loadFn, initialPlaceholderDelay, subsequentPlaceholderDelay, clearPlaceholderTimer]);

  useEffect(() => {
    isMountedRef.current = true;
    void load();

    return () => {
      isMountedRef.current = false;
      clearPlaceholderTimer();
    };
  }, [trigger, load, clearPlaceholderTimer]);

  return useMemo(() => ({
    loading,
    error,
    data,
    showPlaceholder,
    reload: (): void => {
      void load();
    },
  }), [loading, error, data, showPlaceholder, load]);
}

