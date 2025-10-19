import { logger } from '../logging/logger';

/**
 * 重试选项接口
 */
export interface RetryOptions {
  /**
   * 最大重试次数
   */
  maxRetries: number;
  
  /**
   * 计算重试延迟的函数
   * @param attempt - 当前重试次数（从0开始）
   * @returns 延迟时间（毫秒）
   */
  backoff: (attempt: number) => number;
  
  /**
   * 判断是否应该重试的函数
   * @param error - 捕获的错误
   * @returns 如果返回true则继续重试，否则直接抛出错误
   */
  shouldRetry?: (error: unknown) => boolean;
  
  /**
   * 重试时的回调函数
   * @param attempt - 当前重试次数
   * @param error - 上次尝试的错误
   */
  onRetry?: (attempt: number, error: unknown) => void;
  
  /**
   * 是否静默重试（不打印日志）
   * 默认为 false
   */
  silent?: boolean;
}

/**
 * 默认的退避策略：指数退避
 * @param attempt - 重试次数
 * @returns 延迟时间（毫秒）
 */
export const exponentialBackoff = (attempt: number): number => {
  return Math.min(1000 * Math.pow(2, attempt), 30000); // 最大30秒
};

/**
 * 固定延迟策略
 * @param delay - 固定延迟时间（毫秒）
 * @returns 返回固定延迟的函数
 */
export const fixedDelay = (delay: number): ((attempt: number) => number) => {
  return () => delay;
};

/**
 * 线性退避策略
 * @param initialDelay - 初始延迟时间（毫秒）
 * @param increment - 每次重试增加的延迟时间（毫秒）
 * @returns 返回线性增长延迟的函数
 */
export const linearBackoff = (initialDelay: number, increment: number): ((attempt: number) => number) => {
  return (attempt: number) => initialDelay + (attempt * increment);
};

/**
 * 通用重试函数
 * 
 * @template T - 返回值类型
 * @param fn - 要执行的异步函数
 * @param options - 重试选项
 * @returns Promise，解析为函数的返回值
 * @throws 当所有重试都失败时抛出最后一个错误
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { silent = false, 
    maxRetries,
    backoff,
    shouldRetry = () => true,
    onRetry
  } = options;
  
  let lastError: unknown = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // 执行函数
      const result = await fn();
      
      // 成功时记录日志（如果有重试）
      if (attempt > 0) {
        logger.debug(`操作在第 ${String(attempt + 1)} 次尝试后成功`);
      }
      
      return result;
    } catch (error: unknown) {
      lastError = error;
      
      // 检查是否应该重试
      if (attempt < maxRetries && shouldRetry(error)) {
        const delay = backoff(attempt);
        
        // 调用重试回调
        if (onRetry !== undefined) {
          onRetry(attempt, error);
        }
        
        // 记录重试日志（除非设置为静默）
        if (!silent) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.debug(`重试操作 (尝试 ${String(attempt + 1)}/${String(maxRetries + 1)})，延迟 ${String(delay)}ms: ${errorMessage}`);
        }
        
        // 等待指定时间后重试
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // 不应该重试或已达到最大重试次数
        break;
      }
    }
  }
  
  // 所有重试都失败，抛出最后的错误
  throw lastError;
}

/**
 * 创建一个带重试功能的函数装饰器
 * 
 * @param options - 重试选项
 * @returns 返回一个装饰器函数
 */
export function createRetryDecorator(options: RetryOptions) {
  return function <T extends (...args: unknown[]) => Promise<unknown>>(
    target: T
  ): T {
    return (async (...args: Parameters<T>) => {
      return withRetry(() => target(...args), options);
    }) as T;
  };
}

/**
 * 常用的重试配置预设
 */
export const RetryPresets = {
  /**
   * 快速重试：3次，固定100ms延迟
   */
  fast: {
    maxRetries: 3,
    backoff: fixedDelay(100)
  } as RetryOptions,
  
  /**
   * 标准重试：3次，指数退避
   */
  standard: {
    maxRetries: 3,
    backoff: exponentialBackoff
  } as RetryOptions,
  
  /**
   * 持久重试：5次，指数退避，最大延迟5秒
   */
  persistent: {
    maxRetries: 5,
    backoff: (attempt: number) => Math.min(1000 * Math.pow(2, attempt), 5000)
  } as RetryOptions,
  
  /**
   * 网络请求重试：3次，指数退避，跳过4xx错误
   */
  network: {
    maxRetries: 3,
    backoff: exponentialBackoff,
    shouldRetry: (error: unknown) => {
      if (error instanceof Response) {
        return error.status >= 500 || error.status === 0;
      }
      return true;
    }
  } as RetryOptions
};

/**
 * 检查错误是否为网络错误
 * @param error - 错误对象
 * @returns 是否为网络错误
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.name === 'NetworkError' || 
           error.name === 'AbortError' ||
           error.message.toLowerCase().includes('network') ||
           error.message.toLowerCase().includes('fetch');
  }
  return false;
}

/**
 * 检查错误是否为超时错误
 * @param error - 错误对象
 * @returns 是否为超时错误
 */
export function isTimeoutError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.name === 'TimeoutError' ||
           error.message.toLowerCase().includes('timeout');
  }
  return false;
}

