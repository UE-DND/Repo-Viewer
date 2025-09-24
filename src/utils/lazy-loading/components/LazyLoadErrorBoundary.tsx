import React from 'react';
import { Box } from '@mui/material';
import type { LazyLoadErrorBoundaryProps, LazyLoadErrorBoundaryState } from '../types';
import { logger } from '../../logging/logger';

/**
 * 简单的错误边界组件
 * 用于处理懒加载组件的加载错误
 */
export class LazyLoadErrorBoundary extends React.Component<
  LazyLoadErrorBoundaryProps,
  LazyLoadErrorBoundaryState
> {
  constructor(props: LazyLoadErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): LazyLoadErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('懒加载组件错误:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    this.props.onRetry?.();
  };

  override render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '300px',
            gap: 2,
            p: 4,
            textAlign: 'center',
          }}
        >
          <Box sx={{ color: 'error.main', fontWeight: 600 }}>
            预览组件加载失败
          </Box>
          <Box sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
            {this.state.error?.message || '未知错误'}
          </Box>
          <Box
            component="button"
            onClick={this.handleRetry}
            sx={{
              mt: 2,
              px: 3,
              py: 1.5,
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              border: 'none',
              borderRadius: 1,
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              '&:hover': {
                backgroundColor: 'primary.dark',
              },
            }}
          >
            重试加载
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}
