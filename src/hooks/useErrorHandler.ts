import { useCallback, useEffect, useState, useMemo } from 'react';
import { useSnackbar } from 'notistack';
import { ErrorManager } from '@/utils/error';
import type { AppError } from '@/types/errors';
import { ErrorLevel, ErrorCategory, isNetworkError, isGitHubError, isFileOperationError } from '@/types/errors';
import { getDeveloperConfig } from '@/config';
import { logger } from '@/utils';

/**
 * 错误处理器配置选项
 */
export interface UseErrorHandlerOptions {
  /** 是否显示通知 */
  showNotification?: boolean;
  /** 是否在控制台记录日志 */
  logToConsole?: boolean;
  /** 后备错误消息 */
  fallbackMessage?: string;
}

/**
 * 错误处理器返回值接口
 */
export interface ErrorHandlerReturn {
  /** 处理错误的函数 */
  handleError: (error: Error | AppError, context?: string) => void;
  /** 处理异步错误的函数 */
  handleAsyncError: <T>(promise: Promise<T>, context?: string) => Promise<T | null>;
  /** 清除错误的函数 */
  clearErrors: () => void;
  /** 错误列表 */
  errors: AppError[];
  /** 是否有错误 */
  hasErrors: boolean;
  /** 最后一个错误 */
  lastError: AppError | null;
}

const developerSettings = getDeveloperConfig();
const defaultOptions: UseErrorHandlerOptions = {
  showNotification: true,
  logToConsole: developerSettings.mode || developerSettings.consoleLogging,
  fallbackMessage: '操作失败，请稍后重试'
};

/**
 * 错误处理Hook
 *
 * 提供统一的错误处理功能，包括错误捕获、用户通知和日志记录。
 * 支持自动清理过期错误和异步错误处理。
 *
 * @param globalOptions - 错误处理配置选项
 * @returns 错误处理器对象
 */
export function useErrorHandler(
  globalOptions: UseErrorHandlerOptions = defaultOptions
): ErrorHandlerReturn {
  const { enqueueSnackbar } = useSnackbar();
  const [errors, setErrors] = useState<AppError[]>([]);

  const resolvedOptions: Required<UseErrorHandlerOptions> = useMemo(() => ({
    showNotification: globalOptions.showNotification ?? defaultOptions.showNotification ?? true,
    logToConsole: globalOptions.logToConsole ?? defaultOptions.logToConsole ?? false,
    fallbackMessage: globalOptions.fallbackMessage ?? defaultOptions.fallbackMessage ?? '未知错误'
  }), [globalOptions.showNotification, globalOptions.logToConsole, globalOptions.fallbackMessage]);

  // 获取用户友好的错误消息
  const getUserFriendlyMessage = useCallback((error: AppError): string => {
    switch (error.category) {
      case ErrorCategory.NETWORK: {
        if (isNetworkError(error) && error.timeout === true) {
          return '请求超时，请检查网络连接';
        }
        return '网络连接失败，请稍后重试';
      }

      case ErrorCategory.API: {
        if (isGitHubError(error)) {
          if (error.statusCode === 403) {
            return 'API访问受限，请检查访问权限';
          }
          if (error.statusCode === 404) {
            return '请求的资源未找到';
          }
          if (error.statusCode >= 500) {
            return '服务器错误，请稍后重试';
          }
        }
        const apiMessage = error.message.trim();
        return apiMessage !== '' ? apiMessage : '请求失败';
      }

      case ErrorCategory.FILE_OPERATION: {
        if (isFileOperationError(error)) {
          switch (error.operation) {
            case 'download':
              return '文件下载失败，请重试';
            case 'compress':
              return '文件压缩失败，可能文件过大';
            case 'parse':
              return '文件解析失败，格式可能不支持';
            default:
              return '文件操作失败';
          }
        }
        return '文件操作失败';
      }

      case ErrorCategory.COMPONENT:
        return '页面组件出错，请刷新页面';

      case ErrorCategory.VALIDATION:
        return '输入数据有误，请检查后重试';

      default:
        const fallbackMessage = resolvedOptions.fallbackMessage;
        const baseMessage = error.message.trim();
        return baseMessage !== '' ? baseMessage : fallbackMessage;
    }
  }, [resolvedOptions.fallbackMessage]);

  // 获取通知严重级别
  const getNotificationVariant = useCallback((level: ErrorLevel): 'default' | 'error' | 'success' | 'warning' | 'info' => {
    switch (level) {
      case ErrorLevel.CRITICAL:
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
      action: context ?? 'unknown'
    });

    // 添加到本地错误状态
    setErrors(prev => [appError, ...prev.slice(0, 9)]); // 保留最近10个错误

    // 显示用户通知
    if (resolvedOptions.showNotification) {
      const message = getUserFriendlyMessage(appError);
      const variant = getNotificationVariant(appError.level);

      enqueueSnackbar(message, {
        variant,
        persist: appError.level === ErrorLevel.CRITICAL,
        preventDuplicate: true
      });
    }

    // 开发者模式下的额外日志
    const developerConfig = getDeveloperConfig();
    const shouldLog = developerConfig.consoleLogging ||
      (developerConfig.mode && resolvedOptions.logToConsole);

    if (shouldLog) {
      if (typeof logger.group === 'function') {
        logger.group(`🚨 错误处理 [${appError.category}]`);
      }
      logger.error('错误详情:', appError);
      logger.error('原始错误:', error);
      logger.error('上下文:', context);
      if (typeof logger.groupEnd === 'function') {
        logger.groupEnd();
      }
    }
  }, [
    resolvedOptions,
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
      setErrors(prev => prev.filter((errorItem) =>
        now - errorItem.timestamp < 5 * 60 * 1000 // 5分钟后清理
      ));
    }, 60000); // 每分钟检查一次

    return () => {
      clearInterval(cleanup);
    };
  }, []);

  return {
    handleError,
    handleAsyncError,
    clearErrors,
    errors,
    hasErrors: errors.length > 0,
    lastError: errors[0] ?? null
  };
}

/**
 * 全局错误处理Hook
 *
 * 监听全局错误事件和未处理的Promise拒绝，自动捕获并处理。
 *
 * @returns 错误处理器对象
 */
export function useGlobalErrorHandler(): ErrorHandlerReturn {
  const globalDeveloperConfig = getDeveloperConfig();
  const errorHandler = useErrorHandler({
    showNotification: false, // 全局错误不显示通知
    logToConsole: globalDeveloperConfig.mode || globalDeveloperConfig.consoleLogging
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
