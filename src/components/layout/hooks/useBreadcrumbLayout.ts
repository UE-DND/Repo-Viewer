import { useState, useEffect, useRef } from 'react';
import type { BreadcrumbSegment } from '@/types';

interface UseBreadcrumbLayoutOptions {
  breadcrumbSegments: BreadcrumbSegment[];
  isSmallScreen: boolean;
}

interface UseBreadcrumbLayoutReturn {
  breadcrumbsMaxItems: number;
  breadcrumbsContainerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * 面包屑布局 Hook
 *
 * 处理面包屑导航的响应式布局和折叠逻辑
 */
export function useBreadcrumbLayout({
  breadcrumbSegments,
  isSmallScreen
}: UseBreadcrumbLayoutOptions): UseBreadcrumbLayoutReturn {
  const breadcrumbsContainerRef = useRef<HTMLDivElement>(null);
  const [breadcrumbsMaxItems, setBreadcrumbsMaxItems] = useState<number>(0); // 0表示不限制

  useEffect(() => {
    const segmentCount = breadcrumbSegments.length;

    // 在移动端，使用更激进的折叠策略
    if (isSmallScreen) {
      if (segmentCount > 3) {
        setBreadcrumbsMaxItems(3);
      } else {
        setBreadcrumbsMaxItems(0);
      }
      return;
    }

    // 桌面端逻辑
    if (segmentCount <= 3) {
      setBreadcrumbsMaxItems(0);
      return;
    }

    // 监听容器尺寸变化
    const resizeObserver = new ResizeObserver(() => {
      const container = breadcrumbsContainerRef.current;

      if (container === null) {
        return;
      }

      // 如果路径太长，则设置限制
      if (breadcrumbSegments.length > 8) {
        setBreadcrumbsMaxItems(8);
        return;
      }

      // 不限制项目数量，使用CSS处理溢出
      setBreadcrumbsMaxItems(0);
    });

    if (breadcrumbsContainerRef.current !== null) {
      resizeObserver.observe(breadcrumbsContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [breadcrumbSegments, isSmallScreen]);

  return {
    breadcrumbsMaxItems,
    breadcrumbsContainerRef
  };
}

