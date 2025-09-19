import { logger } from '../../utils';
import { getRuntimeConfig, getAccessConfig, getProxyConfig, getGithubConfig } from '../../config/ConfigManager';

// 获取配置
const runtimeConfig = getRuntimeConfig();
const accessConfig = getAccessConfig();
const proxyConfig = getProxyConfig();
const githubConfig = getGithubConfig();

// 模式设置
const USE_TOKEN_MODE = accessConfig.useTokenMode;

// 强制使用服务端API代理所有请求
const FORCE_SERVER_PROXY = !runtimeConfig.isDev || USE_TOKEN_MODE;

// 定义多个代理服务URL
const PROXY_SERVICES = [
  proxyConfig.imageProxyUrl, // 默认代理
  proxyConfig.imageProxyUrlBackup1, // 备用代理1
  proxyConfig.imageProxyUrlBackup2, // 备用代理2
];

// 增强的代理故障转移管理
interface ProxyHealth {
  url: string;
  failureCount: number;
  lastFailure: number;
  responseTime: number;
  isHealthy: boolean;
  consecutiveFailures: number;
  lastSuccessTime: number;
}

class ProxyHealthManager {
  private proxyHealth: Map<string, ProxyHealth> = new Map();
  private readonly MAX_FAILURES = 3;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30秒
  private readonly RECOVERY_TIME = 300000; // 5分钟恢复时间
  private healthCheckTimer: number | null = null;
  
  constructor() {
    this.initializeProxies();
    this.startHealthCheck();
  }
  
  private initializeProxies(): void {
    PROXY_SERVICES.forEach(proxyUrl => {
      if (proxyUrl) {
        this.proxyHealth.set(proxyUrl, {
          url: proxyUrl,
          failureCount: 0,
          lastFailure: 0,
          responseTime: 0,
          isHealthy: true,
          consecutiveFailures: 0,
          lastSuccessTime: Date.now()
        });
      }
    });
  }
  
  public recordSuccess(proxyUrl: string, responseTime: number): void {
    const health = this.proxyHealth.get(proxyUrl);
    if (health) {
      health.isHealthy = true;
      health.consecutiveFailures = 0;
      health.responseTime = responseTime;
      health.lastSuccessTime = Date.now();
      console.debug(`代理成功: ${proxyUrl}, 响应时间: ${responseTime}ms`);
    }
  }
  
  public recordFailure(proxyUrl: string): void {
    const health = this.proxyHealth.get(proxyUrl);
    if (health) {
      health.failureCount++;
      health.consecutiveFailures++;
      health.lastFailure = Date.now();
      health.isHealthy = health.consecutiveFailures < this.MAX_FAILURES;
      console.warn(`代理失败: ${proxyUrl}, 连续失败: ${health.consecutiveFailures}`);
    }
  }
  
  public getBestProxy(): string {
    const healthyProxies = Array.from(this.proxyHealth.values())
      .filter(health => health.isHealthy || this.shouldRetryProxy(health))
      .sort((a, b) => {
        // 优先选择健康的代理
        if (a.isHealthy && !b.isHealthy) return -1;
        if (!a.isHealthy && b.isHealthy) return 1;
        // 在健康代理中，选择响应时间最短的
        return a.responseTime - b.responseTime;
      });
    
    return healthyProxies.length > 0 ? healthyProxies[0]?.url || '' : PROXY_SERVICES[0] || '';
  }
  
  private shouldRetryProxy(health: ProxyHealth): boolean {
    const now = Date.now();
    return (now - health.lastFailure) > this.RECOVERY_TIME;
  }
  
  private startHealthCheck(): void {
    this.healthCheckTimer = window.setInterval(() => {
      this.performHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL);
  }
  
  private async performHealthCheck(): Promise<void> {
    const unhealthyProxies = Array.from(this.proxyHealth.values())
      .filter(health => !health.isHealthy && this.shouldRetryProxy(health));
    
    for (const health of unhealthyProxies) {
      try {
        const testUrl = `${health.url}/health-check`;
        const startTime = Date.now();
        const response = await fetch(testUrl, { 
          method: 'HEAD', 
          timeout: 5000 
        } as any);
        
        if (response.ok) {
          const responseTime = Date.now() - startTime;
          this.recordSuccess(health.url, responseTime);
        }
      } catch {
        // 健康检查失败，保持当前状态
      }
    }
  }
  
  public getHealthStats() {
    return Array.from(this.proxyHealth.values()).map(health => ({
      url: health.url,
      isHealthy: health.isHealthy,
      failureCount: health.failureCount,
      responseTime: health.responseTime,
      consecutiveFailures: health.consecutiveFailures
    }));
  }
  
  public destroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
  }
}

const proxyHealthManager = new ProxyHealthManager();

// 保持向后兼容
const failedProxyServices = new Set<string>();

export class ProxyService {
  // 获取处理过的URL，解减CORS问题（增强版）
  public static async getProxiedUrl(url: string, options: {
    priority?: 'high' | 'medium' | 'low';
    timeout?: number;
    retryCount?: number;
  } = {}): Promise<string> {
    if (!url) return '';
    
    const { priority = 'medium', timeout = 10000, retryCount = 0 } = options;
    
    // 如果是开发环境且未配置代理，则直接返回原始URL
    if (runtimeConfig.isDev && !USE_TOKEN_MODE && !proxyConfig.imageProxyUrl) {
      return url;
    }
    
    // 修改：优先使用服务端API代理
    if (FORCE_SERVER_PROXY) {
      // 通过服务端API代理请求
      return `/api/github?action=getFileContent&url=${encodeURIComponent(url)}`;
    }
    
    // 使用智能代理选择
    const bestProxy = proxyHealthManager.getBestProxy();
    
    if (!bestProxy) {
      // 如果没有可用代理，使用服务端API作为后备
      logger.warn('没有可用代理，使用服务端API');
      return `/api/github?action=getFileContent&url=${encodeURIComponent(url)}`;
    }
    
    const proxiedUrl = this.applyProxyToUrl(url, bestProxy);
    
    // 对高优先级请求进行健康检查
    if (priority === 'high' && retryCount === 0) {
      try {
        await this.validateProxy(bestProxy, timeout);
      } catch (error) {
        logger.warn(`代理验证失败: ${bestProxy}`, error);
        proxyHealthManager.recordFailure(bestProxy);
        // 递归尝试下一个代理
        return this.getProxiedUrl(url, { ...options, retryCount: retryCount + 1 });
      }
    }
    
    return proxiedUrl;
  }
  
  // 同步版本（保持向后兼容）
  public static getProxiedUrlSync(url: string): string {
    if (!url) return '';
    
    if (runtimeConfig.isDev && !USE_TOKEN_MODE && !proxyConfig.imageProxyUrl) {
      return url;
    }
    
    if (FORCE_SERVER_PROXY) {
      return `/api/github?action=getFileContent&url=${encodeURIComponent(url)}`;
    }
    
    const bestProxy = proxyHealthManager.getBestProxy();
    if (!bestProxy) {
      return `/api/github?action=getFileContent&url=${encodeURIComponent(url)}`;
    }
    
    return this.applyProxyToUrl(url, bestProxy);
  }
  
  // 验证代理是否可用
  private static async validateProxy(proxyUrl: string, timeout: number): Promise<void> {
    const testUrl = `${proxyUrl}/ping`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const startTime = Date.now();
      const response = await fetch(testUrl, { 
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const responseTime = Date.now() - startTime;
        proxyHealthManager.recordSuccess(proxyUrl, responseTime);
      } else {
        throw new Error(`Proxy validation failed: ${response.status}`);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
  
  // 应用代理到URL
  private static applyProxyToUrl(url: string, proxyUrl: string): string {
    if (!proxyUrl) return url;
    
    try {
      // 确保URL格式正确 - 处理中文和特殊字符
      let processedUrl = url;
      
      // 检查URL是否已经编码
      if (url !== decodeURIComponent(url)) {
        // URL已经编码，使用原始URL
        processedUrl = url;
      } else {
        // 检查URL是否包含中文或特殊字符
        const needsEncoding = /[\u4e00-\u9fa5]|[^\w\-\.\/\:]/g.test(url);
        if (needsEncoding) {
          // 拆分URL，只编码路径部分
          const urlParts = url.split('/');
          // 保留协议和域名部分
          const protocol = urlParts[0];
          const domain = urlParts[2];
          // 编码路径部分
          const pathParts = urlParts.slice(3).map(part => {
            // 对包含中文或特殊字符的部分进行编码
            return /[\u4e00-\u9fa5]|[^\w\-\.]/g.test(part) ? encodeURIComponent(part) : part;
          });
          
          // 重新组合URL
          processedUrl = `${protocol}//${domain}/${pathParts.join('/')}`;
          logger.debug('编码后的URL:', processedUrl);
        }
      }
      
      // 处理不同的代理服务格式
      if (proxyUrl.includes('?url=')) {
        // 已包含参数格式的代理
        return `${proxyUrl}${encodeURIComponent(processedUrl)}`;
      } else if (proxyUrl.includes('staticdn')) {
        // staticdn格式的代理
        // 仅支持raw.githubusercontent.com的URL
        if (processedUrl.includes('raw.githubusercontent.com')) {
          const parts = processedUrl.split('raw.githubusercontent.com/');
          if (parts.length > 1) {
            return `${proxyUrl}/${parts[1]}`;
          }
        }
        return processedUrl;
      } else {
        // 路径格式的代理
        return `${proxyUrl}/${processedUrl.replace(/^https?:\/\//, '')}`;
      }
    } catch (error) {
      logger.error('应用代理到URL失败:', error);
      return url;
    }
  }
  
  // 标记代理服务失败（增强版）
  public static markProxyServiceFailed(proxyUrl: string): void {
    if (proxyUrl) {
      // 使用新的健康管理器
      proxyHealthManager.recordFailure(proxyUrl);
      
      // 保持向后兼容
      if (!failedProxyServices.has(proxyUrl)) {
        logger.warn(`标记代理服务失败: ${proxyUrl}`);
        failedProxyServices.add(proxyUrl);
      }
    }
  }
  
  // 获取当前使用的代理服务（增强版）
  public static getCurrentProxyService(): string {
    return proxyHealthManager.getBestProxy() || PROXY_SERVICES[0] || "";
  }
  
  // 获取代理健康状态
  public static getProxyHealthStats() {
    return proxyHealthManager.getHealthStats();
  }
  
  // 重置失败的代理服务记录
  public static resetFailedProxyServices(): void {
    failedProxyServices.clear();
    // 重置健康管理器状态
    proxyHealthManager.destroy();
    // 重新初始化
    const newManager = new ProxyHealthManager();
    Object.setPrototypeOf(proxyHealthManager, newManager);
    logger.info('已重置所有失败的代理服务记录');
  }
  
  // 转换相对图片URL为绝对URL
  public static transformImageUrl(src: string | undefined, markdownFilePath: string, useTokenMode: boolean): string | undefined {
    if (!src) return undefined;
    
    try {
      // 添加调试日志
      logger.debug('转换前图片URL:', src);
      logger.debug('Markdown文件路径:', markdownFilePath);
      
      // 判断是否是非开发环境或启用了令牌模式
      if (FORCE_SERVER_PROXY && src.startsWith('http')) {
        // 通过服务端API代理
        const proxyUrl = `/api/github?action=getFileContent&url=${encodeURIComponent(src)}`;
        logger.debug('使用服务端API代理:', proxyUrl);
        return proxyUrl;
      }
      
      // --- 以下仅在开发环境或未强制使用代理时生效 ---
      
      // 判断URL类型
      if (src.startsWith('http')) {
        // 绝对URL - 可能需要代理
        if (useTokenMode || !runtimeConfig.isDev) {
          const proxyUrl = this.getProxiedUrlSync(src);
          logger.debug('绝对URL使用代理:', proxyUrl);
          return proxyUrl;
        }
        logger.debug('直接使用绝对URL:', src);
        return src;
      }
      
      // 处理相对URL
      // 获取Markdown文件所在的目录路径
      const dirPath = this.getDirectoryPath(markdownFilePath);
      logger.debug('Markdown目录路径:', dirPath);
    
      // 构建完整路径
      let fullPath = '';
      
      if (src.startsWith('./')) {
        // 当前目录相对路径
        fullPath = `${dirPath}/${src.substring(2)}`;
        logger.debug('当前目录相对路径 (./):', fullPath);
      } else if (src.startsWith('../')) {
        // 上级目录相对路径
        // 拆分目录路径
        const pathSegments = dirPath.split('/');
        
        // 计算../的数量
        let parentDirCount = 0;
        let remainingSrc = src;
      
        while (remainingSrc.startsWith('../')) {
          parentDirCount++;
          remainingSrc = remainingSrc.substring(3);
        }
      
        // 移除相应数量的路径段
        const newPathLength = Math.max(0, pathSegments.length - parentDirCount);
        const newBasePath = pathSegments.slice(0, newPathLength).join('/');
        
        // 构建新路径
        fullPath = `${newBasePath}/${remainingSrc}`;
        logger.debug('上级目录相对路径 (../):', fullPath);
      } else if (src.startsWith('/')) {
        // 根目录绝对路径 (对于这种情况，不需要添加当前目录)
        fullPath = src.substring(1); // 移除开头的/
        logger.debug('根目录绝对路径 (/):', fullPath);
      } else {
        // 当前目录相对路径(无./前缀)
        fullPath = `${dirPath}/${src}`;
        logger.debug('当前目录相对路径(无前缀):', fullPath);
      }
      
      // 规范化路径(删除多余的/)
      fullPath = fullPath.replace(/\/+/g, '/');
      
      // 移除开头的/
      if (fullPath.startsWith('/')) {
        fullPath = fullPath.substring(1);
      }
      
      // 获取仓库信息 - 使用统一配置
      // 尝试从markdownFilePath中提取仓库信息
      let repoOwner = githubConfig.repoOwner;
      let repoName = githubConfig.repoName;
      
      // 检查markdownFilePath是否包含完整的GitHub URL
      if (markdownFilePath.includes('github.com')) {
        try {
          // 尝试从URL中提取仓库信息
          const urlMatch = markdownFilePath.match(/github\.com\/([^\/]+)\/([^\/]+)/);
          if (urlMatch && urlMatch.length >= 3) {
            // 使用URL中的仓库信息
            repoOwner = urlMatch[1]!;
            repoName = urlMatch[2]!;
            logger.debug('从URL提取的仓库信息:', `${repoOwner}/${repoName}`);
          }
        } catch (e) {
          logger.warn('从URL提取仓库信息失败，使用默认值');
        }
      }
      
      // 构建GitHub原始URL
      const branch = githubConfig.repoBranch;
      const rawUrl = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/${branch}/${fullPath}`;
      logger.debug('构建的原始URL:', rawUrl);
    
      // 是否使用代理
      if (useTokenMode || !runtimeConfig.isDev) {
        const proxyUrl = this.getProxiedUrlSync(rawUrl);
        logger.debug('返回代理URL:', proxyUrl);
        return proxyUrl;
      }
      
      logger.debug('返回原始URL:', rawUrl);
      return rawUrl;
    } catch (e) {
      logger.error('转换图片URL失败:', e);
      return src; // 失败时返回原URL
    }
  }
  
  // 计算目录路径
  private static getDirectoryPath(filePath: string): string {
    const lastSlashIndex = filePath.lastIndexOf('/');
    if (lastSlashIndex === -1) return '';
    return filePath.substring(0, lastSlashIndex);
  }
}