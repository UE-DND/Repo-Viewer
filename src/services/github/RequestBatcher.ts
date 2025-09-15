// 请求批处理器
export class RequestBatcher {
  private batchedRequests: Map<string, {
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }[]> = new Map();
  
  private batchTimeout: number | null = null;
  private batchDelay = 20; // 批处理延迟毫秒
  
  // 将请求放入批处理队列
  public enqueue<T>(
    key: string, 
    executeRequest: () => Promise<T>
  ): Promise<T> {
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
      
      queue.push({ resolve, reject });
      
      // 如果是队列中的第一个请求，执行它
      if (isFirstRequest) {
        executeRequest()
          .then(result => {
            // 所有批处理请求都收到相同的结果
            const requests = this.batchedRequests.get(key) || [];
            requests.forEach(request => request.resolve(result));
            this.batchedRequests.delete(key);
          })
          .catch(error => {
            // 所有批处理请求都收到相同的错误
            const requests = this.batchedRequests.get(key) || [];
            requests.forEach(request => request.reject(error));
            this.batchedRequests.delete(key);
          });
      }
    });
  }
  
  // 处理批处理队列
  private processBatch(): void {
    this.batchTimeout = null;
    
    // 已经在enqueue中处理了所有队列
  }
}