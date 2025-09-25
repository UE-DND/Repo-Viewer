import { logger } from '../../utils';

export class RequestBatcher {
  private batchedRequests: Map<string, {
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    timestamp: number;
    priority: 'high' | 'medium' | 'low';
    retryCount: number;
  }[]> = new Map();

  // 进行中的请求
  private pendingRequests: Map<string, Promise<any>> = new Map();

  // 请求指纹缓存（用于去重）
  private requestFingerprints: Map<string, {
    result: any;
    timestamp: number;
    hitCount: number;
  }> = new Map();

  private batchTimeout: number | null = null;
  private batchDelay = 20; // 批处理延迟毫秒
  private maxRetries = 3; // 最大重试次数
  private fingerprintTTL = 5 * 60 * 1000; // 指纹缓存5分钟
  private cleanupInterval: number;

  constructor() {
    // 定期清理过期的指纹缓存
    this.cleanupInterval = window.setInterval(() => {
      this.cleanupExpiredFingerprints();
    }, 60 * 1000); // 每分钟清理一次
  }

  // 清理过期的指纹缓存
  private cleanupExpiredFingerprints(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, fingerprint] of this.requestFingerprints.entries()) {
      if (now - fingerprint.timestamp > this.fingerprintTTL) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => {
      this.requestFingerprints.delete(key);
    });

    if (expiredKeys.length > 0) {
      logger.debug(`清理了 ${expiredKeys.length} 个过期的请求指纹`);
    }
  }

  // 生成请求指纹（用于去重）
  private generateFingerprint(key: string, method: string = 'GET', headers?: Record<string, string>): string {
    const headerStr = headers ? JSON.stringify(headers) : '';
    return `${method}:${key}:${headerStr}`;
  }

  // 销毁批处理器
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }
    this.batchedRequests.clear();
    this.pendingRequests.clear();
    this.requestFingerprints.clear();
  }

  // 将请求放入批处理队列
  public enqueue<T>(
    key: string,
    executeRequest: () => Promise<T>,
    options: {
      priority?: 'high' | 'medium' | 'low';
      method?: string;
      headers?: Record<string, string>;
      skipDeduplication?: boolean;
    } = {}
  ): Promise<T> {
    const {
      priority = 'medium',
      method = 'GET',
      headers = {},
      skipDeduplication = false
    } = options;

    // 生成请求指纹
    const fingerprint = this.generateFingerprint(key, method, headers);

    // 检查是否可以去重
    if (!skipDeduplication) {
      const cachedResult = this.requestFingerprints.get(fingerprint);
      if (cachedResult && (Date.now() - cachedResult.timestamp < this.fingerprintTTL)) {
        // 增加命中次数
        cachedResult.hitCount++;
        logger.debug(`请求去重命中: ${key}，命中次数: ${cachedResult.hitCount}`);
        return Promise.resolve(cachedResult.result);
      }
    }

    // 检查是否有相同的请求正在进行
    if (this.pendingRequests.has(key)) {
      logger.debug(`请求合并: ${key}`);
      return this.pendingRequests.get(key) as Promise<T>;
    }

    return new Promise<T>((resolve, reject) => {
      // 如果还没有这个键的请求队列，创建它
      if (!this.batchedRequests.has(key)) {
        this.batchedRequests.set(key, []);

        // 设置超时以批量处理请求
        if (this.batchTimeout === null) {
          this.batchTimeout = window.setTimeout(() => this.processBatch(), this.batchDelay);
        }
      }

      // 添加到队列
      const queue = this.batchedRequests.get(key)!;
      const isFirstRequest = queue.length === 0;

      queue.push({
        resolve,
        reject,
        timestamp: Date.now(),
        priority,
        retryCount: 0
      });

      // 如果是队列中的第一个请求，执行它
      if (isFirstRequest) {
        this.executeWithRetry(key, executeRequest, fingerprint, skipDeduplication);
      }
    });
  }

  // 带重试机制的请求执行
  private async executeWithRetry<T>(
    key: string,
    executeRequest: () => Promise<T>,
    fingerprint: string,
    skipDeduplication: boolean
  ): Promise<void> {
    const requestPromise = this.performRequest(key, executeRequest, fingerprint, skipDeduplication);

    // 添加到进行中的请求
    this.pendingRequests.set(key, requestPromise);

    try {
      await requestPromise;
    } finally {
      // 清理进行中的请求记录
      this.pendingRequests.delete(key);
    }
  }

  // 执行请求
  private async performRequest<T>(
    key: string,
    executeRequest: () => Promise<T>,
    fingerprint: string,
    skipDeduplication: boolean
  ): Promise<void> {
    const queue = this.batchedRequests.get(key) || [];
    let lastError: any = null;

    // 按优先级排序
    queue.sort((a, b) => {
      const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    // 重试逻辑
    for (let retryCount = 0; retryCount <= this.maxRetries; retryCount++) {
      try {
        const result = await executeRequest();

        // 缓存成功的请求结果（如果启用去重）
        if (!skipDeduplication) {
          this.requestFingerprints.set(fingerprint, {
            result,
            timestamp: Date.now(),
            hitCount: 1
          });
        }

        // 所有批处理请求都收到相同的结果
        queue.forEach(request => request.resolve(result));
        this.batchedRequests.delete(key);
        return;

      } catch (error: any) {
        lastError = error;
        logger.warn(`请求失败 (尝试 ${retryCount + 1}/${this.maxRetries + 1}): ${key}`, error.message);

        // 如果不是最后一次重试，等待一段时间
        if (retryCount < this.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // 指数退避，最大5秒
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // 所有重试都失败了
    logger.error(`请求最终失败: ${key}`, lastError);
    queue.forEach(request => {
      request.retryCount++;
      request.reject(lastError);
    });
    this.batchedRequests.delete(key);
  }

  // 处理批处理队列
  private processBatch(): void {
    this.batchTimeout = null;

    // 已经在enqueue中处理了所有队列
  }

  // 获取批处理器状态
  public getStats() {
    return {
      pendingRequests: this.pendingRequests.size,
      batchedRequests: this.batchedRequests.size,
      fingerprintCache: this.requestFingerprints.size,
      fingerprintHits: Array.from(this.requestFingerprints.values())
        .reduce((sum, fp) => sum + fp.hitCount, 0)
    };
  }

  // 清除所有缓存
  public clearCache(): void {
    this.requestFingerprints.clear();
    logger.debug('已清除请求指纹缓存');
  }

  // 强制取消所有等待的请求
  public cancelAllRequests(): void {
    for (const [, queue] of this.batchedRequests.entries()) {
      queue.forEach(request => {
        request.reject(new Error('请求被取消'));
      });
    }
    this.batchedRequests.clear();
    this.pendingRequests.clear();
    logger.debug('已取消所有等待的请求');
  }
}
