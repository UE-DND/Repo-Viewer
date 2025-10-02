import { useState, useEffect, useMemo, useRef } from 'react';
import type { PaletteMode } from '@mui/material';
import { logger } from '@/utils';
import { removeLatexElements, restoreLatexElements } from '@/utils/rendering/latexOptimizer';

const shouldUseDarkMode = (): boolean => {
  const currentHour = new Date().getHours();
  return currentHour >= 18 || currentHour < 6;
};

const getTimeBasedMode = (): PaletteMode => {
  return shouldUseDarkMode() ? 'dark' : 'light';
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
    return getTimeBasedMode();
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
      const timeBasedMode = getTimeBasedMode();
      if (timeBasedMode !== mode) {
        setMode(timeBasedMode);
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

    let hourlyTimer: number | null = null;

    const scheduleAutoModeUpdate = (): void => {
      const newTimeBasedMode = getTimeBasedMode();
      const currentMode = modeRef.current;
      if (isAutoModeRef.current && newTimeBasedMode !== currentMode) {
        logger.info(`自动切换主题模式: ${currentMode} -> ${newTimeBasedMode}`);
        modeRef.current = newTimeBasedMode;
        setMode(newTimeBasedMode);
      }

      hourlyTimer = window.setInterval(() => {
        const nextMode = getTimeBasedMode();
        const latestMode = modeRef.current;
        if (isAutoModeRef.current && nextMode !== latestMode) {
          logger.info(`自动切换主题模式: ${latestMode} -> ${nextMode}`);
          modeRef.current = nextMode;
          setMode(nextMode);
        }
      }, 3600000);
    };

    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);
    const timeToNextHour = nextHour.getTime() - now.getTime();

    const checkTimeTimer = window.setTimeout(scheduleAutoModeUpdate, timeToNextHour);

    return () => {
      if (hourlyTimer !== null) {
        window.clearInterval(hourlyTimer);
      }
      window.clearTimeout(checkTimeTimer);
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
};
