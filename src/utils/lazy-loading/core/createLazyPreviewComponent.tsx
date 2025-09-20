import React, { Suspense, lazy, ComponentType } from 'react';
import { DefaultLoadingFallback } from '../components/DefaultLoadingFallback';
import { LazyLoadErrorBoundary } from '../components/LazyLoadErrorBoundary';
import type { LazyPreviewOptions } from '../types';

/**
 * 创建懒加载的预览组件包装器
 * @param importFn 动态导入函数，返回 Promise<{ default: ComponentType }>
 * @param options 懒加载选项
 * @returns 懒加载的组件
 */
export function createLazyPreviewComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyPreviewOptions = {}
) {
  const LazyComponent = lazy(importFn);

  const WrappedComponent: React.FC<React.ComponentProps<T>> = (props) => {
    const fallback = options.fallback || (
      <DefaultLoadingFallback {...(options.loadingText ? { loadingText: options.loadingText } : {})} />
    );

    return (
      <LazyLoadErrorBoundary>
        <Suspense fallback={fallback}>
          <LazyComponent {...props} />
        </Suspense>
      </LazyLoadErrorBoundary>
    );
  };

  const match = importFn.toString().match(/["'](.*?)[""]/);
  const componentName = match ? match[1] : 'LazyPreviewComponent';
  WrappedComponent.displayName = `Lazy(${componentName})`;

  return WrappedComponent;
}
