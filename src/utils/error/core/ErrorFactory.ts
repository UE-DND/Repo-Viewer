import type {
  BaseError,
  APIError,
  NetworkError,
  GitHubError,
  ComponentError,
  FileOperationError,
  ErrorContext
} from '@/types/errors';
import { ErrorLevel, ErrorCategory } from '@/types/errors';

/**
 * 错误工厂类
 *
 * 负责创建各种类型的结构化错误对象。
 */
export class ErrorFactory {
  private sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  /**
   * 更新会话ID
   */
  public updateSessionId(newSessionId: string): void {
    this.sessionId = newSessionId;
  }

  /**
   * 获取基础错误上下文
   */
  private getBaseContext(): ErrorContext {
    return {
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: Date.now(),
    };
  }

  /**
   * 创建基础错误对象
   */
  public createBaseError(
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
          rateLimitRemaining: rateLimitInfo.remaining,
          rateLimitReset: rateLimitInfo.reset,
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

  /**
   * 根据状态码确定错误级别
   */
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
}

