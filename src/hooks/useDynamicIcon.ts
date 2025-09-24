import { useState, useEffect } from 'react';
import { getCurrentThemeName } from '../theme/index';
import { logger } from '../utils';

const themeIconMap: Record<string, string> = {
  '默认': '/icons/icon-pink.svg',
  '蓝色': '/icons/icon-blue.svg',
  '绿色': '/icons/icon-green.svg',
  '紫色': '/icons/icon-purple.svg',
  '橙色': '/icons/icon-orange.svg',
  '红色': '/icons/icon-red.svg',
  '青色': '/icons/icon-cyan.svg',
};

/**
 * 动态图标Hook - 根据当前主题返回对应的图标路径
 */
export const useDynamicIcon = () => {
  const [iconPath, setIconPath] = useState<string>('/icons/icon-pink.svg');

  const updateIcon = () => {
    try {
      const currentTheme = getCurrentThemeName();
      const themePath = themeIconMap[currentTheme];

      if (themePath) {
        setIconPath(themePath);
      } else {
        setIconPath('/icons/icon-pink.svg');
      }
    } catch (error) {
      logger.error('获取当前主题名称失败:', error);
      setIconPath('/icons/icon-pink.svg');
    }
  };

  useEffect(() => {
    logger.info('🎯 初始化动态图标系统...');

    // 初始化图标
    updateIcon();

    // 定期检查主题变化（作为备用机制）
    const intervalCheck = setInterval(() => {
      updateIcon();
    }, 2000);

    // 监听主题变化
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'data-theme' || 
             mutation.attributeName === 'class')) {
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
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'colorMode' || e.key === 'themeData' || e.key === 'lastThemeColorDate') {
        logger.debug('🔄 通过localStorage检测到主题变化:', e.key);
        setTimeout(updateIcon, 100);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      observer.disconnect();
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(intervalCheck);
    };
  }, []);

  return {
    iconPath,
    updateIcon,
    getCurrentThemeIconPath: () => {
      const currentTheme = getCurrentThemeName();
      return themeIconMap[currentTheme] || '/icons/icon-pink.svg';
    }
  };
};

/**
 * 动态更新网站favicon
 */
export const useFaviconUpdater = () => {
  const { iconPath } = useDynamicIcon();

  useEffect(() => {
    const updateFavicon = () => {
      // 移除所有现有的favicon相关链接
      const existingFavicons = document.querySelectorAll('link[rel*="icon"]');
      existingFavicons.forEach(link => {
        const linkElement = link as HTMLLinkElement;
        logger.debug('🗑️ 移除现有的favicon:', linkElement.href);
        link.remove();
      });

      // 强制等待一点时间确保DOM更新
      setTimeout(() => {
        const timestamp = Date.now();

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
        const link = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
        if (link) {
          link.href = link.href;
        }
      }, 10);
    };

    updateFavicon();
  }, [iconPath]);

  return iconPath;
};
