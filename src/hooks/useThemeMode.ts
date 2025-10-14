import { useState, useEffect, useMemo, useRef } from 'react';
import type { PaletteMode } from '@mui/material';
import { logger } from '@/utils';
import { removeLatexElements, restoreLatexElements } from '@/utils/rendering/latexOptimizer';

const getSystemBasedMode = (): PaletteMode => {
  if (typeof window !== 'undefined') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    return mediaQuery.matches ? 'dark' : 'light';
  }
  return 'light';
};

const shouldRefreshThemeColor = (): boolean => {
  const lastThemeColorDate = localStorage.getItem('lastThemeColorDate');
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  if (lastThemeColorDate === null || lastThemeColorDate !== todayStr) {
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

export const useThemeMode = (): {
  toggleColorMode: () => void;
  toggleAutoMode: () => void;
  mode: PaletteMode;
  isAutoMode: boolean;
} => {
  const [mode, setMode] = useState<PaletteMode>(() => {
    const savedThemeData = localStorage.getItem('themeData');
    if (savedThemeData !== null) {
      try {
        const { mode, timestamp, isAutoMode } = JSON.parse(savedThemeData) as {
          mode: PaletteMode;
          timestamp: number;
          isAutoMode: boolean;
        };
        const currentTime = new Date().getTime();
        const oneHour = 60 * 60 * 1000;
        if (currentTime - timestamp < oneHour) {
          if (!isAutoMode) {
            return mode;
          }
        }
      } catch (e) {
        logger.error('读取主题数据时出错:', e);
      }
    }
    return getSystemBasedMode();
  });

  const [isAutoMode, setIsAutoMode] = useState<boolean>(() => {
    const savedThemeData = localStorage.getItem('themeData');
    if (savedThemeData !== null) {
      try {
        const { isAutoMode, timestamp } = JSON.parse(savedThemeData) as {
          isAutoMode?: boolean;
          timestamp: number;
        };
        const currentTime = new Date().getTime();
        const oneHour = 60 * 60 * 1000;
        if (currentTime - timestamp < oneHour) {
          return isAutoMode ?? true;
        }
      } catch {
        return true;
      }
    }
    return true;
  });

  const [isTransitioning, setIsTransitioning] = useState(false);
  const modeRef = useRef(mode);
  const isAutoModeRef = useRef(isAutoMode);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    isAutoModeRef.current = isAutoMode;
  }, [isAutoMode]);

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
      const systemBasedMode = getSystemBasedMode();
      if (systemBasedMode !== mode) {
        setMode(systemBasedMode);
      }
    }
  }, [isAutoMode, mode]);

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

      return () => {
        clearTimeout(transitionTimeout);
      };
    }, 10);

    return () => {
      // Cleanup function
    };
  }, [mode, isAutoMode]);

  useEffect(() => {
    if (!isAutoMode) {
      return;
    }

    // 监听系统主题变化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemThemeChange = (e: MediaQueryListEvent): void => {
      if (isAutoModeRef.current) {
        const newMode = e.matches ? 'dark' : 'light';
        const currentMode = modeRef.current;
        if (newMode !== currentMode) {
          logger.info(`系统主题变化，自动切换主题模式: ${currentMode} -> ${newMode}`);
          modeRef.current = newMode;
          setMode(newMode);
        }
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [isAutoMode]);

  return useMemo(
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
          logger.info(`切换自动主题模式: ${isAutoMode.toString()} -> ${newAutoMode.toString()}`);
          setIsAutoMode(newAutoMode);
          if (newAutoMode) {
            const systemBasedMode = getSystemBasedMode();
            if (systemBasedMode !== mode) {
              setMode(systemBasedMode);
            }
          }
        }
      },
      mode,
      isAutoMode,
    }),
    [mode, isAutoMode, isTransitioning],
  );
};
