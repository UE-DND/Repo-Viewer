import type { AppError } from '@/types/errors';
import { ErrorLevel } from '@/types/errors';
import { logger } from '../../logging/logger';

/**
 * 错误日志记录器类
 *
 * 负责将错误记录到控制台或其他日志系统。
 */
export class ErrorLogger {
  private enableLogging: boolean;

  constructor(enableLogging = true) {
    this.enableLogging = enableLogging;
  }

  /**
   * 更新日志配置
   */
  public setLoggingEnabled(enabled: boolean): void {
    this.enableLogging = enabled;
  }

  /**
   * 记录错误日志
   */
  public logError(error: AppError): void {
    if (!this.enableLogging) {
      return;
    }

    const logMessage = this.formatLogMessage(error);

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

  /**
   * 格式化日志消息
   */
  private formatLogMessage(error: AppError): string {
    return `[${error.category}] ${error.code}: ${error.message}`;
  }
}

