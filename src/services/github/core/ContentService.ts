import axios from 'axios';
import type { GitHubContent } from '@/types';
import { logger } from '@/utils';
import { CacheManager } from '../cache/CacheManager';
import { RequestBatcher } from '../RequestBatcher';
import { getAuthHeaders } from './Auth';
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

/**
 * 字符串哈希函数
 * 
 * 使用 cyrb53 算法生成字符串的哈希值，用于缓存键生成和版本标识。
 * 
 * @param str - 要哈希的字符串
 * @param seed - 哈希种子，默认为0
 * @returns 16进制格式的哈希字符串
 */
function simpleHash(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  
  const hash = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return hash.toString(16).padStart(14, '0');
}

/**
 * 构建内容缓存键
 * 
 * 使用哈希函数生成紧凑的缓存键，优化内存使用和查找性能。
 * 
 * @param path - 文件/目录路径
 * @param branch - Git 分支名
 * @returns 优化的缓存键（格式: c_<hash>）
 * 
 * @example
 * buildContentsCacheKey('src/components', 'main')
 * // => 'c_a3f2d9e8b1c4f7'
 */
function buildContentsCacheKey(path: string, branch: string): string {
  const normalizedPath = path === '' ? ROOT_PATH_KEY : path;
  const keyString = `${branch}:${normalizedPath}`;
  const hash = simpleHash(keyString);
  return `c_${hash}`;
}

// GitHub内容服务，使用模块导出而非类
const batcher = new RequestBatcher();

// 缓存系统状态管理
let cacheInitialized = false;
let cacheAvailable = false;
let initializationAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;

// 降级缓存：当主缓存系统不可用时使用的内存缓存
const fallbackCache = new Map<string, { data: unknown; timestamp: number }>();
const FALLBACK_CACHE_TTL = 5 * 60 * 1000; // 5分钟
const FALLBACK_CACHE_MAX_SIZE = 50; // 最多缓存50个条目

/**
 * 确保缓存初始化（带降级机制）
 * 
 * 初始化策略：
 * 1. 尝试初始化主缓存系统（IndexedDB/LocalStorage）
 * 2. 如果失败，使用内存缓存作为降级方案
 * 3. 限制重试次数，避免无限重试
 * 
 * @returns Promise<void>
 */
async function ensureCacheInitialized(): Promise<void> {
  if (cacheInitialized) {
    return;
  }

  if (initializationAttempts >= MAX_INIT_ATTEMPTS) {
    logger.warn('ContentService: 已达到最大初始化尝试次数，使用降级缓存');
    cacheInitialized = true;
    cacheAvailable = false;
    return;
  }

  initializationAttempts++;

  try {
    await CacheManager.initialize();
    cacheInitialized = true;
    cacheAvailable = true;
    logger.info('ContentService: 缓存系统初始化完成');
  } catch (error) {
    logger.warn(
      `ContentService: 缓存系统初始化失败（尝试 ${initializationAttempts.toString()}/${MAX_INIT_ATTEMPTS.toString()}），使用内存降级缓存`,
      error
    );
    
    // 标记为已初始化，但使用降级模式
    cacheInitialized = true;
    cacheAvailable = false;
    
    // 在开发模式下提供更详细的错误信息
    if (import.meta.env.DEV) {
      logger.error('缓存初始化失败详情:', error);
      logger.info('建议：检查浏览器的 IndexedDB 和 LocalStorage 权限设置');
    }
  }
}

/**
 * 从降级缓存获取数据
 * 
 * @param key - 缓存键
 * @returns 缓存的数据或 null
 */
function getFallbackCache(key: string): unknown {
  const cached = fallbackCache.get(key);
  
  if (cached === undefined) {
    return null;
  }
  
  // 检查是否过期
  const now = Date.now();
  if (now - cached.timestamp > FALLBACK_CACHE_TTL) {
    fallbackCache.delete(key);
    return null;
  }
  
  return cached.data;
}

/**
 * 设置降级缓存数据
 * 
 * @param key - 缓存键
 * @param data - 要缓存的数据
 */
function setFallbackCache(key: string, data: unknown): void {
  // 限制缓存大小，避免内存溢出
  if (fallbackCache.size >= FALLBACK_CACHE_MAX_SIZE) {
    // 删除最旧的条目
    const firstKey = fallbackCache.keys().next().value;
    if (firstKey !== undefined) {
      fallbackCache.delete(firstKey);
    }
  }
  
  fallbackCache.set(key, {
    data,
    timestamp: Date.now()
  });
}

/**
 * 获取GitHub仓库目录内容
 * 
 * 从GitHub API获取指定路径的目录内容，支持缓存和降级策略。
 * 优先使用主缓存系统（IndexedDB/LocalStorage），失败时使用内存降级缓存。
 * 
 * @param path - 目录路径，空字符串表示根目录
 * @param signal - 可选的中断信号，用于取消请求
 * @returns Promise，解析为GitHub内容数组
 * @throws 当API请求失败或响应格式错误时抛出错误
 */
export async function getContents(path: string, signal?: AbortSignal): Promise<GitHubContent[]> {
  await ensureCacheInitialized();

    const branch = getCurrentBranch();
    const cacheKey = buildContentsCacheKey(path, branch);
    
    // 尝试从主缓存或降级缓存获取
    let cachedContents: unknown = null;
    
    if (cacheAvailable) {
      // 使用主缓存系统
      const contentCache = CacheManager.getContentCache();
      cachedContents = await contentCache.get(cacheKey);
    } else {
      // 使用降级缓存
      cachedContents = getFallbackCache(cacheKey) as GitHubContent[] | null;
    }

    if (cachedContents !== null && cachedContents !== undefined) {
      logger.debug(`已从${cacheAvailable ? '主' : '降级'}缓存中获取内容: ${path}`);
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
            headers: getAuthHeaders(),
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
          headers: getAuthHeaders() as Record<string, string>
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

      // 使用缓存系统（主缓存或降级缓存）
      if (cacheAvailable) {
        const version = generateContentVersion(path, branch, contents);
        const contentCache = CacheManager.getContentCache();
        await contentCache.set(cacheKey, contents, version);
      } else {
        // 使用降级缓存
        setFallbackCache(cacheKey, contents);
      }

      return contents;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      logger.error(`获取内容失败: ${path}`, error);
      throw new Error(`获取内容失败: ${errorMessage}`);
    }
}

/**
 * 获取文件内容
 * 
 * 从GitHub获取指定URL的文件内容，支持代理和缓存。
 * 根据环境自动选择使用服务端API或直接请求GitHub。
 * 
 * @param fileUrl - 文件的URL地址
 * @returns Promise，解析为文件的文本内容
 * @throws 当请求失败或响应状态码不是200时抛出错误
 */
export async function getFileContent(fileUrl: string): Promise<string> {
  await ensureCacheInitialized();

    // 添加缓存键
    const cacheKey = `file:${fileUrl}`;
    
    // 尝试从主缓存或降级缓存获取
    let cachedContent: string | null | undefined;
    
    if (cacheAvailable) {
      // 使用主缓存系统
      const fileCache = CacheManager.getFileCache();
      cachedContent = await fileCache.get(cacheKey);
    } else {
      // 使用降级缓存
      cachedContent = getFallbackCache(cacheKey) as string | null;
    }

    if (cachedContent !== undefined && cachedContent !== null) {
      logger.debug(`从${cacheAvailable ? '主' : '降级'}缓存获取文件内容: ${fileUrl}`);
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
          headers: USE_TOKEN_MODE ? getAuthHeaders() : {}
        });
      })();

      if (!response.ok) {
        const error = new Error(`HTTP ${response.status.toString()}: ${response.statusText}`);
        throw error;
      }

      const content = await response.text();

      // 使用缓存系统（主缓存或降级缓存）
      if (cacheAvailable) {
        const version = generateFileVersion(fileUrl, content);
        const fileCache = CacheManager.getFileCache();
        await fileCache.set(cacheKey, content, version);
      } else {
        // 使用降级缓存
        setFallbackCache(cacheKey, content);
      }
      
      return content;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      logger.error(`获取文件内容失败: ${fileUrl}`, error);
      throw new Error(`获取文件内容失败: ${errorMessage}`);
    }
}

/**
 * 生成内容版本标识
 * 
 * 使用哈希算法生成紧凑的版本标识，用于缓存验证。
 * 
 * @param path - 文件/目录路径
 * @param branch - Git 分支名
 * @param contents - 内容列表
 * @returns 版本标识字符串
 */
function generateContentVersion(path: string, branch: string, contents: GitHubContent[]): string {
  const contentSignature = contents.map(item => {
    const identifier = item.sha !== '' ? item.sha : (item.size !== undefined ? item.size.toString() : 'unknown');
    return `${item.name}-${identifier}`;
  }).join('|');
  
  // 使用哈希生成紧凑的版本标识
  const versionString = `${branch}:${path}:${contentSignature}:${Date.now().toString()}`;
  const hash = simpleHash(versionString);
  return `v_${hash}`;
}

/**
 * 生成文件版本标识
 * 
 * @param fileUrl - 文件URL
 * @param content - 文件内容
 * @returns 版本标识字符串
 */
function generateFileVersion(fileUrl: string, content: string): string {
  const contentLength = content.length;
  const timestamp = Date.now();
  
  // 使用哈希生成紧凑的版本标识
  const versionString = `${fileUrl}:${contentLength.toString()}:${timestamp.toString()}`;
  const hash = simpleHash(versionString);
  return `fv_${hash}`;
}

/**
 * 获取请求批处理器实例
 * 
 * 主要用于调试和测试目的。
 * 
 * @returns 请求批处理器实例
 */
export function getBatcher(): RequestBatcher {
  return batcher;
}

/**
 * 清除批处理器缓存
 * 
 * 清除所有缓存的请求结果，强制下次请求重新获取数据。
 * 
 * @returns void
 */
export function clearBatcherCache(): void {
  batcher.clearCache();
}

/**
 * GitHub内容服务对象
 * 
 * 为了向后兼容性，导出包含所有内容相关函数的常量对象。
 * 
 * @deprecated 推荐直接使用独立的导出函数
 */
export const GitHubContentService = {
  getContents,
  getFileContent,
  getBatcher,
  clearBatcherCache
} as const;
