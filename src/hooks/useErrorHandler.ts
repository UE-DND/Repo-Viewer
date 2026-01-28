import { useCallback, useEffect, useState, useMemo } from 'react';
import { useSnackbar } from 'notistack';
import { ErrorManager } from '@/utils/error';
import type { AppError } from '@/types/errors';
import { ErrorLevel, ErrorCategory, isNetworkError, isGitHubError, isFileOperationError } from '@/types/errors';
import { getDeveloperConfig } from '@/config';
import { logger } from '@/utils';
import { useI18n } from '@/contexts/I18nContext';

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
  fallbackMessage: 'error.default'
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
  const { t } = useI18n();

  const resolvedOptions: Required<UseErrorHandlerOptions> = useMemo(() => ({
    showNotification: globalOptions.showNotification ?? defaultOptions.showNotification ?? true,
    logToConsole: globalOptions.logToConsole ?? defaultOptions.logToConsole ?? false,
    fallbackMessage: globalOptions.fallbackMessage ?? defaultOptions.fallbackMessage ?? 'error.unknown'
  }), [globalOptions.showNotification, globalOptions.logToConsole, globalOptions.fallbackMessage]);

  // 获取用户友好的错误消息
  const getUserFriendlyMessage = useCallback((error: AppError): string => {
    switch (error.category) {
      case ErrorCategory.NETWORK: {
        if (isNetworkError(error) && error.timeout === true) {
          return t('error.network.timeout');
        }
        return t('error.network.connection');
      }

      case ErrorCategory.API: {
        if (isGitHubError(error)) {
          if (error.statusCode === 403) {
            return t('error.api.forbidden');
          }
          if (error.statusCode === 404) {
            return t('error.api.notFound');
          }
          if (error.statusCode >= 500) {
            return t('error.api.serverError');
          }
        }
        const apiMessage = error.message.trim();
        return apiMessage !== '' ? apiMessage : t('error.api.default');
      }

      case ErrorCategory.FILE_OPERATION: {
        if (isFileOperationError(error)) {
          switch (error.operation) {
            case 'download':
              return t('error.file.download');
            case 'compress':
              return t('error.file.compress');
            case 'parse':
              return t('error.file.parse');
            default:
              return t('error.file.default');
          }
        }
        return t('error.file.default');
      }

      case ErrorCategory.COMPONENT:
        return t('error.component');

      case ErrorCategory.VALIDATION:
        return t('error.validation');

      default:
        const fallbackKey = resolvedOptions.fallbackMessage;
        const baseMessage = error.message.trim();
        // 如果 fallbackMessage 是一个翻译键，使用翻译；否则直接使用
        if (fallbackKey.startsWith('error.')) {
          return baseMessage !== '' ? baseMessage : t(fallbackKey);
        }
        return baseMessage !== '' ? baseMessage : fallbackKey;
    }
  }, [resolvedOptions.fallbackMessage, t]);

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
