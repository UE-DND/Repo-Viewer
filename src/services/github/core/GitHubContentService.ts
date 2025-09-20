import axios from 'axios';
import { GitHubContent } from '../../../types';
import { logger } from '../../../utils';
import { CacheManager } from '../cache/CacheManager';
import { RequestBatcher } from '../RequestBatcher';
import { GitHubAuth } from './GitHubAuth';
import {
  USE_TOKEN_MODE,
  getApiUrl
} from './GitHubConfig';
import { getForceServerProxy, shouldUseServerAPI } from '../config/ProxyForceManager';
import { safeValidateGitHubContentsResponse } from '../schemas/apiSchemas';
import {
  transformGitHubContentsResponse,
  filterAndNormalizeGitHubContents,
  validateGitHubContentsArray
} from '../schemas/dataTransformers';

export class GitHubContentService {
  private static readonly batcher = new RequestBatcher();

  // 缓存初始化状态
  private static cacheInitialized = false;

  // 确保缓存初始化
  private static async ensureCacheInitialized(): Promise<void> {
    if (!this.cacheInitialized) {
      try {
        await CacheManager.initialize();
        this.cacheInitialized = true;
        logger.info('GitHubContentService: 缓存系统初始化完成');
      } catch (error) {
        logger.warn('GitHubContentService: 缓存系统初始化失败，使用同步缓存', error);
        this.cacheInitialized = true;
      }
    }
  }

  // 获取目录内容
  public static async getContents(path: string, signal?: AbortSignal): Promise<GitHubContent[]> {
    await this.ensureCacheInitialized();

    const cacheKey = `contents_${path}`;
    const contentCache = CacheManager.getContentCache();
    const cachedContents = await contentCache.get(cacheKey);

    if (cachedContents) {
      logger.debug(`已从缓存中获取内容: ${path}`);
      return cachedContents;
    }

    try {
      let rawData: unknown;

      // 根据环境决定使用服务端API还是直接调用GitHub API
      if (shouldUseServerAPI()) {
        const response = await axios.get(`/api/github?action=getContents&path=${encodeURIComponent(path)}`);
        rawData = response.data;
        logger.debug(`通过服务端API获取内容: ${path}`);
      } else {
        const apiUrl = getApiUrl(path);

        // 使用批处理器处理请求
        const response = await this.batcher.enqueue(apiUrl, async () => {
          logger.debug(`API请求: ${apiUrl}`);
          const result = await fetch(apiUrl, {
            method: 'GET',
            headers: GitHubAuth.getAuthHeaders(),
            signal: signal || null
          });

          if (!result.ok) {
            throw GitHubAuth.handleApiError(result, apiUrl, 'GET');
          }

          return result.json();
        }, {
          priority: 'high',
          method: 'GET',
          headers: GitHubAuth.getAuthHeaders() as Record<string, string>
        });

        rawData = response;
        logger.debug(`直接请求GitHub API获取内容: ${path}`);
      }

      // 验证API响应
      const validation = safeValidateGitHubContentsResponse(rawData);
      if (!validation.success) {
        logger.error(`API响应验证失败: ${path}`, validation.error);
        throw new Error(`API响应格式错误: ${validation.error}`);
      }

      // 转换为内部模型
      const rawContents = transformGitHubContentsResponse(validation.data);

      // 过滤和标准化内容
      const contents = filterAndNormalizeGitHubContents(rawContents, {
        excludeHidden: true,
        excludeFiles: ['.gitkeep', 'Thumbs.db', '.DS_Store']
      });

      // 验证转换后的数据
      const contentValidation = validateGitHubContentsArray(contents);
      if (!contentValidation.isValid) {
        logger.warn(`内容数据验证存在问题: ${path}`, contentValidation.invalidItems);
      }

      // 使用异步缓存并包含版本信息
      const version = this.generateContentVersion(path, contents);
      await contentCache.set(cacheKey, contents, version);

      return contents;
    } catch (error: any) {
      logger.error(`获取内容失败: ${path}`, error);
      throw new Error(`获取内容失败: ${error.message}`);
    }
  }

  // 获取文件内容
  public static async getFileContent(fileUrl: string): Promise<string> {
    await this.ensureCacheInitialized();

    const cacheKey = `file:${fileUrl}`;
    const fileCache = CacheManager.getFileCache();

    // 检查缓存
    const cachedContent = await fileCache.get(cacheKey);
    if (cachedContent) {
      logger.debug(`从缓存获取文件内容: ${fileUrl}`);
      return cachedContent;
    }

    try {
      let response: Response;

      // 通过服务端API获取文件内容
      if (getForceServerProxy()) {
        const serverApiUrl = `/api/github?action=getFileContent&url=${encodeURIComponent(fileUrl)}`;
        response = await fetch(serverApiUrl);
      } else {
        // 使用令牌模式，通过添加认证头直接请求
        let proxyUrl: string;
        if (fileUrl.includes('raw.githubusercontent.com')) {
          proxyUrl = fileUrl.replace('https://raw.githubusercontent.com', '/github-raw');
        } else {
          proxyUrl = fileUrl;
        }

        // 开发环境，直接请求
        response = await fetch(proxyUrl, {
          headers: USE_TOKEN_MODE ? GitHubAuth.getAuthHeaders() : {}
        });
      }

      if (!response.ok) {
        throw GitHubAuth.handleApiError(response, fileUrl, 'GET');
      }

      const content = await response.text();

      // 缓存文件内容（异步）
      const version = this.generateFileVersion(fileUrl, content);
      await fileCache.set(cacheKey, content, version);
      return content;
    } catch (error: any) {
      logger.error(`获取文件内容失败: ${fileUrl}`, error);
      throw new Error(`获取文件内容失败: ${error.message}`);
    }
  }

  // 生成内容版本
  private static generateContentVersion(path: string, contents: GitHubContent[]): string {
    const contentHash = contents.map(item => `${item.name}-${item.sha || item.size}`).join('|');
    return `${path}-${Date.now()}-${contentHash.slice(0, 8)}`;
  }

  // 生成文件版本
  private static generateFileVersion(fileUrl: string, content: string): string {
    const contentLength = content.length;
    const urlHash = fileUrl.split('/').slice(-2).join('-');
    return `${urlHash}-${contentLength}-${Date.now()}`;
  }

  // 获取批处理器（用于调试）
  public static getBatcher() {
    return this.batcher;
  }

  // 清除批处理器缓存
  public static clearBatcherCache(): void {
    this.batcher.clearCache();
  }
}
