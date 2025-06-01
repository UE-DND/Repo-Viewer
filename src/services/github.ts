import { GitHubContent } from '../types';
import { logger } from '../utils';
import axios from 'axios';

// 基础配置
const GITHUB_REPO_OWNER = import.meta.env.VITE_GITHUB_REPO_OWNER || 'UE-DND';
const GITHUB_REPO_NAME = import.meta.env.VITE_GITHUB_REPO_NAME || 'Repo-Viewer';
const DEFAULT_BRANCH = import.meta.env.VITE_GITHUB_REPO_BRANCH || 'main';

// 是否使用服务端API（非开发环境）
const USE_SERVER_API = !import.meta.env.DEV;

// 模式设置
const USE_TOKEN_MODE = import.meta.env.VITE_USE_TOKEN_MODE === 'true';

// 强制使用服务端API代理所有请求
const FORCE_SERVER_PROXY = !import.meta.env.DEV || USE_TOKEN_MODE;

// 缓存配置
const CACHE_TTL = 60000; // 缓存有效期，单位毫秒（1分钟）
const MAX_CACHE_SIZE = 50; // 最大缓存条目数量
const STORAGE_KEY_CONTENT_CACHE = 'repo_viewer_content_cache';
const STORAGE_KEY_FILE_CACHE = 'repo_viewer_file_cache';
const PERSISTENT_CACHE_ENABLED = true; // 是否启用持久化缓存

// 工具函数
const isDevEnvironment = window.location.hostname === 'localhost';

// 定义多个代理服务URL
const PROXY_SERVICES = [
  import.meta.env.VITE_IMAGE_PROXY_URL || 'https://gh-proxy.com', // 默认代理
  import.meta.env.VITE_IMAGE_PROXY_URL_BACKUP1 || 'https://ghproxy.com', // 备用代理1
  import.meta.env.VITE_IMAGE_PROXY_URL_BACKUP2 || 'https://raw.staticdn.net', // 备用代理2
];

// 记录失败的代理服务
const failedProxyServices = new Set<string>();

// 自定义缓存实现，LRU策略
class LRUCache<K, V> {
  private cache: Map<K, { value: V, timestamp: number }>;
  private maxSize: number;
  private storageKey?: string;
  
  constructor(maxSize: number, storageKey?: string) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.storageKey = storageKey;
    
    // 从localStorage加载缓存
    if (PERSISTENT_CACHE_ENABLED && storageKey && typeof localStorage !== 'undefined') {
      this.loadFromStorage();
    }
  }
  
  // 获取缓存项
  get(key: K): V | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;
    
    // 检查是否过期
    const now = Date.now();
    if (now - item.timestamp > CACHE_TTL) {
      this.cache.delete(key);
      this.saveToStorage();
      return undefined;
    }
    
    // 刷新缓存顺序（LRU特性）
    this.cache.delete(key);
    this.cache.set(key, item);
    
    return item.value;
  }
  
  // 设置缓存项
  set(key: K, value: V): void {
    // 检查是否需要删除最旧的条目
    if (this.cache.size >= this.maxSize) {
      const iterator = this.cache.keys();
      const firstResult = iterator.next();
      if (!firstResult.done && firstResult.value !== undefined) {
        this.cache.delete(firstResult.value);
      }
    }
    
    this.cache.set(key, { value, timestamp: Date.now() });
    
    // 保存到localStorage
    if (PERSISTENT_CACHE_ENABLED && this.storageKey) {
      this.saveToStorage();
    }
  }
  
  // 删除缓存项
  delete(key: K): boolean {
    const result = this.cache.delete(key);
    if (result && PERSISTENT_CACHE_ENABLED && this.storageKey) {
      this.saveToStorage();
    }
    return result;
  }
  
  // 清除所有缓存
  clear(): void {
    this.cache.clear();
    if (PERSISTENT_CACHE_ENABLED && this.storageKey && typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(this.storageKey);
      } catch (e) {
        console.error('清除缓存存储失败:', e);
      }
    }
  }
  
  // 获取缓存大小
  size(): number {
    return this.cache.size;
  }
  
  // 保存缓存到localStorage
  private saveToStorage(): void {
    if (!this.storageKey || typeof localStorage === 'undefined') return;
    
    try {
      // 转换为可序列化的数据结构
      const serializable: { [key: string]: { value: any, timestamp: number } } = {};
      this.cache.forEach((value, key) => {
        // 只能使用字符串作为键
        const stringKey = String(key);
        serializable[stringKey] = value;
      });
      
      localStorage.setItem(this.storageKey, JSON.stringify(serializable));
    } catch (e) {
      console.error('保存缓存到localStorage失败:', e);
    }
  }
  
  // 从localStorage加载缓存
  private loadFromStorage(): void {
    if (!this.storageKey || typeof localStorage === 'undefined') return;
    
    try {
      const storedData = localStorage.getItem(this.storageKey);
      if (!storedData) return;
      
      const parsed = JSON.parse(storedData);
      
      // 恢复缓存数据
      Object.keys(parsed).forEach(key => {
        const item = parsed[key];
        // 检查是否过期
        if (Date.now() - item.timestamp <= CACHE_TTL) {
          // 使用字符串键，但尊重原始键类型（尽可能）
          this.cache.set(key as any as K, item);
        }
      });
      
      logger.debug(`从localStorage恢复缓存: ${this.cache.size}项 (${this.storageKey})`);
    } catch (e) {
      console.error('从localStorage加载缓存失败:', e);
    }
  }
}

class GitHubTokenManager {
  private tokens: string[] = [];
  private currentIndex: number = 0;
  private usageCount: Map<string, number> = new Map();
  private failedTokens: Set<string> = new Set();
  
  constructor() {
    // 只在开发环境或配置了使用令牌模式时加载令牌
    if (isDevEnvironment || USE_TOKEN_MODE) {
      this.loadTokensFromEnv();
    }
    
    // 记录token加载状态
    if (this.tokens.length > 0) {
      logger.info(`成功加载 ${this.tokens.length} 个GitHub Personal Access Token`);
    } else if (isDevEnvironment) {
      logger.warn('未加载任何GitHub Personal Access Token，API访问将受到严格限制');
    }
  }
  
  public loadTokensFromEnv() {
    // 清空现有token
    this.tokens = [];
    
    try {
      // 获取PAT时支持无前缀
        Object.keys(import.meta.env).forEach(key => {
        if ((key.startsWith('GITHUB_PAT') || key.startsWith('VITE_GITHUB_PAT')) && import.meta.env[key]) {
            const token = import.meta.env[key];
            if (token && typeof token === 'string' && token.trim().length > 0) {
              this.tokens.push(token.trim());
              logger.debug(`已加载环境变量token: ${key.substring(0, 15)}... (已脱敏)`);
            }
          }
        });
      
      // 尝试从localStorage加载token（用于开发环境）
      if (typeof localStorage !== 'undefined') {
        const localToken = localStorage.getItem('GITHUB_PAT');
        if (localToken && localToken.trim().length > 0) {
          this.tokens.push(localToken.trim());
          logger.debug('已从localStorage加载token (已脱敏)');
        }
      }
      
      // 记录token加载状态
      if (this.tokens.length > 0) {
        logger.info(`已加载 ${this.tokens.length} 个GitHub Personal Access Token`);
      }
    } catch (error) {
      logger.error('加载GitHub token失败:', error);
    }
  }
  
  public getCurrentToken(): string {
    if (this.tokens.length === 0) return '';
    return this.tokens[this.currentIndex];
  }
  
  public getNextToken(): string {
    if (this.tokens.length === 0) return '';
    
    // 轮换到下一个有效的令牌
    let attempts = 0;
    while (attempts < this.tokens.length) {
      this.currentIndex = (this.currentIndex + 1) % this.tokens.length;
      const token = this.tokens[this.currentIndex];
      
      // 跳过已知失败的令牌
      if (this.failedTokens.has(token)) {
        attempts++;
        continue;
      }
      
      return token;
    }
    
    // 如果所有令牌都失败，重置并返回第一个令牌
    this.failedTokens.clear();
    this.currentIndex = 0;
    return this.tokens[0];
  }
  
  public markTokenUsed(token: string) {
    const count = this.usageCount.get(token) || 0;
    this.usageCount.set(token, count + 1);
    
    // 如果一个令牌使用次数过多，自动轮换到下一个
    if (count > 30) {
      this.usageCount.set(token, 0);
      this.getNextToken();
    }
  }
  
  public markTokenFailed(token: string) {
    this.failedTokens.add(token);
    return this.getNextToken();
  }
  
  public hasTokens(): boolean {
    return this.tokens.length > 0;
  }
  
  public getTokenCount(): number {
    return this.tokens.length;
  }
  
  public rotateToNextToken(): string {
    // 获取下一个可用的令牌
    return this.getNextToken();
  }
  
  public markCurrentTokenFailed(): void {
    const currentToken = this.getCurrentToken();
    if (currentToken) {
      this.markTokenFailed(currentToken);
    }
  }
}

// 请求批处理器
class RequestBatcher {
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

// 创建PAT管理器和请求批处理器实例
const tokenManager = new GitHubTokenManager();
const requestBatcher = new RequestBatcher();
const contentCache = new LRUCache<string, GitHubContent[]>(MAX_CACHE_SIZE, STORAGE_KEY_CONTENT_CACHE);
const fileContentCache = new LRUCache<string, string>(MAX_CACHE_SIZE, STORAGE_KEY_FILE_CACHE);

// 添加配置信息
export interface ConfigInfo {
  officeProxyUrl: string;
  repoOwner: string;
  repoName: string;
  repoBranch: string;
}

// 存储配置信息
let configInfo: ConfigInfo = {
  officeProxyUrl: import.meta.env.OFFICE_PREVIEW_PROXY || import.meta.env.VITE_OFFICE_PREVIEW_PROXY || '',
  repoOwner: GITHUB_REPO_OWNER,
  repoName: GITHUB_REPO_NAME,
  repoBranch: DEFAULT_BRANCH
};

// 构建API服务
export class GitHubService {
  private static readonly tokenManager = new GitHubTokenManager();
  private static readonly contentCache = new LRUCache<string, GitHubContent[]>(MAX_CACHE_SIZE, STORAGE_KEY_CONTENT_CACHE);
  private static readonly fileCache = new LRUCache<string, string>(MAX_CACHE_SIZE, STORAGE_KEY_FILE_CACHE);
  private static readonly batcher = new RequestBatcher();
  private static readonly GITHUB_API_BASE = 'https://api.github.com';
  private static readonly IMAGE_PROXY_URL = import.meta.env.VITE_IMAGE_PROXY_URL || 'https://gh-proxy.com';
  
  // 获取GitHub PAT总数
  public static getTokenCount(): number {
    return this.tokenManager.getTokenCount();
  }
  
  // 检查是否配置了有效token
  public static hasToken(): boolean {
    return this.tokenManager.hasTokens();
  }
  
  // 设置本地token（开发环境使用）
  public static setLocalToken(token: string): void {
    if (typeof localStorage !== 'undefined') {
      if (!token || token.trim().length === 0) {
        localStorage.removeItem('GITHUB_PAT');
        logger.info('已移除本地GitHub token');
      } else {
        localStorage.setItem('GITHUB_PAT', token.trim());
        logger.info('已设置本地GitHub token');
      }
      this.tokenManager.loadTokensFromEnv();
    }
  }
  
  // 获取请求头
  private static getAuthHeaders(): HeadersInit {
    if (USE_SERVER_API) {
      // 使用服务端API时，不需要在前端添加认证头
      return {
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      };
    }
    
    const token = this.getGitHubPAT();
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }
    
    return headers;
  }
  
  // 获取GitHub PAT
  private static getGitHubPAT(): string {
    const token = this.tokenManager.getCurrentToken();
    if (token) {
      this.tokenManager.markTokenUsed(token);
    }
    return token;
  }
  
  // 处理API错误
  private static handleApiError(error: Response): void {
    // 如果是授权问题，标记当前令牌为失败并尝试使用下一个
    if (error.status === 401 || error.status === 403) {
      const currentToken = this.tokenManager.getCurrentToken();
      if (currentToken) {
        logger.warn(`令牌认证失败，尝试使用下一个令牌`);
        this.tokenManager.markTokenFailed(currentToken);
      }
    }
    
    // 如果是速率限制问题，也轮换令牌
    if (error.status === 429) {
      const currentToken = this.tokenManager.getCurrentToken();
      if (currentToken) {
        logger.warn(`令牌请求频率限制，尝试使用下一个令牌`);
        this.tokenManager.getNextToken();
      }
    }
    
    // 处理400错误(Bad Request)
    if (error.status === 400) {
      const currentToken = this.tokenManager.getCurrentToken();
      if (currentToken) {
        logger.warn(`发生400错误(Bad Request)，可能是请求格式问题或Token权限不足，尝试使用下一个令牌`);
        this.tokenManager.getNextToken();
      }
      
      // 尝试获取并记录错误详情以便调试
      error.clone().text().then(errorText => {
        try {
          const errorJson = JSON.parse(errorText);
          logger.error(`GitHub API 400错误详情: ${JSON.stringify(errorJson)}`);
          
          // 检查是否有具体错误消息
          if (errorJson.message) {
            logger.error(`错误消息: ${errorJson.message}`);
          }
          
          // 检查是否是验证错误
          if (errorJson.errors && Array.isArray(errorJson.errors)) {
            errorJson.errors.forEach((err: any, index: number) => {
              logger.error(`详细错误 #${index + 1}: ${JSON.stringify(err)}`);
            });
          }
        } catch (e) {
          // 如果不是JSON格式，直接记录原始文本
          logger.error(`GitHub API 400错误详情 (非JSON格式): ${errorText}`);
        }
      }).catch(e => {
        logger.error('无法解析400错误响应内容:', e);
      });
    }
  }
  
  // 获取处理过的URL，解决CORS问题
  private static getProxiedUrl(url: string): string {
    if (!url) return '';
    
    // 如果是开发环境且未配置代理，则直接返回原始URL
    if (import.meta.env.DEV && !USE_TOKEN_MODE && !import.meta.env.IMAGE_PROXY_URL) {
      return url;
    }
    
    // 修改：优先使用服务端API代理
    if (FORCE_SERVER_PROXY) {
      // 通过服务端API代理请求
      return `/api/github?action=getFileContent&url=${encodeURIComponent(url)}`;
    }
    
    // 使用多代理服务机制
    // 过滤掉已知失败的代理
    const availableProxies = PROXY_SERVICES.filter(proxy => !failedProxyServices.has(proxy));
    
    // 如果所有代理都失败了，重置失败记录并重新尝试所有代理
    if (availableProxies.length === 0) {
      logger.warn('所有图片代理服务均已失败，重置并重试');
      failedProxyServices.clear();
      // 使用默认代理
      return this.applyProxyToUrl(url, PROXY_SERVICES[0]);
    }
    
    // 使用第一个可用的代理
    return this.applyProxyToUrl(url, availableProxies[0]);
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
  
  // 标记代理服务失败
  public static markProxyServiceFailed(proxyUrl: string): void {
    if (proxyUrl && !failedProxyServices.has(proxyUrl)) {
      logger.warn(`标记代理服务失败: ${proxyUrl}`);
      failedProxyServices.add(proxyUrl);
    }
  }
  
  // 获取当前使用的代理服务
  public static getCurrentProxyService(): string {
    const availableProxies = PROXY_SERVICES.filter(proxy => !failedProxyServices.has(proxy));
    return availableProxies.length > 0 ? availableProxies[0] : PROXY_SERVICES[0];
  }
  
  // 重置失败的代理服务记录
  public static resetFailedProxyServices(): void {
    failedProxyServices.clear();
    logger.info('已重置所有失败的代理服务记录');
  }
  
  // 获取API URL
  private static getApiUrl(path: string): string {
    // 安全处理路径
    const safePath = path.replace(/^\/+/, ''); // 移除开头的斜杠
    
    // 构建正确的GitHub API URL
    const apiUrl = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${safePath}?ref=${DEFAULT_BRANCH}`;
    
    // 开发环境使用本地代理
    if (isDevEnvironment) {
      // 确保URL编码正确
      const encodedPath = safePath ? encodeURIComponent(safePath) : '';
      return `/github-api/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${encodedPath}?ref=${DEFAULT_BRANCH}`;
    }
    
    return apiUrl;
  }
  
  // 获取目录内容 - 使用缓存和批处理
  public static async getContents(path: string, signal?: AbortSignal): Promise<GitHubContent[]> {
    const cacheKey = `contents_${path}`;
    const cachedContents = this.contentCache.get(cacheKey);
    
    if (cachedContents) {
      logger.debug(`已从缓存中获取内容: ${path}`);
      return cachedContents;
    }
    
    try {
      let data: GitHubContent | GitHubContent[];
      
      // 根据环境决定使用服务端API还是直接调用GitHub API
      if (USE_SERVER_API) {
        const response = await axios.get(`/api/github?action=getContents&path=${encodeURIComponent(path)}`);
        data = response.data;
        logger.debug(`通过服务端API获取内容: ${path}`);
      } else {
        // 原始直接请求GitHub API的代码
        const apiUrl = this.getApiUrl(path);
        
        // 使用批处理器处理请求
        const response = await this.batcher.enqueue(apiUrl, async () => {
          logger.debug(`API请求: ${apiUrl}`);
          const result = await fetch(apiUrl, {
            method: 'GET',
            headers: this.getAuthHeaders(),
            signal
          });
          
          if (!result.ok) {
            this.handleApiError(result);
          }
          
          return result.json();
        });
        
        data = response;
        logger.debug(`直接请求GitHub API获取内容: ${path}`);
      }
      
      // 确保我们总是返回数组
      const contents = Array.isArray(data) ? data : [data];
      this.contentCache.set(cacheKey, contents);
      return contents;
    } catch (error: any) {
      logger.error(`获取内容失败: ${path}`, error);
      throw new Error(`获取内容失败: ${error.message}`);
    }
  }
  
  // 预取目录内容
  public static prefetchContents(path: string): void {
    this.getContents(path).catch(() => {}); // 忽略错误
  }
  
  // 获取文件内容 - 使用缓存和批处理
  public static async getFileContent(fileUrl: string): Promise<string> {
    // 添加缓存键
    const cacheKey = `file:${fileUrl}`;
    
    // 检查缓存
    const cachedContent = this.fileCache.get(cacheKey);
    if (cachedContent) {
      logger.debug(`从缓存获取文件内容: ${fileUrl}`);
      return cachedContent;
    }
    
    logger.time(`加载文件: ${fileUrl}`);
    
    try {
      let response;
      
      // 修改：非开发环境或开启令牌模式时，强制使用服务端API
      if (FORCE_SERVER_PROXY) {
        // 通过服务端API获取文件内容
        const serverApiUrl = `/api/github?action=getFileContent&url=${encodeURIComponent(fileUrl)}`;
        response = await fetch(serverApiUrl);
      } else if (USE_TOKEN_MODE) {
        // 使用令牌模式，通过添加认证头直接请求
        response = await fetch(fileUrl, {
            headers: this.getAuthHeaders()
          });
      } else {
        // 开发环境，直接请求
        response = await fetch(fileUrl);
      }
          
      if (!response.ok) {
        this.handleApiError(response);
          }
          
      const content = await response.text();
      
      // 缓存文件内容
      this.fileCache.set(cacheKey, content);
      return content;
    } catch (error: any) {
      logger.error(`获取文件内容失败: ${fileUrl}`, error);
      throw new Error(`获取文件内容失败: ${error.message}`);
    } finally {
      logger.timeEnd(`加载文件: ${fileUrl}`);
    }
  }
  
  // 清除缓存
  public static clearCache(): void {
    this.contentCache.clear();
    this.fileCache.clear();
    logger.info('已清除所有API缓存');
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
        if (useTokenMode || !import.meta.env.DEV) {
          const proxyUrl = this.getProxiedUrl(src);
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
      
      // 获取仓库信息 - 确保使用.env中配置的仓库信息
      // 尝试从markdownFilePath中提取仓库信息
      let repoOwner = GITHUB_REPO_OWNER;
      let repoName = GITHUB_REPO_NAME;
      
      // 检查markdownFilePath是否包含完整的GitHub URL
      if (markdownFilePath.includes('github.com')) {
        try {
          // 尝试从URL中提取仓库信息
          const urlMatch = markdownFilePath.match(/github\.com\/([^\/]+)\/([^\/]+)/);
          if (urlMatch && urlMatch.length >= 3) {
            // 使用URL中的仓库信息
            repoOwner = urlMatch[1];
            repoName = urlMatch[2];
            logger.debug('从URL提取的仓库信息:', `${repoOwner}/${repoName}`);
          }
        } catch (e) {
          logger.warn('从URL提取仓库信息失败，使用默认值');
        }
      }
      
      // 构建GitHub原始URL
      const branch = DEFAULT_BRANCH;
      const rawUrl = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/${branch}/${fullPath}`;
      logger.debug('构建的原始URL:', rawUrl);
    
      // 是否使用代理
      if (useTokenMode || !import.meta.env.DEV) {
        const proxyUrl = this.getProxiedUrl(rawUrl);
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
  
  // 使用GitHub API进行搜索
  public static async searchWithGitHubApi(
    searchTerm: string,
    currentPath: string = '',
    fileTypeFilter?: string
  ): Promise<GitHubContent[]> {
    try {
      // 构建搜索查询
      let query = `repo:${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME} ${searchTerm}`;
      
      // 如果提供了当前路径，则限制搜索范围
      if (currentPath && currentPath !== '/') {
        query += ` path:${currentPath}`;
      }
      
      // 如果提供了文件类型过滤器，则限制文件类型
      if (fileTypeFilter) {
        query += ` extension:${fileTypeFilter}`;
      }
      
      let searchResults;
      
      if (USE_SERVER_API) {
        // 使用服务端API执行搜索
        const response = await axios.get(`/api/github?action=search&q=${encodeURIComponent(query)}`);
        searchResults = response.data;
        logger.debug(`通过服务端API搜索: ${query}`);
      } else {
        // 原始搜索代码
        const apiUrl = `${this.GITHUB_API_BASE}/search/code`;
        const urlWithParams = new URL(apiUrl);
        urlWithParams.searchParams.append('q', query);
        urlWithParams.searchParams.append('per_page', '100'); // 最大结果数
        
        // 使用批处理器处理请求
        const fetchUrl = urlWithParams.toString();
        const response = await this.batcher.enqueue(fetchUrl, async () => {
          logger.debug(`搜索API请求: ${fetchUrl}`);
          const result = await fetch(fetchUrl, {
            method: 'GET',
            headers: this.getAuthHeaders()
          });
          
          if (!result.ok) {
            this.handleApiError(result);
          }
          
          return result.json();
        });
        
        searchResults = response;
        logger.debug(`直接请求GitHub API搜索: ${query}`);
      }
      
      // 处理搜索结果
      if (!searchResults || !searchResults.items) {
        return [];
      }
      
      // 转换搜索结果为GitHubContent格式
      const results: GitHubContent[] = searchResults.items.map((item: any) => ({
        name: item.name,
        path: item.path,
        sha: item.sha,
        size: item.size || 0,
        url: item.url,
        html_url: item.html_url,
        git_url: item.git_url,
        download_url: item.html_url.replace('github.com', 'raw.githubusercontent.com').replace(/\/blob\//, '/'),
        type: 'file',
        _links: {
          self: item.url,
          git: item.git_url,
          html: item.html_url
        }
      }));
      
      return results;
    } catch (error: any) {
      logger.error(`搜索失败: ${searchTerm}`, error);
      throw new Error(`搜索失败: ${error.message}`);
    }
  }
  
  // 搜索文件
  public static async searchFiles(
    searchTerm: string, 
    currentPath: string = '',
    recursive: boolean = false,
    fileTypeFilter?: string
  ): Promise<GitHubContent[]> {
    if (!searchTerm.trim()) {
      return [];
    }
    
    logger.time(`搜索文件: ${searchTerm} 在路径 ${currentPath}`);
    
    try {
      // 首先获取当前目录的内容
      const contents = await this.getContents(currentPath);
      
      // 过滤匹配的文件 - 严格只匹配文件名
      const normalizedSearchTerm = searchTerm.trim().toLowerCase();
      let results: GitHubContent[] = [];
      
      // 处理当前目录中的匹配项
      results = contents.filter(item => {
        // 如果指定了文件类型过滤，则只匹配特定类型的文件
        if (fileTypeFilter && item.type === 'file') {
          const extension = item.name.split('.').pop()?.toLowerCase();
          if (!extension || extension !== fileTypeFilter.toLowerCase()) {
            return false;
          }
        }
        
        // 仅匹配文件名本身，不匹配路径
        const fileName = item.name.toLowerCase();
        return fileName.includes(normalizedSearchTerm);
      });
      
      // 如果需要递归搜索子目录（无深度限制）
      if (recursive) {
        const directories = contents.filter(item => item.type === 'dir');
        
        // 并行搜索子目录，而不是串行处理
        if (directories.length > 0) {
          logger.debug(`并行搜索 ${directories.length} 个子目录（无深度限制）`);
          
          // 创建所有子目录搜索的Promise数组
          const searchPromises = directories.map(dir => 
            this.searchFiles(
              searchTerm, 
              dir.path, 
              true, 
              fileTypeFilter
            ).catch(error => {
              // 捕获单个目录搜索失败，但不影响其他目录
              logger.warn(`搜索目录 ${dir.path} 失败: ${error.message}`);
              return [] as GitHubContent[];
            })
          );
          
          // 并行执行所有搜索请求
          const subResults = await Promise.all(searchPromises);
          
          // 合并所有子目录结果
          for (const items of subResults) {
            results = [...results, ...items];
          }
        }
      }
      
      logger.debug(`搜索结果: 找到 ${results.length} 个匹配项（仅匹配文件名）`);
      return results;
    } catch (error: any) {
      logger.error(`搜索文件失败: ${error.message}`);
      throw new Error(`搜索文件失败: ${error.message}`);
    } finally {
      logger.timeEnd(`搜索文件: ${searchTerm} 在路径 ${currentPath}`);
    }
  }

  // 获取配置信息
  public static async getConfig(): Promise<ConfigInfo> {
    // 根据开发者模式环境变量决定使用的分支
    const isDeveloperMode = import.meta.env.VITE_DEVELOPER_MODE === 'true';
    const branch = isDeveloperMode ? "beta" : "main";
    
    return {
      officeProxyUrl: import.meta.env.OFFICE_PREVIEW_PROXY || import.meta.env.VITE_OFFICE_PREVIEW_PROXY || '',
      repoOwner: "UE-DND",
      repoName: "Repo-Viewer",
      repoBranch: branch
    };
  }

  /**
   * 获取仓库最新的提交信息
   * @returns Promise<{sha: string, message: string, date: string}>
   */
  public static async getLatestCommit(): Promise<{sha: string, message: string, date: string}> {
    try {
      // 使用固定的仓库路径，而不是环境变量
      const fixedRepoOwner = "UE-DND";
      const fixedRepoName = "Repo-Viewer";
      
      // 根据开发者模式决定使用的分支
      const isDeveloperMode = import.meta.env.VITE_DEVELOPER_MODE === 'true';
      const branch = isDeveloperMode ? "beta" : "main";
      
      // 构建API URL
      const url = `${this.GITHUB_API_BASE}/repos/${fixedRepoOwner}/${fixedRepoName}/commits/${branch}`;
      
      // 决定是使用服务端API还是直接请求
      let response;
      if (USE_SERVER_API) {
        // 传递分支参数到API
        response = await fetch(`/api/github/commits?branch=${branch}`);
      } else {
        // 获取认证头
        const headers = this.getAuthHeaders();
        response = await fetch(url, { headers });
      }

      if (!response.ok) {
        this.handleApiError(response);
        return { sha: '', message: '无法获取版本信息', date: '' };
      }

      const data = await response.json();
      
      // 提取提交信息
      const sha = data.sha?.substring(0, 7) || '';
      const message = data.commit?.message || '';
      const date = data.commit?.author?.date || '';
      
      return { sha, message, date };
    } catch (error) {
      logger.error('获取最新提交信息失败:', error);
      return { sha: '', message: '获取版本信息出错', date: '' };
    }
  }
} 