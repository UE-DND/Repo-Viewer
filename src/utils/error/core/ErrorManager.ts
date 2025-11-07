import type {
  AppError,
  ErrorContext,
  ErrorHandlerConfig,
  APIError,
  NetworkError,
  GitHubError,
  ComponentError,
  FileOperationError
} from '@/types/errors';
import { ErrorLevel, ErrorCategory } from '@/types/errors';
import { logger } from '../../logging/logger';
import { getDeveloperConfig } from '@/config';
import { ErrorFactory } from './ErrorFactory';
import { ErrorLogger } from './ErrorLogger';
import { ErrorHistory } from './ErrorHistory';

/**
 * 错误管理器类
 *
 * 统一管理应用中的错误，提供错误创建、捕获、记录和上报功能。
 * 支持多种错误类型，包括API错误、网络错误、组件错误和文件操作错误。
 */
class ErrorManagerClass {
  private sessionId: string = this.generateSessionId();
  private factory: ErrorFactory;
  private errorLogger: ErrorLogger;
  private history: ErrorHistory;

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

  constructor() {
    this.factory = new ErrorFactory(this.sessionId);
    this.errorLogger = new ErrorLogger(this.config.enableConsoleLogging);
    this.history = new ErrorHistory();
  }

  // 生成会话ID
  private generateSessionId(): string {
    return `${Date.now().toString()}-${Math.random().toString(36).substring(2, 11)}`;
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
      appError = this.factory.createBaseError(
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
    this.history.addToHistory(appError);

    // 记录错误
    this.errorLogger.logError(appError);

    // 上报错误（如果启用）
    if (this.config.enableErrorReporting) {
      void this.reportError(appError);
    }

    return appError;
  }

  /**
   * 创建API错误
   */
  public createAPIError(
    message: string,
    statusCode: number,
    endpoint: string,
    method: string,
    context?: Record<string, unknown>
  ): APIError {
    return this.factory.createAPIError(message, statusCode, endpoint, method, context);
  }

  /**
   * 创建GitHub特定错误
   */
  public createGitHubError(
    message: string,
    statusCode: number,
    endpoint: string,
    method: string,
    rateLimitInfo?: { remaining: number; reset: number },
    context?: Record<string, unknown>
  ): GitHubError {
    return this.factory.createGitHubError(message, statusCode, endpoint, method, rateLimitInfo, context);
  }

  /**
   * 创建网络错误
   */
  public createNetworkError(
    message: string,
    url: string,
    timeout = false,
    retryCount = 0,
    context?: Record<string, unknown>
  ): NetworkError {
    return this.factory.createNetworkError(message, url, timeout, retryCount, context);
  }

  /**
   * 创建组件错误
   */
  public createComponentError(
    componentName: string,
    message: string,
    props?: Record<string, unknown>,
    context?: Record<string, unknown>
  ): ComponentError {
    return this.factory.createComponentError(componentName, message, props, context);
  }

  /**
   * 创建文件操作错误
   */
  public createFileOperationError(
    fileName: string,
    operation: 'read' | 'write' | 'download' | 'compress' | 'parse',
    message: string,
    fileSize?: number,
    context?: Record<string, unknown>
  ): FileOperationError {
    return this.factory.createFileOperationError(fileName, operation, message, fileSize, context);
  }

  /**
   * 处理API错误响应
   */
  public handleAPIError(error: unknown, endpoint: string, method: string): APIError | GitHubError {
    return this.factory.handleAPIError(error, endpoint, method);
  }

  // 检查是否为AppError
  private isAppError(error: unknown): error is AppError {
    return error !== null && typeof error === 'object' &&
           'code' in error && 'category' in error && 'level' in error;
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
   */
  public getErrorHistory(category?: ErrorCategory, limit = 20): AppError[] {
    return this.history.getErrorHistory(category, limit);
  }

  /**
   * 清理错误历史
   */
  public clearErrorHistory(): void {
    this.history.clearErrorHistory();
  }

  /**
   * 获取错误统计
   */
  public getErrorStats(): Record<ErrorCategory, number> {
    return this.history.getErrorStats();
  }

  /**
   * 更新错误处理配置
   */
  public updateConfig(newConfig: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // 更新子模块配置
    if (newConfig.enableConsoleLogging !== undefined) {
      this.errorLogger.setLoggingEnabled(newConfig.enableConsoleLogging);
    }
  }

  /**
   * 重置错误会话
   */
  public resetSession(): void {
    this.sessionId = this.generateSessionId();
    this.factory.updateSessionId(this.sessionId);
    this.history.clearErrorHistory();
  }
}

/**
 * 错误管理器单例实例
 *
 * 全局错误管理器，用于统一处理应用中的所有错误。
 */
export const ErrorManager = new ErrorManagerClass();
