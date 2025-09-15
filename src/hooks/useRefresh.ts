import { useCallback, useRef, useEffect } from 'react';
import { useGitHub } from '../contexts/GitHubContext';
import { removeLatexElements, restoreLatexElements } from '../utils/latexOptimizer';
import { logger } from '../utils';

const MIN_ANIMATION_DURATION = 600;

export const useRefresh = () => {
  const { refresh, loading } = useGitHub();
  const refreshTimerRef = useRef<number | null>(null);
  const refreshingRef = useRef<boolean>(false);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (refreshingRef.current && !loading) {
      logger.info('内容加载完成，计算动画剩余时间');
      const elapsedTime = Date.now() - startTimeRef.current;
      const remainingTime = Math.max(MIN_ANIMATION_DURATION - elapsedTime, 0);
      logger.debug(`加载用时: ${elapsedTime}ms, 剩余动画时间: ${remainingTime}ms`);
      setTimeout(() => {
        document.body.classList.remove('theme-transition');
        document.body.classList.remove('refreshing');
        setTimeout(() => {
          refreshingRef.current = false;
          setTimeout(() => {
            restoreLatexElements();
          }, 100);
        }, 50);
      }, remainingTime + 50);
    }
  }, [loading]);
  
  const handleRefresh = useCallback(() => {
    const isThemeChangeOnly = document.documentElement.getAttribute('data-theme-change-only') === 'true';
    if (isThemeChangeOnly) {
      logger.info('检测到主题切换操作，跳过内容刷新');
      return;
    }
    
    if (document.body.classList.contains('theme-transition') || 
        document.body.classList.contains('refreshing') ||
        refreshingRef.current) {
      return;
    }
    
    removeLatexElements();
    
    setTimeout(() => {
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
          setTimeout(() => {
            refreshingRef.current = false;
            setTimeout(() => {
              restoreLatexElements();
            }, 100);
          }, 50);
        }
      }, 3000);
    }, 10);
  }, [refresh]);
  return handleRefresh;
}; 