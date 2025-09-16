import { GitHubContent } from '../../types';
import { logger } from '../../utils';
import { getGithubConfig, getRuntimeConfig, getAccessConfig, getProxyConfig, isDeveloperMode } from '../../config/ConfigManager';
import axios from 'axios';
import { CacheManager } from './CacheManager';
import { GitHubTokenManager } from './TokenManager';
import { ProxyService } from './ProxyService';
import { RequestBatcher } from './RequestBatcher';

// 基础配置
const githubConfig = getGithubConfig();
const GITHUB_REPO_OWNER = githubConfig.repoOwner;
const GITHUB_REPO_NAME = githubConfig.repoName;
const DEFAULT_BRANCH = githubConfig.repoBranch;

// 运行时配置
const runtimeConfig = getRuntimeConfig();
const accessConfig = getAccessConfig();

// 是否使用服务端API（非开发环境）
const USE_SERVER_API = !runtimeConfig.isDev;

// 模式设置
const USE_TOKEN_MODE = accessConfig.useTokenMode;

// 强制使用服务端API代理所有请求
const FORCE_SERVER_PROXY = !runtimeConfig.isDev || USE_TOKEN_MODE;

// 工具函数
const isDevEnvironment = window.location.hostname === 'localhost';

// 添加配置信息
export interface ConfigInfo {
  repoOwner: string;
  repoName: string;
  repoBranch: string;
}

// 存储配置信息
let configInfo: ConfigInfo = {
  repoOwner: GITHUB_REPO_OWNER,
  repoName: GITHUB_REPO_NAME,
  repoBranch: DEFAULT_BRANCH
};

// 构建API服务
export class GitHubService {
  private static readonly tokenManager = new GitHubTokenManager();
  private static readonly batcher = new RequestBatcher();
  private static readonly GITHUB_API_BASE = 'https://api.github.com';
  private static readonly IMAGE_PROXY_URL = getProxyConfig().imageProxyUrl;
  
  // 初始化缓存管理器
  static {
    CacheManager.initialize();
  }
  
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
    this.tokenManager.setLocalToken(token);
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
    
    const token = this.tokenManager.getGitHubPAT();
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }
    
    return headers;
  }
  
  // 处理API错误
  private static handleApiError(error: Response): void {
    this.tokenManager.handleApiError(error);
  }
  
  // 获取处理过的URL，解决CORS问题
  private static getProxiedUrl(url: string): string {
    return ProxyService.getProxiedUrl(url);
  }
  
  // 标记代理服务失败
  public static markProxyServiceFailed(proxyUrl: string): void {
    ProxyService.markProxyServiceFailed(proxyUrl);
  }
  
  // 获取当前使用的代理服务
  public static getCurrentProxyService(): string {
    return ProxyService.getCurrentProxyService();
  }
  
  // 重置失败的代理服务记录
  public static resetFailedProxyServices(): void {
    ProxyService.resetFailedProxyServices();
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
    const contentCache = CacheManager.getContentCache();
    const cachedContents = contentCache.get(cacheKey);
    
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
      contentCache.set(cacheKey, contents);
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
    const fileCache = CacheManager.getFileCache();
    
    // 检查缓存
    const cachedContent = fileCache.get(cacheKey);
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
      fileCache.set(cacheKey, content);
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
    CacheManager.clearAllCaches();
  }
  
  // 转换相对图片URL为绝对URL
  public static transformImageUrl(src: string | undefined, markdownFilePath: string, useTokenMode: boolean): string | undefined {
    return ProxyService.transformImageUrl(src, markdownFilePath, useTokenMode);
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
    const isDeveloperModeEnabled = isDeveloperMode();
    const branch = isDeveloperModeEnabled ? "beta" : "main";
    
    return {
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
      const isDeveloperModeEnabled = isDeveloperMode();
      const branch = isDeveloperModeEnabled ? "beta" : "main";
      
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