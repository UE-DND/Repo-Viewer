import { useState, useEffect, useMemo } from 'react';
import { PaletteMode } from '@mui/material';
import { logger } from '../utils';
import { removeLatexElements, restoreLatexElements } from '../utils/rendering/latexOptimizer';

const shouldUseDarkMode = (): boolean => {
  const currentHour = new Date().getHours();
  return currentHour >= 18 || currentHour < 6; 
};

const getTimeBasedMode = (): PaletteMode => {
  return shouldUseDarkMode() ? 'dark' : 'light';
};

// 每两天更新一次主题色
const shouldRefreshThemeColor = (): boolean => {
  const lastThemeColorDate = localStorage.getItem('lastThemeColorDate');
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  
  if (!lastThemeColorDate || lastThemeColorDate !== todayStr) {
    const daysSince1970 = Math.floor(today.getTime() / (24 * 60 * 60 * 1000));
    
    if (daysSince1970 % 2 === 0) {
      localStorage.setItem('lastThemeColorDate', todayStr);
      return true;
    } else if (lastThemeColorDate !== todayStr) {
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
  
  useEffect(() => {
    if (shouldRefreshThemeColor()) {
      logger.info('每隔一天更新主题色');
      setTimeout(() => {
        setMode(prevMode => prevMode);
      }, 100);
    }
  }, []);

  useEffect(() => {
    if (isAutoMode) {
      const timeBasedMode = getTimeBasedMode();
      if (timeBasedMode !== mode) {
        setMode(timeBasedMode);
      }
    }
  }, []);

  document.documentElement.setAttribute('data-theme-change-only', 'false');

  useEffect(() => {
    const themeData = JSON.stringify({
      mode,
      timestamp: new Date().getTime(),
      isAutoMode
    });
    localStorage.setItem('themeData', themeData);
    
    removeLatexElements();
    
    setTimeout(() => {
      document.documentElement.setAttribute('data-theme-change-only', 'true');
      
      setIsTransitioning(true);
      document.body.classList.add('theme-transition');
      document.documentElement.setAttribute('data-theme', mode);
      
      const transitionTimeout = setTimeout(() => {
        document.body.classList.remove('theme-transition');
        
        setTimeout(() => {
          setIsTransitioning(false);
          
          document.documentElement.setAttribute('data-theme-change-only', 'false');
          
          setTimeout(() => {
            restoreLatexElements();
          }, 100);
        }, 50);
      }, 600);
      
      return () => clearTimeout(transitionTimeout);
    }, 10);
    
    return () => {};
  }, [mode, isAutoMode]);

  useEffect(() => {
    if (!isAutoMode) return;
    
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);
    const timeToNextHour = nextHour.getTime() - now.getTime();
    
    const checkTimeTimer = setTimeout(() => {
      const newTimeBasedMode = getTimeBasedMode();
      if (isAutoMode && newTimeBasedMode !== mode) {
        logger.info(`自动切换主题模式: ${mode} -> ${newTimeBasedMode}`);
        setMode(newTimeBasedMode);
      }
      
      const hourlyTimer = setInterval(() => {
        const newTimeBasedMode = getTimeBasedMode();
        if (isAutoMode && newTimeBasedMode !== mode) {
          logger.info(`自动切换主题模式: ${mode} -> ${newTimeBasedMode}`);
          setMode(newTimeBasedMode);
        }
      }, 3600000);
      
      return () => clearInterval(hourlyTimer);
    }, timeToNextHour);
    
    return () => clearTimeout(checkTimeTimer);
  }, [isAutoMode, mode]);

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        if (!isTransitioning) {
          setIsAutoMode(false);
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