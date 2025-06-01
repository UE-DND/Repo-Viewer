import { useState, useEffect, useMemo } from 'react';
import { PaletteMode } from '@mui/material';
import { logger } from '../utils';
import { removeLatexElements, restoreLatexElements } from '../utils/latexOptimizer';

// 获取当前是否应该使用深色模式
const shouldUseDarkMode = (): boolean => {
  const currentHour = new Date().getHours();
  return currentHour >= 18 || currentHour < 6; 
};

// 获取基于时间的模式
const getTimeBasedMode = (): PaletteMode => {
  return shouldUseDarkMode() ? 'dark' : 'light';
};

// 检查是否需要重新加载主题色（每两天更新一次）
const shouldRefreshThemeColor = (): boolean => {
  // 获取上次主题色更新日期
  const lastThemeColorDate = localStorage.getItem('lastThemeColorDate');
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0]; // 获取当前日期，格式：YYYY-MM-DD
  
  // 如果没有记录过更新日期，或者已经过了至少一天
  if (!lastThemeColorDate || lastThemeColorDate !== todayStr) {
    // 计算从1970年1月1日开始的天数
    const daysSince1970 = Math.floor(today.getTime() / (24 * 60 * 60 * 1000));
    
    // 如果是偶数天，需要更新主题色
    if (daysSince1970 % 2 === 0) {
      // 更新存储的日期
      localStorage.setItem('lastThemeColorDate', todayStr);
      return true;
    } else if (lastThemeColorDate !== todayStr) {
      // 不是更新日但仍需记录当前日期
      localStorage.setItem('lastThemeColorDate', todayStr);
    }
  }
  
  return false;
};

export const useThemeMode = () => {
  const [mode, setMode] = useState<PaletteMode>(() => {
    const savedThemeData = localStorage.getItem('themeData');
    if (savedThemeData) {
      try {
        const { mode, timestamp, isAutoMode } = JSON.parse(savedThemeData);
        const currentTime = new Date().getTime();
        const oneHour = 60 * 60 * 1000; 
        if (currentTime - timestamp < oneHour) {
          if (isAutoMode === false) {
            return mode;
          }
        }
      } catch (e) {
        logger.error('读取主题数据时出错:', e);
      }
    }
    return getTimeBasedMode();
  });

  const [isAutoMode, setIsAutoMode] = useState<boolean>(() => {
    const savedThemeData = localStorage.getItem('themeData');
    if (savedThemeData) {
      try {
        const { isAutoMode, timestamp } = JSON.parse(savedThemeData);
        const currentTime = new Date().getTime();
        const oneHour = 60 * 60 * 1000; 
        if (currentTime - timestamp < oneHour) {
          return isAutoMode !== undefined ? isAutoMode : true;
        }
      } catch {
        return true;
      }
    }
    return true; 
  });

  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // 检查是否需要更新主题色
  useEffect(() => {
    if (shouldRefreshThemeColor()) {
      logger.info('每隔一天更新主题色');
      // 通过重新设置相同的mode来触发主题重新加载（因为主题色是在创建主题时获取的）
      setTimeout(() => {
        setMode(prevMode => prevMode);
      }, 100);
    }
  }, []);

  // 初始自动模式检查
  useEffect(() => {
    if (isAutoMode) {
      const timeBasedMode = getTimeBasedMode();
      if (timeBasedMode !== mode) {
        setMode(timeBasedMode);
      }
    }
  }, []);

  // 添加一个标志来标记是主题切换还是内容刷新
  document.documentElement.setAttribute('data-theme-change-only', 'false');

  // 保存主题数据到本地存储
  useEffect(() => {
    const themeData = JSON.stringify({
      mode,
      timestamp: new Date().getTime(),
      isAutoMode
    });
    localStorage.setItem('themeData', themeData);
    
    // 使用更激进的优化：完全移除LaTeX元素
    removeLatexElements();
    
    // 添加极小延迟让浏览器准备好动画帧
    setTimeout(() => {
      // 标记这是一个仅主题切换的动作
      document.documentElement.setAttribute('data-theme-change-only', 'true');
      
      // 添加过渡类和设置数据属性
      setIsTransitioning(true);
      document.body.classList.add('theme-transition');
      document.documentElement.setAttribute('data-theme', mode);
      
      // 设置适当的过渡时间
      const transitionTimeout = setTimeout(() => {
        // 移除过渡类 - 分阶段恢复以确保更流畅的过渡
        document.body.classList.remove('theme-transition');
        
        // 在过渡结束后延迟一段时间再完全重置状态
        setTimeout(() => {
          setIsTransitioning(false);
          
          // 重置主题切换标志
          document.documentElement.setAttribute('data-theme-change-only', 'false');
          
          // 延迟通过批量处理恢复LaTeX元素
          setTimeout(() => {
            restoreLatexElements();
          }, 100);
        }, 50);
      }, 600); // 保持600ms的主过渡时间
      
      return () => clearTimeout(transitionTimeout);
    }, 10); // 极小的初始延迟
    
    return () => {}; // 空的清理函数
  }, [mode, isAutoMode]);

  // 自动主题切换
  useEffect(() => {
    if (!isAutoMode) return;
    
    // 计算到下一小时的时间
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);
    const timeToNextHour = nextHour.getTime() - now.getTime();
    
    // 设置第一次检查的定时器
    const checkTimeTimer = setTimeout(() => {
      const newTimeBasedMode = getTimeBasedMode();
      if (isAutoMode && newTimeBasedMode !== mode) {
        logger.info(`自动切换主题模式: ${mode} -> ${newTimeBasedMode}`);
        setMode(newTimeBasedMode);
      }
      
      // 设置每小时检查的间隔定时器
      const hourlyTimer = setInterval(() => {
        const newTimeBasedMode = getTimeBasedMode();
        if (isAutoMode && newTimeBasedMode !== mode) {
          logger.info(`自动切换主题模式: ${mode} -> ${newTimeBasedMode}`);
          setMode(newTimeBasedMode);
        }
      }, 3600000); // 1小时
      
      return () => clearInterval(hourlyTimer);
    }, timeToNextHour);
    
    return () => clearTimeout(checkTimeTimer);
  }, [isAutoMode, mode]);

  // 创建颜色模式对象
  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        if (!isTransitioning) {
          setIsAutoMode(false); // 手动切换时关闭自动模式
          const newMode = mode === 'light' ? 'dark' : 'light';
          logger.info(`手动切换主题模式: ${mode} -> ${newMode}`);
          setMode(newMode);
        }
      },
      toggleAutoMode: () => {
        if (!isTransitioning) {
          const newAutoMode = !isAutoMode;
          logger.info(`切换自动主题模式: ${isAutoMode} -> ${newAutoMode}`);
          setIsAutoMode(newAutoMode);
          if (newAutoMode) {
            const timeBasedMode = getTimeBasedMode();
            if (timeBasedMode !== mode) {
              setMode(timeBasedMode);
            }
          }
        }
      },
      mode,
      isAutoMode,
    }),
    [mode, isAutoMode, isTransitioning],
  );

  return colorMode;
}; 