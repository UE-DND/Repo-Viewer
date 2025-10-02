import React, { Suspense, lazy } from 'react';
import type { ComponentType } from 'react';
import { DefaultLoadingFallback } from '../components/DefaultLoadingFallback';
import { LazyLoadErrorBoundary } from '../components/LazyLoadErrorBoundary';
import type { LazyPreviewOptions } from '../types';

export function createLazyPreviewComponent<P = Record<string, unknown>>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options: LazyPreviewOptions = {}
): React.FC<P> {
  const LazyComponent = lazy(importFn);

  const WrappedComponent: React.FC<P> = (props) => {
    const fallback = options.fallback ?? (
      <DefaultLoadingFallback {...(typeof options.loadingText === 'string' && options.loadingText.length > 0 ? { loadingText: options.loadingText } : {})} />
    );

    return (
      <LazyLoadErrorBoundary>
        <Suspense fallback={fallback}>
          <LazyComponent {...(props as P & Record<string, unknown>)} />
        </Suspense>
      </LazyLoadErrorBoundary>
    );
  };

  const matchResult = /["'](.*?)[""]/u.exec(importFn.toString());
  const componentName = matchResult?.[1] ?? 'LazyPreviewComponent';
  WrappedComponent.displayName = `Lazy(${componentName})`;

  return WrappedComponent;
}
