import { GitHubContent } from '../../types';
import { logger } from '../../utils';
import { getGithubConfig, getRuntimeConfig, getAccessConfig, isDeveloperMode } from '../../config/ConfigManager';
import axios from 'axios';
import { CacheManager } from './CacheManager';
import { GitHubTokenManager } from './TokenManager';
import { ProxyService } from './proxy/ProxyService';
import { RequestBatcher } from './RequestBatcher';
import { ErrorManager } from '../../utils/error/ErrorManager';
import { GitHubError } from '../../types/errors';

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
const isDevEnvironment = import.meta.env.DEV;

// 添加配置信息
export interface ConfigInfo {
  repoOwner: string;
  repoName: string;
  repoBranch: string;
}

// GitHub API服务类
export class GitHubService {
  private static readonly tokenManager = new GitHubTokenManager();
  private static readonly batcher = new RequestBatcher();
  private static readonly GITHUB_API_BASE = 'https://api.github.com';

  // 缓存初始化状态
  private static cacheInitialized = false;

  // 确保缓存初始化
  private static async ensureCacheInitialized(): Promise<void> {
    if (!this.cacheInitialized) {
      try {
        await CacheManager.initialize();
        this.cacheInitialized = true;
        logger.info('GitHubService: 缓存系统初始化完成');
      } catch (error) {
        logger.warn('GitHubService: 缓存系统初始化失败，使用同步缓存', error);
        // 即使初始化失败，也标记为已初始化以避免重复尝试
        this.cacheInitialized = true;
      }
    }
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

  // 处理API错误 - 增强版错误处理
  private static handleApiError(error: Response, endpoint: string, method = 'GET'): GitHubError {
    // 先调用原有的token管理器错误处理
    this.tokenManager.handleApiError(error);

    // 创建详细的GitHub错误
    const gitHubError = ErrorManager.createGitHubError(
      error.statusText || `HTTP ${error.status} 错误`,
      error.status,
      endpoint,
      method,
      {
        remaining: parseInt(error.headers.get('x-ratelimit-remaining') || '0'),
        reset: parseInt(error.headers.get('x-ratelimit-reset') || '0')
      },
      {
        url: error.url,
        headers: Object.fromEntries(error.headers.entries())
      }
    );

    // 记录错误
    ErrorManager.captureError(gitHubError);

    return gitHubError;
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

  // 获取目录内容 - 使用增强缓存和批处理
  public static async getContents(path: string, signal?: AbortSignal): Promise<GitHubContent[]> {
    await this.ensureCacheInitialized();

    const cacheKey = `contents_${path}`;
    const contentCache = CacheManager.getContentCache();
    const cachedContents = await contentCache.get(cacheKey);

    if (cachedContents) {
      logger.debug(`已从缓存中获取内容: ${path}`);

      // 预加载相关内容
      this.prefetchRelatedContent(cachedContents).catch(() => {});

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
            signal: signal || null
          });

          if (!result.ok) {
            throw this.handleApiError(result, apiUrl, 'GET');
          }

          return result.json();
        }, {
          priority: 'high', // 内容获取优先级高
          method: 'GET',
          headers: this.getAuthHeaders() as Record<string, string>
        });

        data = response;
        logger.debug(`直接请求GitHub API获取内容: ${path}`);
      }

      // 确保我们总是返回数组
      const contents = Array.isArray(data) ? data : [data];

      // 使用异步缓存并包含版本信息
      const version = this.generateContentVersion(path, contents);
      await contentCache.set(cacheKey, contents, version);

      // 预加载相关内容
      this.prefetchRelatedContent(contents).catch(() => {});

      return contents;
    } catch (error: any) {
      logger.error(`获取内容失败: ${path}`, error);
      throw new Error(`获取内容失败: ${error.message}`);
    }
  }

  // 智能预取目录内容（增强版）
  public static prefetchContents(path: string, priority: 'high' | 'medium' | 'low' = 'low'): void {
    // 使用低优先级预加载，不影响用户操作
    setTimeout(() => {
      this.getContents(path).catch(() => {}); // 忽略错误
    }, priority === 'high' ? 0 : priority === 'medium' ? 100 : 200);
  }

  // 批量预加载多个路径
  public static async batchPrefetchContents(paths: string[], maxConcurrency: number = 3): Promise<void> {
    if (paths.length === 0) return;

    // 限制并发数量防止网络资源过耗
    for (let i = 0; i < paths.length; i += maxConcurrency) {
      const batch = paths.slice(i, i + maxConcurrency);
      const promises = batch.map(path =>
        this.getContents(path).catch(() => null)
      );

      await Promise.allSettled(promises);

      // 批次间稍微延迟
      if (i + maxConcurrency < paths.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
  }

  // 智能预加载相关内容（增强版）
  private static async prefetchRelatedContent(contents: GitHubContent[]): Promise<void> {
    try {
      // 按类型和大小分组
      const directories = contents.filter(item => item.type === 'dir');
      const files = contents.filter(item => item.type === 'file');

      // 智能选择需要预加载的内容
      const priorityDirs = this.selectPriorityDirectories(directories);
      const priorityFiles = this.selectPriorityFiles(files);

      // 并行预加载目录和文件
      const prefetchPromises: Promise<void>[] = [];

      if (priorityDirs.length > 0) {
        prefetchPromises.push(
          CacheManager.prefetchContent(priorityDirs.map(dir => dir.path))
            .catch(error => logger.debug('预加载目录失败', error))
        );
      }

      if (priorityFiles.length > 0) {
        // 使用低优先级预加载文件
        prefetchPromises.push(
          this.prefetchFilesWithPriority(priorityFiles, 'low')
            .catch(error => logger.debug('预加载文件失败', error))
        );
      }

      // 等待所有预加载完成（但不阻塞主线程）
      await Promise.allSettled(prefetchPromises);

    } catch (error) {
      logger.debug('预加载相关内容失败', error);
    }
  }

  // 选择优先目录（智能策略）
  private static selectPriorityDirectories(directories: GitHubContent[]): GitHubContent[] {
    // 按目录名重要性排序
    const importantDirNames = ['src', 'docs', 'components', 'pages', 'lib', 'utils', 'assets'];

    const prioritized = directories.sort((a, b) => {
      const aImportance = importantDirNames.findIndex(name =>
        a.name.toLowerCase().includes(name.toLowerCase())
      );
      const bImportance = importantDirNames.findIndex(name =>
        b.name.toLowerCase().includes(name.toLowerCase())
      );

      // 重要目录优先
      if (aImportance !== -1 && bImportance === -1) return -1;
      if (aImportance === -1 && bImportance !== -1) return 1;
      if (aImportance !== -1 && bImportance !== -1) return aImportance - bImportance;

      // 按字母顺序
      return a.name.localeCompare(b.name);
    });

    return prioritized.slice(0, 3); // 最多3个目录
  }

  // 选择优先文件（智能策略）
  private static selectPriorityFiles(files: GitHubContent[]): GitHubContent[] {
    const importantExtensions = ['.md', '.txt', '.json', '.js', '.ts', '.tsx', '.jsx'];
    const maxFileSize = 100 * 1024; // 100KB

    // 过滤小文件和重要文件
    const candidates = files.filter(file => {
      if (!file.size || file.size > maxFileSize) return false;

      const extension = file.name.substring(file.name.lastIndexOf('.'));
      return importantExtensions.includes(extension.toLowerCase());
    });

    // 按文件类型和大小排序
    const prioritized = candidates.sort((a, b) => {
      // README文件最高优先级
      if (a.name.toLowerCase().startsWith('readme')) return -1;
      if (b.name.toLowerCase().startsWith('readme')) return 1;

      // 按文件大小排序（小文件优先）
      return (a.size || 0) - (b.size || 0);
    });

    return prioritized.slice(0, 5); // 最多5个文件
  }

  // 使用优先级预加载文件
  private static async prefetchFilesWithPriority(
    files: GitHubContent[],
    priority: 'high' | 'medium' | 'low'
  ): Promise<void> {
    const fileUrls = files
      .map(file => file.download_url)
      .filter(Boolean) as string[];

    if (fileUrls.length === 0) return;

    // 使用增强的批处理器预加载
    const prefetchPromises = fileUrls.map(url =>
      this.batcher.enqueue(`prefetch:${url}`, async () => {
        // 直接通过统一通道获取并写入缓存
        await this.getFileContent(url);
        return null;
      }, {
        priority,
        method: 'GET',
        headers: this.getAuthHeaders() as Record<string, string>,
        skipDeduplication: false
      }).catch(() => null) // 忽略预加载失败
    );

    await Promise.allSettled(prefetchPromises);
  }

  // 生成内容版本
  private static generateContentVersion(path: string, contents: GitHubContent[]): string {
    const contentHash = contents.map(item => `${item.name}-${item.sha || item.size}`).join('|');
    return `${path}-${Date.now()}-${contentHash.slice(0, 8)}`;
  }

  // 获取文件内容 - 使用增强缓存和批处理
  public static async getFileContent(fileUrl: string): Promise<string> {
    await this.ensureCacheInitialized();

    // 添加缓存键
    const cacheKey = `file:${fileUrl}`;
    const fileCache = CacheManager.getFileCache();

    // 检查缓存
    const cachedContent = await fileCache.get(cacheKey);
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
        throw this.handleApiError(response, fileUrl, 'GET');
          }

      const content = await response.text();

      // 缓存文件内容（异步）
      const version = this.generateFileVersion(fileUrl, content);
      await fileCache.set(cacheKey, content, version);
      return content;
    } catch (error: any) {
      logger.error(`获取文件内容失败: ${fileUrl}`, error);
      throw new Error(`获取文件内容失败: ${error.message}`);
    } finally {
      logger.timeEnd(`加载文件: ${fileUrl}`);
    }
  }

  // 清除缓存和重置网络状态
  public static async clearCache(): Promise<void> {
    await CacheManager.clearAllCaches();
    this.batcher.clearCache();
    ProxyService.resetFailedProxyServices();
  }

  // 获取缓存统计
  public static getCacheStats() {
    return CacheManager.getCacheStats();
  }

  // 获取网络请求统计
  public static getNetworkStats() {
    return {
      batcher: this.batcher.getStats(),
      proxy: ProxyService.getProxyHealthStats(),
      cache: this.getCacheStats()
    };
  }

  // 获取批处理器（用于调试）
  public static getBatcher() {
    return this.batcher;
  }

  // 生成文件版本
  private static generateFileVersion(fileUrl: string, content: string): string {
    const contentLength = content.length;
    const urlHash = fileUrl.split('/').slice(-2).join('-'); // 取文件名和父目录
    return `${urlHash}-${contentLength}-${Date.now()}`;
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

        // 使用增强批处理器处理请求
        const fetchUrl = urlWithParams.toString();
        const response = await this.batcher.enqueue(fetchUrl, async () => {
          logger.debug(`搜索API请求: ${fetchUrl}`);
          const result = await fetch(fetchUrl, {
            method: 'GET',
            headers: this.getAuthHeaders()
          });

          if (!result.ok) {
            throw this.handleApiError(result, fetchUrl, 'GET');
          }

          return result.json();
        }, {
          priority: 'medium', // 搜索请求中等优先级
          method: 'GET',
          headers: this.getAuthHeaders() as Record<string, string>
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

}
