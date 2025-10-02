import { useCallback, useRef, useEffect } from 'react';
import { useContentContext } from '@/contexts/unified';
import { removeLatexElements, restoreLatexElements } from '@/utils/rendering/latexOptimizer';
import { logger } from '@/utils';

const MIN_ANIMATION_DURATION = 600;

export const useRefresh = () => {
  const { refresh, loading, currentPath } = useContentContext();
  const refreshTimerRef = useRef<number | null>(null);
  const refreshingRef = useRef<boolean>(false);
  const startTimeRef = useRef<number>(0);
  const currentPathRef = useRef(currentPath);
  const refreshTargetPathRef = useRef<string | null>(null);

  useEffect(() => {
    currentPathRef.current = currentPath;
  }, [currentPath]);

  useEffect(() => {
    if (refreshingRef.current && !loading) {
      logger.info('内容加载完成，计算动画剩余时间');
      const elapsedTime = Date.now() - startTimeRef.current;
      const remainingTime = Math.max(MIN_ANIMATION_DURATION - elapsedTime, 0);
      logger.debug(`加载用时: ${elapsedTime}ms, 剩余动画时间: ${remainingTime}ms`);

      const timeoutId = window.setTimeout(() => {
        document.body.classList.remove('theme-transition');
        document.body.classList.remove('refreshing');

        const expectedPath = refreshTargetPathRef.current;
        refreshTargetPathRef.current = null;

        if (expectedPath !== null && currentPathRef.current !== expectedPath) {
          logger.warn(`刷新结束时检测到目录已变更: 期望 ${expectedPath}，实际 ${currentPathRef.current}`);
        }

        window.setTimeout(() => {
          refreshingRef.current = false;
          window.setTimeout(() => {
            restoreLatexElements();
          }, 100);
        }, 50);
      }, remainingTime + 50);

      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }
      refreshTimerRef.current = timeoutId;
    }
  }, [loading]);

  return useCallback(() => {
    const isThemeChangeOnly = document.documentElement.getAttribute('data-theme-change-only') === 'true';
    if (isThemeChangeOnly) {
      logger.info('检测到主题切换操作，跳过内容刷新');
      return;
    }

    if (
      document.body.classList.contains('theme-transition') ||
      document.body.classList.contains('refreshing') ||
      refreshingRef.current
    ) {
      return;
    }

    removeLatexElements();
    refreshTargetPathRef.current = currentPathRef.current;

    window.setTimeout(() => {
      startTimeRef.current = Date.now();
      document.body.classList.add('theme-transition');
      document.body.classList.add('refreshing');
      refreshingRef.current = true;
      logger.info('刷新内容 - 使用与主题切换一致的动画效果');
      refresh();
      refreshTimerRef.current = window.setTimeout(() => {
        if (refreshingRef.current) {
          logger.warn('刷新动画安全超时结束');
          document.body.classList.remove('theme-transition');
          document.body.classList.remove('refreshing');
          window.setTimeout(() => {
            refreshingRef.current = false;
            window.setTimeout(() => {
              restoreLatexElements();
            }, 100);
          }, 50);
        }
      }, 3000);
    }, 10);
  }, [refresh]);
};
