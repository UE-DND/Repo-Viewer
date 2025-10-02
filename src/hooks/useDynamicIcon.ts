import { useState, useEffect } from 'react';
import { getCurrentThemeName } from '@/theme/index';
import { logger } from '@/utils';

const DEFAULT_ICON = '/icons/icon-pink.svg';

const themeIconMap: Readonly<Record<string, string>> = {
  '默认': DEFAULT_ICON,
  '蓝色': '/icons/icon-blue.svg',
  '绿色': '/icons/icon-green.svg',
  '紫色': '/icons/icon-purple.svg',
  '橙色': '/icons/icon-orange.svg',
  '红色': '/icons/icon-red.svg',
  '青色': '/icons/icon-cyan.svg'
};

interface DynamicIconHook {
  iconPath: string;
  updateIcon: () => void;
  getCurrentThemeIconPath: () => string;
}

/**
 * 动态图标Hook - 根据当前主题返回对应的图标路径
 */
export const useDynamicIcon = (): DynamicIconHook => {
  const [iconPath, setIconPath] = useState<string>(DEFAULT_ICON);

  const updateIcon = (): void => {
    try {
      const currentTheme = getCurrentThemeName();
      const themePath = themeIconMap[currentTheme] ?? DEFAULT_ICON;

      setIconPath(themePath);
    } catch (error) {
      logger.error('获取当前主题名称失败:', error);
      setIconPath(DEFAULT_ICON);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    logger.info('🎯 初始化动态图标系统...');

    // 初始化图标
    updateIcon();

    // 监听主题变化
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' &&
            (mutation.attributeName === 'data-theme' || mutation.attributeName === 'class')) {
          logger.debug('🔄 通过MutationObserver检测到主题变化');
          updateIcon();
        }
      });
    });

    // 监听document和html元素的属性变化
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class']
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-theme', 'class']
    });

    // 监听localStorage变化
    const handleStorageChange = (e: StorageEvent): void => {
      if (e.key === 'colorMode' || e.key === 'themeData' || e.key === 'lastThemeColorDate') {
        logger.debug('🔄 通过localStorage检测到主题变化:', e.key);
        setTimeout(updateIcon, 100);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      observer.disconnect();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return {
    iconPath,
    updateIcon,
    getCurrentThemeIconPath: (): string => {
      const currentTheme = getCurrentThemeName();
      return themeIconMap[currentTheme] ?? DEFAULT_ICON;
    }
  };
};

/**
 * 动态更新网站favicon
 */
export const useFaviconUpdater = (): string => {
  const { iconPath } = useDynamicIcon();

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const updateFavicon = (): void => {
      // 移除所有现有的favicon相关链接
      const existingFavicons = document.querySelectorAll('link[rel*="icon"]');
      existingFavicons.forEach((linkNode) => {
        if (linkNode instanceof HTMLLinkElement) {
          logger.debug('🗑️ 移除现有的favicon:', linkNode.href);
        }
        linkNode.remove();
      });

      // 强制等待一点时间确保DOM更新
      setTimeout(() => {
        const timestamp = Date.now().toString();

        // 创建主要的favicon链接
        const favicon = document.createElement('link');
        favicon.rel = 'icon';
        favicon.type = 'image/svg+xml';
        favicon.href = `${iconPath}?v=${timestamp}`;
        document.head.appendChild(favicon);

        // 创建备用的shortcut icon
        const shortcutIcon = document.createElement('link');
        shortcutIcon.rel = 'shortcut icon';
        shortcutIcon.type = 'image/svg+xml';
        shortcutIcon.href = `${iconPath}?v=${timestamp}`;
        document.head.appendChild(shortcutIcon);

        logger.info('✅ Favicon已更新为:', `${iconPath}?v=${timestamp}`);

        // 强制触发浏览器重新加载favicon
        const linkElement = document.querySelector('link[rel="icon"]');
        if (linkElement instanceof HTMLLinkElement) {
          linkElement.setAttribute('href', `${iconPath}?v=${timestamp}`);
        }
      }, 10);
    };

    updateFavicon();
  }, [iconPath]);

  return iconPath;
};
