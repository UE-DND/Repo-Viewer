import axios from 'axios';
import type {
  GitHubContent,
  InitialContentHydrationPayload,
  InitialContentDirectoryEntry,
  InitialContentFileEntry
} from '@/types';
import { logger } from '@/utils';
import { hashStringSync } from '@/utils/crypto/hashUtils';
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
import { SmartCache } from '@/utils/cache/SmartCache';

/**
 * 构建内容缓存键
 *
 * 使用标准哈希函数生成紧凑且可靠的缓存键。
 * 采用改进的 cyrb53 算法，提供良好的分布性和低冲突率。
 * 添加前缀和版本号，避免与其他缓存键冲突。
 *
 * @param path - 文件/目录路径
 * @param branch - Git 分支名
 * @returns 优化的缓存键（格式: content:v2:<hash>）
 *
 * @example
 * buildContentsCacheKey('src/components', 'main')
 * // => 'content:v2:a3f2d9e8b1c4f7'
 *
 * buildContentsCacheKey('', 'main')
 * // => 'content:v2:d4e5f6a7b8c9d0' (根目录使用 '/' 作为规范化路径)
 */
function buildContentsCacheKey(path: string, branch: string): string {
  // 使用 '/' 作为根目录的规范化路径，避免与实际路径冲突
  const normalizedPath = path === '' ? '/' : path;
  const keyString = `${branch}:${normalizedPath}`;
  const hash = hashStringSync(keyString);
  // 添加前缀和版本号，避免与其他缓存键冲突
  return `content:v2:${hash}`;
}

const batcher = new RequestBatcher();

type DirectoryStoreKey = string;
type FileStoreKey = string;

interface HydratedFileEntry {
  path: string;
  content: string;
  downloadUrl?: string | null;
  sha?: string;
}

const INITIAL_CONTENT_EXCLUDE_FILES = ['.gitkeep', 'Thumbs.db', '.DS_Store'] as const;

const initialDirectoryStore = new Map<DirectoryStoreKey, GitHubContent[]>();
const initialFileStore = new Map<FileStoreKey, HydratedFileEntry>();

let initialHydrationMeta: {
  branch: string;
  repoOwner: string;
  repoName: string;
  version: number;
  generatedAt?: string;
} | null = null;

// 缓存系统状态管理
let cacheInitialized = false;
let cacheAvailable = false;
let initializationAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;

// 降级缓存：当主缓存系统不可用时使用的内存缓存
// 使用 SmartCache（混合 LRU/LFU 策略）
const FALLBACK_CACHE_TTL = 5 * 60 * 1000; // 5分钟
const FALLBACK_CACHE_MAX_SIZE = 50; // 最多缓存50个条目
const fallbackCache = new SmartCache<string, unknown>({
  maxSize: FALLBACK_CACHE_MAX_SIZE,
  ttl: FALLBACK_CACHE_TTL,
  cleanupThreshold: 0.8,
  cleanupRatio: 0.2
});

function normalizeDirectoryPath(path: string): string {
  if (path === '' || path === '/') {
    return '/';
  }
  return path.replace(/^\/+/, '').replace(/\/+/g, '/');
}

function normalizeFilePath(path: string): string {
  if (path === '') {
    return '';
  }
  return path.replace(/^\/+/, '');
}

function makeDirectoryStoreKey(branch: string, path: string): DirectoryStoreKey {
  return `${branch}::dir::${normalizeDirectoryPath(path)}`;
}

function makeFileStoreKey(branch: string, path: string): FileStoreKey {
  return `${branch}::file::${normalizeFilePath(path)}`;
}

function isHydrationActiveForBranch(branch: string): boolean {
  return initialHydrationMeta !== null && initialHydrationMeta.branch === branch;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripSearchAndHash(value: string): string {
  if (value.startsWith('http://') || value.startsWith('https://')) {
    try {
      const parsed = new URL(value);
      parsed.search = '';
      parsed.hash = '';
      return parsed.toString();
    } catch {
      return value.split(/[?#]/)[0] ?? value;
    }
  }
  return value.split(/[?#]/)[0] ?? value;
}

function extractPathFromFileUrl(fileUrl: string): string | null {
  if (initialHydrationMeta === null) {
    return null;
  }

  const sanitized = stripSearchAndHash(fileUrl);
  const { repoOwner, repoName, branch } = initialHydrationMeta;

  if (repoOwner === '' || repoName === '' || branch === '') {
    return null;
  }

  const ownerPattern = escapeRegExp(repoOwner);
  const repoPattern = escapeRegExp(repoName);
  const branchPattern = escapeRegExp(branch);

  const rawPattern = new RegExp(`https?:\/\/raw\.githubusercontent\.com\/${ownerPattern}\/${repoPattern}\/${branchPattern}\/(.+)`, 'i');
  const rawMatch = sanitized.match(rawPattern);
  if (rawMatch?.[1] !== undefined && rawMatch[1] !== '') {
    return normalizeFilePath(decodeURIComponent(rawMatch[1]));
  }

  const relativePattern = new RegExp(`^\/github-raw\/${ownerPattern}\/${repoPattern}\/${branchPattern}\/(.+)`, 'i');
  const relativeMatch = sanitized.match(relativePattern);
  if (relativeMatch?.[1] !== undefined && relativeMatch[1] !== '') {
    return normalizeFilePath(decodeURIComponent(relativeMatch[1]));
  }

  const proxyIndex = sanitized.indexOf('https://raw.githubusercontent.com/');
  if (proxyIndex > 0) {
    const nested = sanitized.slice(proxyIndex);
    return extractPathFromFileUrl(nested);
  }

  return null;
}

function cloneGitHubContents(contents: GitHubContent[]): GitHubContent[] {
  return contents.map(item => {
    if (item._links !== undefined) {
      return {
        ...item,
        _links: { ...item._links }
      };
    }
    return { ...item };
  });
}

function decodeInitialFileContent(entry: InitialContentFileEntry): string {
  if (entry.encoding === 'base64') {
    try {
      if (typeof window !== 'undefined' && typeof window.atob === 'function') {
        const binaryString = window.atob(entry.content);
        const bytes = Uint8Array.from(binaryString, char => char.charCodeAt(0));
        const decoder = new TextDecoder();
        return decoder.decode(bytes);
      }
    } catch (error) {
      logger.warn('ContentService: Base64 解码失败，已回退为原始字符串', error);
    }
  }

  return entry.content;
}

function registerHydrationDirectory(branch: string, entry: InitialContentDirectoryEntry): void {
  const normalizedPath = entry.path;
  const key = makeDirectoryStoreKey(branch, normalizedPath);
  const cloned = cloneGitHubContents(entry.contents);
  const sanitized = filterAndNormalizeGitHubContents(cloned, {
    excludeHidden: true,
    excludeFiles: [...INITIAL_CONTENT_EXCLUDE_FILES]
  });
  initialDirectoryStore.set(key, sanitized);
}

function registerHydrationFile(
  branch: string,
  owner: string,
  repo: string,
  entry: InitialContentFileEntry
): void {
  const normalizedPath = normalizeFilePath(entry.path);
  if (normalizedPath === '') {
    return;
  }

  const key = makeFileStoreKey(branch, normalizedPath);
  const content = decodeInitialFileContent(entry);

  const hydratedEntry: HydratedFileEntry = {
    path: normalizedPath,
    content,
    downloadUrl: entry.downloadUrl ?? null
  };

  if (typeof entry.sha === 'string') {
    hydratedEntry.sha = entry.sha;
  }

  initialFileStore.set(key, hydratedEntry);

  // 记录 canonical download url，方便后续匹配（用于调试）
  if (initialHydrationMeta !== null) {
    initialHydrationMeta.repoOwner = owner !== '' ? owner : initialHydrationMeta.repoOwner;
    initialHydrationMeta.repoName = repo !== '' ? repo : initialHydrationMeta.repoName;
  }
}

function cleanupInitialHydrationStateIfEmpty(): void {
  if (
    initialHydrationMeta !== null &&
    initialDirectoryStore.size === 0 &&
    initialFileStore.size === 0
  ) {
    logger.debug('ContentService: 首屏注水数据已全部消费');
    initialHydrationMeta = null;
  }
}

async function storeDirectoryContents(
  cacheKey: string,
  path: string,
  branch: string,
  contents: GitHubContent[]
): Promise<void> {
  if (cacheAvailable) {
    const version = generateContentVersion(path, branch, contents);
    const contentCache = CacheManager.getContentCache();
    await contentCache.set(cacheKey, contents, version);
  } else {
    setFallbackCache(cacheKey, contents);
  }
}

async function storeFileContent(
  cacheKey: string,
  fileUrl: string,
  content: string
): Promise<void> {
  if (cacheAvailable) {
    const version = generateFileVersion(fileUrl, content);
    const fileCache = CacheManager.getFileCache();
    await fileCache.set(cacheKey, content, version);
  } else {
    setFallbackCache(cacheKey, content);
  }
}

async function consumeHydratedDirectory(
  path: string,
  branch: string,
  cacheKey: string
): Promise<GitHubContent[] | null> {
  if (!isHydrationActiveForBranch(branch)) {
    return null;
  }

  const key = makeDirectoryStoreKey(branch, path);
  const contents = initialDirectoryStore.get(key);
  if (contents === undefined) {
    return null;
  }

  initialDirectoryStore.delete(key);
  await storeDirectoryContents(cacheKey, path, branch, contents);
  cleanupInitialHydrationStateIfEmpty();
  logger.debug(`ContentService: 使用首屏注水目录数据 -> ${path === '' ? '/' : path}`);
  return contents;
}

async function consumeHydratedFile(
  fileUrl: string,
  branch: string,
  cacheKey: string
): Promise<string | null> {
  if (!isHydrationActiveForBranch(branch)) {
    return null;
  }

  const path = extractPathFromFileUrl(fileUrl);
  if (path === null || path === '') {
    return null;
  }

  const key = makeFileStoreKey(branch, path);
  const entry = initialFileStore.get(key);
  if (entry === undefined) {
    return null;
  }

  initialFileStore.delete(key);
  await storeFileContent(cacheKey, fileUrl, entry.content);
  cleanupInitialHydrationStateIfEmpty();
  logger.debug(`ContentService: 使用首屏注水文件数据 -> ${path}`);
  return entry.content;
}

/**
 * 确保缓存初始化
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
  return fallbackCache.get(key);
}

/**
 * 设置降级缓存数据
 *
 * @param key - 缓存键
 * @param data - 要缓存的数据
 */
function setFallbackCache(key: string, data: unknown): void {
  fallbackCache.set(key, data);
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

    const hydratedContents = await consumeHydratedDirectory(path, branch, cacheKey);
    if (hydratedContents !== null) {
      return hydratedContents;
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

      await storeDirectoryContents(cacheKey, path, branch, contents);

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

    const branch = getCurrentBranch();
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

    const hydratedContent = await consumeHydratedFile(fileUrl, branch, cacheKey);
    if (hydratedContent !== null) {
      return hydratedContent;
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

      await storeFileContent(cacheKey, fileUrl, content);

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
 * 使用标准哈希算法生成紧凑且可靠的版本标识，用于缓存验证。
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

  // 使用标准哈希生成紧凑的版本标识
  const versionString = `${branch}:${path}:${contentSignature}:${Date.now().toString()}`;
  const hash = hashStringSync(versionString);
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

  // 使用标准哈希生成紧凑的版本标识
  const versionString = `${fileUrl}:${contentLength.toString()}:${timestamp.toString()}`;
  const hash = hashStringSync(versionString);
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
 * 注册首屏注水数据
 *
 * @param payload - 构建期注入的首屏内容载荷
 */
export function hydrateInitialContent(payload: InitialContentHydrationPayload | null | undefined): void {
  if (payload === undefined || payload === null) {
    return;
  }

  try {
    initialDirectoryStore.clear();
    initialFileStore.clear();

    const branch = payload.branch;
    const repoOwner = payload.repo.owner;
    const repoName = payload.repo.name;

    initialHydrationMeta = {
      branch,
      repoOwner,
      repoName,
      version: payload.version,
      generatedAt: payload.generatedAt
    };

    payload.directories.forEach(directory => {
      registerHydrationDirectory(branch, directory);
    });

    payload.files.forEach(file => {
      registerHydrationFile(branch, repoOwner, repoName, file);
    });

    if (initialDirectoryStore.size === 0 && initialFileStore.size === 0) {
      initialHydrationMeta = null;
      return;
    }

    logger.debug('ContentService: 首屏注水数据已载入', {
      branch,
      directories: initialDirectoryStore.size,
      files: initialFileStore.size
    });
  } catch (error) {
    logger.warn('ContentService: 首屏注水数据处理失败', error);
    initialDirectoryStore.clear();
    initialFileStore.clear();
    initialHydrationMeta = null;
  }
}

