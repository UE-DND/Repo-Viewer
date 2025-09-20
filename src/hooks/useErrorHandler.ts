/**
 * 错误处理Hook - 简化版本
 * 提供统一的错误处理功能
 */

import { useCallback, useEffect, useState } from 'react';
import { useSnackbar } from 'notistack';
import { ErrorManager } from '../utils/error/ErrorManager';
import { 
  AppError, 
  ErrorLevel, 
  ErrorCategory, 
  GitHubError, 
  NetworkError, 
  FileOperationError 
} from '../types/errors';
import { isDeveloperMode } from '../config';

export interface UseErrorHandlerOptions {
  showNotification?: boolean;
  logToConsole?: boolean;
  fallbackMessage?: string;
}

export interface ErrorHandlerReturn {
  handleError: (error: Error | AppError, context?: string) => void;
  handleAsyncError: <T>(promise: Promise<T>, context?: string) => Promise<T | null>;
  clearErrors: () => void;
  errors: AppError[];
  hasErrors: boolean;
  lastError: AppError | null;
}

const defaultOptions: UseErrorHandlerOptions = {
  showNotification: true,
  logToConsole: isDeveloperMode(),
  fallbackMessage: '操作失败，请稍后重试'
};

export function useErrorHandler(
  globalOptions: UseErrorHandlerOptions = defaultOptions
): ErrorHandlerReturn {
  const { enqueueSnackbar } = useSnackbar();
  const [errors, setErrors] = useState<AppError[]>([]);

  // 获取用户友好的错误消息
  const getUserFriendlyMessage = useCallback((error: AppError): string => {
    switch (error.category) {
      case ErrorCategory.NETWORK:
        const networkError = error as NetworkError;
        if (networkError.timeout) {
          return '请求超时，请检查网络连接';
        }
        return '网络连接失败，请稍后重试';

      case ErrorCategory.API:
        const apiError = error as GitHubError;
        if (apiError.statusCode === 403) {
          return 'API访问受限，请检查访问权限';
        }
        if (apiError.statusCode === 404) {
          return '请求的资源未找到';
        }
        if (apiError.statusCode >= 500) {
          return '服务器错误，请稍后重试';
        }
        return error.message || '请求失败';

      case ErrorCategory.AUTH:
        return '认证失败，请检查访问令牌';

      case ErrorCategory.FILE_OPERATION:
        const fileError = error as FileOperationError;
        switch (fileError.operation) {
          case 'download':
            return '文件下载失败，请重试';
          case 'compress':
            return '文件压缩失败，可能文件过大';
          case 'parse':
            return '文件解析失败，格式可能不支持';
          default:
            return '文件操作失败';
        }

      case ErrorCategory.COMPONENT:
        return '页面组件出错，请刷新页面';

      case ErrorCategory.VALIDATION:
        return '输入数据有误，请检查后重试';

      default:
        return error.message || globalOptions.fallbackMessage || '未知错误';
    }
  }, [globalOptions.fallbackMessage]);

  // 获取通知严重级别
  const getNotificationVariant = useCallback((level: ErrorLevel): 'default' | 'error' | 'success' | 'warning' | 'info' => {
    switch (level) {
      case ErrorLevel.CRITICAL:
        return 'error';
      case ErrorLevel.ERROR:
        return 'error';
      case ErrorLevel.WARNING:
        return 'warning';
      case ErrorLevel.INFO:
        return 'info';
      default:
        return 'default';
    }
  }, []);

  // 主要错误处理函数
  const handleError = useCallback((
    error: Error | AppError,
    context?: string
  ): void => {
    // 使用ErrorManager处理错误
    const appError = ErrorManager.captureError(error, { 
      component: 'useErrorHandler',
      action: context || 'unknown'
    });

    // 添加到本地错误状态
    setErrors(prev => [appError, ...prev.slice(0, 9)]); // 保留最近10个错误

    // 显示用户通知
    if (globalOptions.showNotification) {
      const message = getUserFriendlyMessage(appError);
      const variant = getNotificationVariant(appError.level);
      
      enqueueSnackbar(message, {
        variant,
        persist: appError.level === ErrorLevel.CRITICAL,
        preventDuplicate: true
      });
    }

    // 开发者模式下的额外日志
    if (globalOptions.logToConsole && isDeveloperMode()) {
      console.group(`🚨 错误处理 [${appError.category}]`);
      console.error('错误详情:', appError);
      console.error('原始错误:', error);
      console.error('上下文:', context);
      console.groupEnd();
    }
  }, [
    globalOptions, 
    getUserFriendlyMessage, 
    getNotificationVariant, 
    enqueueSnackbar
  ]);

  // 异步错误处理包装器
  const handleAsyncError = useCallback(async <T>(
    promise: Promise<T>,
    context?: string
  ): Promise<T | null> => {
    try {
      return await promise;
    } catch (error) {
      handleError(error as Error, context);
      return null;
    }
  }, [handleError]);

  // 清理错误
  const clearErrors = useCallback((): void => {
    setErrors([]);
  }, []);

  // 自动清理过期错误
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setErrors(prev => prev.filter(error => 
        now - error.timestamp < 5 * 60 * 1000 // 5分钟后清理
      ));
    }, 60000); // 每分钟检查一次

    return () => clearInterval(cleanup);
  }, []);

  return {
    handleError,
    handleAsyncError,
    clearErrors,
    errors,
    hasErrors: errors.length > 0,
    lastError: errors[0] || null
  };
}

// 全局错误处理Hook
export function useGlobalErrorHandler(): ErrorHandlerReturn {
  const errorHandler = useErrorHandler({
    showNotification: false, // 全局错误不显示通知
    logToConsole: isDeveloperMode()
  });

  useEffect(() => {
    // 监听全局错误事件
    const handleGlobalError = (event: ErrorEvent): void => {
      errorHandler.handleError(
        new Error(event.message),
        'global_error'
      );
    };

    // 监听未处理的Promise拒绝
    const handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
      errorHandler.handleError(
        new Error(String(event.reason)),
        'unhandled_promise_rejection'
      );
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [errorHandler]);

  return errorHandler;
}
