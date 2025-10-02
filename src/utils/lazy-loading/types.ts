import type { ComponentType, ReactNode } from 'react';
export interface LazyPreviewOptions {
  loadingText?: string;
  fallback?: ReactNode;
  errorBoundary?: ComponentType<{ error: Error; retry: () => void; children: ReactNode }>;
}
export interface LazyLoadErrorBoundaryProps {
  children: ReactNode;
  onRetry?: () => void;
}
export interface LazyLoadErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}
