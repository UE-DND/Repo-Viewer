import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

/**
 * 主题切换状态 Hook
 *
 * 监听主题切换事件，返回可读的状态引用。
 */
export const useThemeTransitionFlag = (): RefObject<boolean> => {
  const isThemeChangingRef = useRef(false);

  useEffect(() => {
    const handleThemeChanging = (): void => {
      isThemeChangingRef.current = true;
    };

    const handleThemeChanged = (): void => {
      isThemeChangingRef.current = false;
    };

    window.addEventListener('theme:changing', handleThemeChanging);
    window.addEventListener('theme:changed', handleThemeChanged);

    return () => {
      window.removeEventListener('theme:changing', handleThemeChanging);
      window.removeEventListener('theme:changed', handleThemeChanged);
    };
  }, []);

  return isThemeChangingRef;
};
