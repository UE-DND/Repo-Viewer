import { useCallback, useRef, useEffect } from 'react';
import { useGitHub } from '../contexts/GitHubContext';
import { removeLatexElements, restoreLatexElements } from '../utils/latexOptimizer';
import { logger } from '../utils';

// 主题切换的最小动画时长（与useThemeMode.ts保持一致）
const MIN_ANIMATION_DURATION = 600;

// 刷新功能的自定义钩子
export const useRefresh = () => {
  // 使用refresh函数，该函数在GitHubContext中已经被映射到refreshContents
  const { refresh, loading } = useGitHub();
  const refreshTimerRef = useRef<number | null>(null);
  const refreshingRef = useRef<boolean>(false);
  const startTimeRef = useRef<number>(0);
  
  // 监控加载状态，确保内容加载完成后再结束动画，同时保证最小动画时长
  useEffect(() => {
    // 如果正在刷新且内容加载已完成
    if (refreshingRef.current && !loading) {
      logger.info('内容加载完成，计算动画剩余时间');
      
      // 计算已经过去的时间
      const elapsedTime = Date.now() - startTimeRef.current;
      
      // 计算需要额外等待的时间，确保动画总时长不小于MIN_ANIMATION_DURATION
      const remainingTime = Math.max(MIN_ANIMATION_DURATION - elapsedTime, 0);
      
      logger.debug(`加载用时: ${elapsedTime}ms, 剩余动画时间: ${remainingTime}ms`);
      
      // 等待剩余时间后结束动画
      setTimeout(() => {
        // 移除过渡类 - 分阶段恢复以确保更流畅的过渡
        document.body.classList.remove('theme-transition');
        document.body.classList.remove('refreshing');
        
        // 在过渡结束后延迟一段时间再完全重置状态
        setTimeout(() => {
          // 标记刷新已完成
          refreshingRef.current = false;
          
          // 延迟通过批量处理恢复LaTeX元素
          setTimeout(() => {
            restoreLatexElements();
          }, 100);
        }, 50);
      }, remainingTime + 50); // 额外添加50ms作为缓冲
    }
  }, [loading]);
  
  const handleRefresh = useCallback(() => {
    // 检查是否是主题切换操作，如果是则不执行刷新
    const isThemeChangeOnly = document.documentElement.getAttribute('data-theme-change-only') === 'true';
    if (isThemeChangeOnly) {
      logger.info('检测到主题切换操作，跳过内容刷新');
      return;
    }
    
    // 如果正在进行过渡动画，则不执行刷新
    if (document.body.classList.contains('theme-transition') || 
        document.body.classList.contains('refreshing') ||
        refreshingRef.current) {
      return;
    }
    
    // 使用更激进的优化：完全移除LaTeX元素
    removeLatexElements();
    
    // 添加极小延迟让浏览器准备好动画帧
    setTimeout(() => {
      // 记录动画开始时间
      startTimeRef.current = Date.now();
      
      // 添加过渡类 - 使用与主题切换相同的类
      document.body.classList.add('theme-transition');
      // 同时添加refreshing类用于区分是刷新操作
      document.body.classList.add('refreshing');
      
      // 标记正在刷新
      refreshingRef.current = true;
      
      logger.info('刷新内容 - 使用与主题切换一致的动画效果');
      
      // 执行实际刷新
      refresh();
      
      // 设置安全超时，即使加载状态没有变化，也不让动画永远持续
      refreshTimerRef.current = window.setTimeout(() => {
        if (refreshingRef.current) {
          logger.warn('刷新动画安全超时结束');
          
          // 移除过渡类 - 分阶段恢复以确保更流畅的过渡
          document.body.classList.remove('theme-transition');
          document.body.classList.remove('refreshing');
          
          // 在过渡结束后延迟一段时间再完全重置状态
          setTimeout(() => {
            // 标记刷新已完成
            refreshingRef.current = false;
            
            // 延迟通过批量处理恢复LaTeX元素
            setTimeout(() => {
              restoreLatexElements();
            }, 100);
          }, 50);
        }
      }, 3000); // 安全超时时间3秒
    }, 10); // 极小的初始延迟
    
  }, [refresh]);
  
  return handleRefresh;
}; 