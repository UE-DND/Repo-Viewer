import type { AppError } from '@/types/errors';
import { ErrorCategory } from '@/types/errors';

/**
 * 错误历史管理类
 *
 * 负责维护错误历史记录和统计信息。
 */
export class ErrorHistory {
  private errorHistory: AppError[] = [];
  private readonly maxHistorySize: number;
  private readonly maxAge: number; // 毫秒

  constructor(maxHistorySize = 100, maxAge = 3600000) {
    this.maxHistorySize = maxHistorySize;
    this.maxAge = maxAge; // 默认1小时
  }

  /**
   * 添加到错误历史
   *
   * 使用双重清理策略：按时间和按数量。
   * - 清理超过指定时间的旧错误
   * - 限制历史记录数量
   */
  public addToHistory(error: AppError): void {
    // 清理超时的旧错误
    this.cleanupOldErrors();

    // 添加新错误到历史记录开头
    this.errorHistory.unshift(error);

    // 限制历史记录大小
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
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
   * 获取历史记录大小
   */
  public getHistorySize(): number {
    return this.errorHistory.length;
  }

  /**
   * 清理超时的旧错误
   */
  private cleanupOldErrors(): void {
    const now = Date.now();
    this.errorHistory = this.errorHistory.filter(
      e => (now - e.timestamp) < this.maxAge
    );
  }
}

