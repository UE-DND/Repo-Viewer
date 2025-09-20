import type { ComponentType, ReactNode } from 'react';

/**
 * 预览组件懒加载包装器选项
 */
export interface LazyPreviewOptions {
  /** 加载提示文本 */
  loadingText?: string;
  /** 自定义加载组件 */
  fallback?: ReactNode;
  /** 错误边界组件 */
  errorBoundary?: ComponentType<{ error: Error; retry: () => void; children: ReactNode }>;
}

/**
 * 错误边界组件的Props类型
 */
export interface LazyLoadErrorBoundaryProps {
  children: ReactNode;
  onRetry?: () => void;
}

/**
 * 错误边界组件的State类型
 */
export interface LazyLoadErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}
