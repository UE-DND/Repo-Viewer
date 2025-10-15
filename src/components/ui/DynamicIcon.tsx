import React, { useEffect } from 'react';
import { useDynamicIcon, useFaviconUpdater } from '@/hooks/useDynamicIcon';
import { logger } from '@/utils';

interface DynamicIconProps {
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
  manageFavicon?: boolean;
}

export const DynamicIcon: React.FC<DynamicIconProps> = ({
  className,
  style,
  alt = "Repo Viewer Icon",
  manageFavicon = false
}) => {
  const { iconPath } = useDynamicIcon();

  useFaviconUpdater();

  useEffect(() => {
    if (manageFavicon) {
      logger.info('[DynamicIcon] 动态favicon系统初始化完成');
    }
  }, [manageFavicon]);

  return (
    <img
      src={iconPath}
      alt={alt}
      className={className}
      style={style}
      onError={(e) => {

        const target = e.target as HTMLImageElement;
        if (target.src !== '/icons/icon-pink.svg') {
          target.src = '/icons/icon-pink.svg';
        }
      }}
    />
  );
};

export const FaviconManager: React.FC = () => {
  useFaviconUpdater();

  // 添加调试信息
  React.useEffect(() => {
    logger.info('[FaviconManager] 初始化完成');
  }, []);

  return null;
};

export default DynamicIcon;
