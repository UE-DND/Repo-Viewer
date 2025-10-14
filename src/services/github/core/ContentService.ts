import axios from 'axios';
import type { GitHubContent } from '@/types';
import { logger } from '@/utils';
import { CacheManager } from '../cache/CacheManager';
import { RequestBatcher } from '../RequestBatcher';
import { GitHubAuth } from './Auth';
import {
  USE_TOKEN_MODE,
  getApiUrl,
  getCurrentBranch
} from './Config';
import { getForceServerProxy, shouldUseServerAPI } from '../config/ProxyForceManager';
import { safeValidateGitHubContentsResponse } from '../schemas/apiSchemas';
import {
  transformGitHubContentsResponse,
  filterAndNormalizeGitHubContents,
  validateGitHubContentsArray
} from '../schemas/dataTransformers';

const ROOT_PATH_KEY = '__root__';

function buildContentsCacheKey(path: string, branch: string): string {
  const normalizedPath = path === '' ? ROOT_PATH_KEY : path;
  return `contents_${branch}__${normalizedPath}`;
}

// GitHub内容服务，使用模块导出而非类
const batcher = new RequestBatcher();

// 缓存初始化状态
let cacheInitialized = false;

// 确保缓存初始化
async function ensureCacheInitialized(): Promise<void> {
  if (!cacheInitialized) {
    try {
      await CacheManager.initialize();
      cacheInitialized = true;
      logger.info('ContentService: 缓存系统初始化完成');
    } catch (error) {
      logger.warn('ContentService: 缓存系统初始化失败，使用同步缓存', error);
      // 即使初始化失败，也标记为已初始化以避免重复尝试
      cacheInitialized = true;
    }
  }
}

// 获取目录内容
export async function getContents(path: string, signal?: AbortSignal): Promise<GitHubContent[]> {
  await ensureCacheInitialized();

    const branch = getCurrentBranch();
    const cacheKey = buildContentsCacheKey(path, branch);
    const contentCache = CacheManager.getContentCache();
    const cachedContents = await contentCache.get(cacheKey);

    if (cachedContents !== null && cachedContents !== undefined) {
      logger.debug(`已从缓存中获取内容: ${path}`);
      return cachedContents as GitHubContent[];
    }

    try {
      let rawData: unknown;

      // 根据环境决定使用服务端API还是直接调用GitHub API（运行时判定）
      if (shouldUseServerAPI()) {
        const query = new URLSearchParams();
        query.set('action', 'getContents');
        query.set('path', path);
        query.set('branch', branch);
        rawData = (await axios.get(`/api/github?${query.toString()}`)).data;
        logger.debug(`通过服务端API获取内容: ${path}`);
      } else {
        // 原始直接请求GitHub API的代码
        const apiUrl = getApiUrl(path, branch);

        // 使用批处理器处理请求
        rawData = await batcher.enqueue(apiUrl, async () => {
          logger.debug(`API请求: ${apiUrl}`);
          const result = await fetch(apiUrl, {
            method: 'GET',
            headers: GitHubAuth.getAuthHeaders(),
            signal: signal ?? null
          });

          if (!result.ok) {
            const error = new Error(`HTTP ${result.status.toString()}: ${result.statusText}`);
            throw error;
          }

          return result.json() as Promise<unknown>;
        }, {
          priority: 'high', // 内容获取优先级高
          method: 'GET',
          headers: GitHubAuth.getAuthHeaders() as Record<string, string>
        });

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
        // 不阻止执行，但记录警告
      }

      // 使用异步缓存并包含版本信息
      const version = generateContentVersion(path, branch, contents);
      await contentCache.set(cacheKey, contents, version);

      return contents;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      logger.error(`获取内容失败: ${path}`, error);
      throw new Error(`获取内容失败: ${errorMessage}`);
    }
}

// 获取文件内容
export async function getFileContent(fileUrl: string): Promise<string> {
  await ensureCacheInitialized();

    // 添加缓存键
    const cacheKey = `file:${fileUrl}`;
    const fileCache = CacheManager.getFileCache();

    // 检查缓存
    const cachedContent = await fileCache.get(cacheKey);
    if (cachedContent !== undefined) {
      logger.debug(`从缓存获取文件内容: ${fileUrl}`);
      return cachedContent;
    }

    try {
      const response = await (async () => {
        if (getForceServerProxy()) {
          // 通过服务端API获取文件内容
          const serverApiUrl = `/api/github?action=getFileContent&url=${encodeURIComponent(fileUrl)}`;
          return fetch(serverApiUrl);
        }

        // 开发环境或令牌模式，通过 Vite 代理获取文件内容
        // 将 raw.githubusercontent.com URL 转换为本地代理路径
        let proxyUrl: string;
        if (fileUrl.includes('raw.githubusercontent.com')) {
          // 转换为 /github-raw 代理路径
          proxyUrl = fileUrl.replace('https://raw.githubusercontent.com', '/github-raw');
        } else {
          // 其他情况保持原样（可能已经是代理路径）
          proxyUrl = fileUrl;
        }

        return fetch(proxyUrl, {
          headers: USE_TOKEN_MODE ? GitHubAuth.getAuthHeaders() : {}
        });
      })();

      if (!response.ok) {
        const error = new Error(`HTTP ${response.status.toString()}: ${response.statusText}`);
        throw error;
      }

      const content = await response.text();

      // 缓存文件内容（异步）
      const version = generateFileVersion(fileUrl, content);
      await fileCache.set(cacheKey, content, version);
      return content;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      logger.error(`获取文件内容失败: ${fileUrl}`, error);
      throw new Error(`获取文件内容失败: ${errorMessage}`);
    }
}

// 生成内容版本
function generateContentVersion(path: string, branch: string, contents: GitHubContent[]): string {
  const contentHash = contents.map(item => {
    const identifier = item.sha !== '' ? item.sha : (item.size !== undefined ? item.size.toString() : 'unknown');
    return `${item.name}-${identifier}`;
  }).join('|');
  return `${branch}:${path}-${Date.now().toString()}-${contentHash.slice(0, 8)}`;
}

// 生成文件版本
function generateFileVersion(fileUrl: string, content: string): string {
  const contentLength = content.length;
  const urlHash = fileUrl.split('/').slice(-2).join('-'); // 取文件名和父目录
  return `${urlHash}-${contentLength.toString()}-${Date.now().toString()}`;
}

// 获取批处理器（用于调试）
export function getBatcher(): RequestBatcher {
  return batcher;
}

// 清除批处理器缓存
export function clearBatcherCache(): void {
  batcher.clearCache();
}

// 为了向后兼容，导出一个包含所有函数的对象
export const GitHubContentService = {
  getContents,
  getFileContent,
  getBatcher,
  clearBatcherCache
} as const;
