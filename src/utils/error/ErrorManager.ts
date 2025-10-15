import type {
  AppError,
  BaseError,
  ErrorContext,
  ErrorHandlerConfig,
  APIError,
  NetworkError,
  GitHubError,
  ComponentError,
  FileOperationError
} from '@/types/errors';
import { ErrorLevel, ErrorCategory } from '@/types/errors';
import { logger } from '../logging/logger';
import { getDeveloperConfig } from '@/config';

/**
 * 错误管理器类
 * 
 * 统一管理应用中的错误，提供错误创建、捕获、记录和上报功能。
 * 支持多种错误类型，包括API错误、网络错误、组件错误和文件操作错误。
 */
class ErrorManagerClass {
  private errorHistory: AppError[] = [];
  private readonly maxHistorySize = 100;
  private sessionId: string = this.generateSessionId();

  private config: ErrorHandlerConfig = {
    enableConsoleLogging: (() => {
      const developerConfig = getDeveloperConfig();
      return developerConfig.mode || developerConfig.consoleLogging;
    })(),
    enableErrorReporting: false, // 生产环境可开启
    maxErrorsPerSession: 50,
    retryAttempts: 3,
    retryDelay: 1000
  };

  // 生成会话ID
  private generateSessionId(): string {
    return `${Date.now().toString()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  // 获取基础错误上下文
  private getBaseContext(): ErrorContext {
    return {
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: Date.now(),
    };
  }

  // 创建基础错误对象
  private createBaseError(
    code: string,
    message: string,
    level: ErrorLevel,
    category: ErrorCategory,
    context?: Record<string, unknown>
  ): BaseError {
    return {
      code,
      message,
      level,
      category,
      timestamp: Date.now(),
      context: { ...this.getBaseContext(), ...(context ?? {}) },
      sessionId: this.sessionId
    };
  }

  /**
   * 捕获并处理错误
   * 
   * 将普通Error转换为AppError，记录到历史并可选地上报。
   * 
   * @param error - Error对象或AppError对象
   * @param context - 额外的错误上下文信息
   * @returns 处理后的AppError对象
   */
  public captureError(error: Error | AppError, context?: ErrorContext): AppError {
    let appError: AppError;

    // 如果已经是AppError，直接使用
    if (this.isAppError(error)) {
      appError = error;
    } else {
      // 转换普通Error为AppError
      appError = this.createBaseError(
        error.name.length > 0 ? error.name : 'UnknownError',
        error.message.length > 0 ? error.message : '未知错误',
        ErrorLevel.ERROR,
        ErrorCategory.SYSTEM,
        {
          ...context,
          stack: error.stack,
          originalError: error.constructor.name
        }
      ) as AppError;
    }

    // 添加到错误历史
    this.addToHistory(appError);

    // 记录错误
    this.logError(appError);

    // 上报错误（如果启用）
    if (this.config.enableErrorReporting) {
      void this.reportError(appError);
    }

    return appError;
  }

  /**
   * 创建API错误
   * 
   * @param message - 错误消息
   * @param statusCode - HTTP状态码
   * @param endpoint - API端点
   * @param method - HTTP方法
   * @param context - 额外的上下文信息
   * @returns API错误对象
   */
  public createAPIError(
    message: string,
    statusCode: number,
    endpoint: string,
    method: string,
    context?: Record<string, unknown>
  ): APIError {
    const baseError = this.createBaseError(
      `API_ERROR_${statusCode.toString()}`,
      message,
      this.getErrorLevelByStatusCode(statusCode),
      ErrorCategory.API,
      context
    );

    return {
      ...baseError,
      category: ErrorCategory.API,
      statusCode,
      endpoint,
      method
    };
  }

  /**
   * 创建GitHub特定错误
   * 
   * @param message - 错误消息
   * @param statusCode - HTTP状态码
   * @param endpoint - API端点
   * @param method - HTTP方法
   * @param rateLimitInfo - Rate limit信息
   * @param context - 额外的上下文信息
   * @returns GitHub错误对象
   */
  public createGitHubError(
    message: string,
    statusCode: number,
    endpoint: string,
    method: string,
    rateLimitInfo?: { remaining: number; reset: number },
    context?: Record<string, unknown>
  ): GitHubError {
    const apiError = this.createAPIError(message, statusCode, endpoint, method, context);

    const rateLimitProps = rateLimitInfo !== undefined
      ? {
          ...(typeof rateLimitInfo.remaining === 'number' ? { rateLimitRemaining: rateLimitInfo.remaining } : {}),
          ...(typeof rateLimitInfo.reset === 'number' ? { rateLimitReset: rateLimitInfo.reset } : {}),
        }
      : {};

    return {
      ...apiError,
      ...rateLimitProps,
      documentationUrl: 'https://docs.github.com/en/rest'
    };
  }

  /**
   * 创建网络错误
   * 
   * @param message - 错误消息
   * @param url - 请求URL
   * @param timeout - 是否为超时错误
   * @param retryCount - 重试次数
   * @param context - 额外的上下文信息
   * @returns 网络错误对象
   */
  public createNetworkError(
    message: string,
    url: string,
    timeout = false,
    retryCount = 0,
    context?: Record<string, unknown>
  ): NetworkError {
    const baseError = this.createBaseError(
      timeout ? 'NETWORK_TIMEOUT' : 'NETWORK_ERROR',
      message,
      ErrorLevel.ERROR,
      ErrorCategory.NETWORK,
      context
    );

    return {
      ...baseError,
      category: ErrorCategory.NETWORK,
      url,
      timeout,
      retryCount
    };
  }

  /**
   * 创建组件错误
   * 
   * @param componentName - 组件名称
   * @param message - 错误消息
   * @param props - 组件属性
   * @param context - 额外的上下文信息
   * @returns 组件错误对象
   */
  public createComponentError(
    componentName: string,
    message: string,
    props?: Record<string, unknown>,
    context?: Record<string, unknown>
  ): ComponentError {
    const baseError = this.createBaseError(
      'COMPONENT_ERROR',
      message,
      ErrorLevel.ERROR,
      ErrorCategory.COMPONENT,
      context
    );

    return {
      ...baseError,
      category: ErrorCategory.COMPONENT,
      componentName,
      ...(props !== undefined ? { props } : {})
    };
  }

  /**
   * 创建文件操作错误
   * 
   * @param fileName - 文件名
   * @param operation - 操作类型
   * @param message - 错误消息
   * @param fileSize - 文件大小（可选）
   * @param context - 额外的上下文信息
   * @returns 文件操作错误对象
   */
  public createFileOperationError(
    fileName: string,
    operation: 'read' | 'write' | 'download' | 'compress' | 'parse',
    message: string,
    fileSize?: number,
    context?: Record<string, unknown>
  ): FileOperationError {
    const baseError = this.createBaseError(
      `FILE_${operation.toUpperCase()}_ERROR`,
      message,
      ErrorLevel.ERROR,
      ErrorCategory.FILE_OPERATION,
      context
    );

    return {
      ...baseError,
      category: ErrorCategory.FILE_OPERATION,
      fileName,
      ...(fileSize !== undefined ? { fileSize } : {}),
      operation
    };
  }

  /**
   * 处理API错误响应
   * 
   * 从axios或fetch错误中提取信息并创建结构化的API错误。
   * 
   * @param error - 错误对象
   * @param endpoint - API端点
   * @param method - HTTP方法
   * @returns API错误或GitHub错误对象
   */
  public handleAPIError(error: unknown, endpoint: string, method: string): APIError | GitHubError {
    const errorObj = error as {
      response?: {
        status?: number;
        data?: { message?: string };
        headers?: Record<string, string>;
      };
      message?: string;
      config?: { data?: unknown };
    };

    const statusCode = errorObj.response?.status ?? 0;
    const message = errorObj.response?.data?.message ?? errorObj.message ?? '网络请求失败';

    // GitHub API特定处理
    if (endpoint.includes('api.github.com') || endpoint.includes('github')) {
      const rateLimitRemaining = errorObj.response?.headers?.['x-ratelimit-remaining'];
      const rateLimitReset = errorObj.response?.headers?.['x-ratelimit-reset'];

      return this.createGitHubError(
        message,
        statusCode,
        endpoint,
        method,
        rateLimitRemaining !== undefined ? {
          remaining: parseInt(rateLimitRemaining, 10),
          reset: parseInt(rateLimitReset ?? '0', 10)
        } : undefined,
        {
          requestData: errorObj.config?.data,
          responseData: errorObj.response?.data
        }
      );
    }

    return this.createAPIError(message, statusCode, endpoint, method, {
      requestData: errorObj.config?.data,
      responseData: errorObj.response?.data
    });
  }

  // 根据状态码确定错误级别
  private getErrorLevelByStatusCode(statusCode: number): ErrorLevel {
    if (statusCode >= 500) {
      return ErrorLevel.CRITICAL;
    }
    if (statusCode >= 400) {
      return ErrorLevel.ERROR;
    }
    if (statusCode >= 300) {
      return ErrorLevel.WARNING;
    }
    return ErrorLevel.INFO;
  }

  // 检查是否为AppError
  private isAppError(error: unknown): error is AppError {
    return error !== null && typeof error === 'object' &&
           'code' in error && 'category' in error && 'level' in error;
  }

  // 添加到错误历史
  private addToHistory(error: AppError): void {
    this.errorHistory.unshift(error);

    // 限制历史记录大小
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
    }
  }

  // 记录错误日志
  private logError(error: AppError): void {
    if (!this.config.enableConsoleLogging) {
      return;
    }

    const logMessage = `[${error.category}] ${error.code}: ${error.message}`;

    switch (error.level) {
      case ErrorLevel.CRITICAL:
        logger.error(logMessage, error);
        break;
      case ErrorLevel.ERROR:
        logger.error(logMessage, error);
        break;
      case ErrorLevel.WARNING:
        logger.warn(logMessage, error);
        break;
      case ErrorLevel.INFO:
        logger.info(logMessage, error);
        break;
      default:
        logger.info(logMessage, error);
        break;
    }
  }

  // 上报错误（占位实现）
  private async reportError(error: AppError): Promise<void> {
    // 这里可以集成第三方错误上报服务
    // 比如 Sentry, LogRocket, Bugsnag 等
    try {
      // 示例：发送到错误收集服务
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(error)
      // });

      if (getDeveloperConfig().mode) {
        logger.info('错误上报 (开发模式):', error);
      }

      // 添加 await 以满足 async 函数要求
      await Promise.resolve();
    } catch (reportingError) {
      logger.warn('错误上报失败:', reportingError);
    }
  }

  /**
   * 获取错误历史
   * 
   * @param category - 可选的错误分类过滤
   * @param limit - 返回的最大错误数量，默认20
   * @returns 错误历史数组
   */
  public getErrorHistory(category?: ErrorCategory, limit = 20): AppError[] {
    let history = this.errorHistory;

    if (category !== undefined) {
      history = history.filter(error => error.category === category);
    }

    return history.slice(0, limit);
  }

  /**
   * 清理错误历史
   * 
   * 清空所有记录的错误历史。
   * 
   * @returns void
   */
  public clearErrorHistory(): void {
    this.errorHistory = [];
  }

  /**
   * 获取错误统计
   * 
   * 返回各类错误的数量统计。
   * 
   * @returns 错误分类统计对象
   */
  public getErrorStats(): Record<ErrorCategory, number> {
    const stats: Record<ErrorCategory, number> = {
      [ErrorCategory.NETWORK]: 0,
      [ErrorCategory.API]: 0,
      [ErrorCategory.AUTH]: 0,
      [ErrorCategory.VALIDATION]: 0,
      [ErrorCategory.FILE_OPERATION]: 0,
      [ErrorCategory.COMPONENT]: 0,
      [ErrorCategory.SYSTEM]: 0
    };

    this.errorHistory.forEach(error => {
      stats[error.category] = stats[error.category] + 1;
    });

    return stats;
  }

  /**
   * 更新错误处理配置
   * 
   * @param newConfig - 新的配置选项
   * @returns void
   */
  public updateConfig(newConfig: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 重置错误会话
   * 
   * 清空错误历史并生成新的会话ID。
   * 
   * @returns void
   */
  public resetSession(): void {
    this.sessionId = this.generateSessionId();
    this.errorHistory = [];
  }
}

/**
 * 错误管理器单例实例
 * 
 * 全局错误管理器，用于统一处理应用中的所有错误。
 */
export const ErrorManager = new ErrorManagerClass();

// 全局错误处理
window.addEventListener('error', (event) => {
  const error = event.error instanceof Error ? event.error : new Error(String(event.error));
  ErrorManager.captureError(error, {
    component: 'window',
    action: 'global_error',
    metadata: {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    }
  });
});

// 未处理的Promise拒绝
window.addEventListener('unhandledrejection', (event) => {
  const errorMessage = typeof event.reason === 'string' ? event.reason : String(event.reason);
  ErrorManager.captureError(new Error(errorMessage), {
    component: 'window',
    action: 'unhandled_promise_rejection'
  });
});
