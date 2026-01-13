import { getGithubConfig, getSearchIndexConfig } from '@/config';
import { logger } from '@/utils';
import { decompressSync } from 'fflate';

import { shouldUseServerAPI } from '../../config';
import { getAuthHeaders } from '../Auth';
import {
  safeValidateSearchIndexManifest,
  safeValidateSearchIndexDocument,
  type SearchIndexManifest,
  type SearchIndexDocument,
  type SearchIndexFileDescriptor
} from '../../schemas';
import {
  clearCaches,
  getBranchExistenceCache,
  getCacheKeyForDescriptor,
  getIndexCacheEntry,
  getManifestCache,
  setBranchExistenceCache,
  setIndexCacheEntry,
  setManifestCache
} from './cache';
import { createSearchIndexError, SearchIndexError, SearchIndexErrorCode } from './errors';

interface FetchOptions {
  signal?: AbortSignal | null;
  expectBinary?: boolean;
}

interface SearchIndexAssetParams {
  indexBranch: string;
  path: string;
}

function buildRawContentUrl(branch: string, targetPath: string): string {
  const { repoOwner, repoName } = getGithubConfig();
  const encodedBranch = branch.split('/').map(encodeURIComponent).join('/');
  const normalizedPath = targetPath.replace(/^\/+/u, '');
  const encodedPath = normalizedPath.split('/').map(encodeURIComponent).join('/');
  return `https://raw.githubusercontent.com/${repoOwner}/${repoName}/${encodedBranch}/${encodedPath}`;
}

function hasAuthorizationHeader(headers: HeadersInit): boolean {
  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    return headers.has('Authorization') || headers.has('authorization');
  }

  if (Array.isArray(headers)) {
    return headers.some(([key]) => key.toLowerCase() === 'authorization');
  }

  return Object.keys(headers as Record<string, string>).some(key => key.toLowerCase() === 'authorization');
}

async function processSearchIndexResponse<T>(
  response: Response,
  asset: SearchIndexAssetParams,
  errorCode: SearchIndexErrorCode,
  options: FetchOptions
): Promise<T> {
  if (response.status === 404) {
    throw createSearchIndexError(errorCode, 'Search index asset not found', {
      status: 404,
      path: asset.path,
      branch: asset.indexBranch
    });
  }

  if (!response.ok) {
    throw createSearchIndexError(errorCode, 'Failed to fetch search index asset', {
      status: response.status,
      path: asset.path,
      branch: asset.indexBranch
    });
  }

  if (options.expectBinary === true) {
    const buffer = await response.arrayBuffer();
    return buffer as unknown as T;
  }

  return (await response.json()) as T;
}

async function fetchFromServerApi<T>(
  asset: SearchIndexAssetParams,
  errorCode: SearchIndexErrorCode,
  options: FetchOptions = {}
): Promise<T> {
  const query = new URLSearchParams({
    action: 'getSearchIndexAsset',
    indexBranch: asset.indexBranch,
    path: asset.path
  });
  query.set('responseType', options.expectBinary === true ? 'binary' : 'json');

  const response = await fetch(`/api/github?${query.toString()}`, {
    method: 'GET',
    signal: options.signal ?? null
  });

  return processSearchIndexResponse<T>(response, asset, errorCode, options);
}

async function fetchDirect<T>(
  asset: SearchIndexAssetParams,
  errorCode: SearchIndexErrorCode,
  options: FetchOptions = {}
): Promise<T> {
  const authHeaders = getAuthHeaders();
  if (hasAuthorizationHeader(authHeaders)) {
    return fetchFromServerApi<T>(asset, errorCode, options);
  }

  const response = await fetch(buildRawContentUrl(asset.indexBranch, asset.path), {
    method: 'GET',
    signal: options.signal ?? null
  });

  return processSearchIndexResponse<T>(response, asset, errorCode, options);
}

async function decompressGzip(arrayBuffer: ArrayBuffer): Promise<string> {
  if (typeof DecompressionStream === 'function') {
    try {
      const stream = new Response(arrayBuffer).body;
      if (stream === null) {
        throw new Error('无法创建解压流');
      }
      const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
      const decompressedBuffer = await new Response(decompressedStream).arrayBuffer();
      return decodeUtf8(decompressedBuffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown gzip error';
      logger.warn(`[SearchIndex] 原生 gzip 解压失败，切换到 fflate: ${message}`);
    }
  }

  try {
    const decompressed = decompressSync(new Uint8Array(arrayBuffer));
    return decodeUtf8Bytes(decompressed);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown gzip error';
    throw createSearchIndexError(
      SearchIndexErrorCode.UNSUPPORTED_COMPRESSION,
      message,
      { compression: 'gzip', cause: error }
    );
  }
}

function decodeUtf8(buffer: ArrayBuffer): string {
  return decodeUtf8Bytes(new Uint8Array(buffer));
}

function decodeUtf8Bytes(bytes: Uint8Array): string {
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(bytes);
}

function hasGzipSignature(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer);
  return bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
}

export async function fetchManifest(signal?: AbortSignal): Promise<SearchIndexManifest> {
  const config = getSearchIndexConfig();
  if (!config.enabled) {
    throw createSearchIndexError(SearchIndexErrorCode.DISABLED, 'Search index feature is disabled');
  }

  const now = Date.now();
  const cached = getManifestCache();
  if (cached !== null && now - cached.fetchedAt <= config.refreshIntervalMs) {
    return cached.data;
  }

  const params: SearchIndexAssetParams = {
    indexBranch: config.indexBranch,
    path: config.manifestPath
  };

  try {
    const data = shouldUseServerAPI()
      ? await fetchFromServerApi<unknown>(params, SearchIndexErrorCode.MANIFEST_NOT_FOUND, {
        signal: signal ?? null
      })
      : await fetchDirect<unknown>(params, SearchIndexErrorCode.MANIFEST_NOT_FOUND, {
        signal: signal ?? null
      });

    const validation = safeValidateSearchIndexManifest(data);
    if (!validation.success) {
      throw createSearchIndexError(SearchIndexErrorCode.MANIFEST_INVALID, validation.error);
    }

    setManifestCache({ data: validation.data, fetchedAt: now });
    return validation.data;
  } catch (error) {
    if (error instanceof SearchIndexError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'Unknown manifest fetch error';
    throw createSearchIndexError(SearchIndexErrorCode.MANIFEST_NOT_FOUND, message, { cause: error });
  }
}

export async function checkIndexBranchExists(signal?: AbortSignal): Promise<boolean> {
  const config = getSearchIndexConfig();
  const cacheKey = config.indexBranch;
  const cached = getBranchExistenceCache(cacheKey);
  if (cached !== undefined) {
    const ttl = Math.max(config.refreshIntervalMs, 5 * 60 * 1000);
    if (Date.now() - cached.fetchedAt <= ttl) {
      return cached.exists;
    }
  }

  const { repoOwner, repoName } = getGithubConfig();
  const refPath = `heads/${config.indexBranch}`;

  try {
    if (shouldUseServerAPI()) {
      const query = new URLSearchParams({
        action: 'getGitRef',
        ref: refPath,
        repoScope: 'search-index'
      });
      const response = await fetch(`/api/github?${query.toString()}`, {
        method: 'GET',
        signal: signal ?? null
      });
      if (response.status === 404) {
        setBranchExistenceCache(cacheKey, { exists: false, fetchedAt: Date.now() });
        return false;
      }
      if (!response.ok) {
        throw new Error(`Failed to check git ref via server API: ${response.status.toString()}`);
      }
      setBranchExistenceCache(cacheKey, { exists: true, fetchedAt: Date.now() });
      return true;
    }

    const url = `https://api.github.com/repos/${repoOwner}/${repoName}/git/ref/${refPath
      .split('/')
      .map(encodeURIComponent)
      .join('/')}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
      signal: signal ?? null
    });

    if (response.status === 404) {
      setBranchExistenceCache(cacheKey, { exists: false, fetchedAt: Date.now() });
      return false;
    }

    if (!response.ok) {
      throw new Error(`Failed to check git ref: ${response.status.toString()}`);
    }

    setBranchExistenceCache(cacheKey, { exists: true, fetchedAt: Date.now() });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown branch detection error';
    logger.warn(`[SearchIndex] 检测索引分支失败: ${message}`);
    throw createSearchIndexError(SearchIndexErrorCode.INDEX_BRANCH_MISSING, message, { cause: error });
  }
}

export async function loadIndexDocument(
  descriptor: SearchIndexFileDescriptor,
  indexBranch: string,
  signal?: AbortSignal
): Promise<SearchIndexDocument> {
  const cacheKey = getCacheKeyForDescriptor(descriptor);
  const config = getSearchIndexConfig();
  const cached = getIndexCacheEntry(cacheKey);
  if (cached !== undefined && Date.now() - cached.fetchedAt <= config.refreshIntervalMs) {
    return cached.document;
  }

  const expectBinary = descriptor.compression === 'gzip';

  try {
    const asset: SearchIndexAssetParams = { indexBranch, path: descriptor.path };
    const data = shouldUseServerAPI()
      ? await fetchFromServerApi<unknown>(asset, SearchIndexErrorCode.INDEX_FILE_NOT_FOUND, {
        signal: signal ?? null,
        expectBinary
      })
      : await fetchDirect<unknown>(asset, SearchIndexErrorCode.INDEX_FILE_NOT_FOUND, {
        signal: signal ?? null,
        expectBinary
      });

    let rawJson: unknown = data;

    if (expectBinary) {
      const buffer = data as ArrayBuffer;
      let text: string;
      if (hasGzipSignature(buffer)) {
        try {
          text = await decompressGzip(buffer);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown gzip error';
          logger.warn(`[SearchIndex] gzip 解压失败，尝试按纯文本解析: ${message}`);
          text = decodeUtf8(buffer);
        }
      } else {
        logger.warn('[SearchIndex] 索引文件标记为 gzip，但内容未检测到 gzip 头，尝试按纯文本解析。');
        text = decodeUtf8(buffer);
      }
      try {
        rawJson = JSON.parse(text) as unknown;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown JSON parse error';
        throw createSearchIndexError(SearchIndexErrorCode.INDEX_DOCUMENT_INVALID, message, {
          path: descriptor.path
        });
      }
    }

    const validation = safeValidateSearchIndexDocument(rawJson);
    if (!validation.success) {
      throw createSearchIndexError(SearchIndexErrorCode.INDEX_DOCUMENT_INVALID, validation.error, {
        path: descriptor.path
      });
    }

    const now = Date.now();
    setIndexCacheEntry(cacheKey, { document: validation.data, fetchedAt: now });
    return validation.data;
  } catch (error) {
    if (error instanceof SearchIndexError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'Unknown index file fetch error';
    throw createSearchIndexError(SearchIndexErrorCode.INDEX_FILE_NOT_FOUND, message, {
      path: descriptor.path,
      cause: error
    });
  }
}

export function invalidateSearchIndexCache(): void {
  clearCaches();
}

export async function refreshSearchIndexManifest(signal?: AbortSignal): Promise<SearchIndexManifest> {
  clearCaches();
  return fetchManifest(signal);
}

export async function prefetchSearchIndexForBranch(
  branch: string,
  signal?: AbortSignal
): Promise<boolean> {
  const config = getSearchIndexConfig();
  const manifest = await fetchManifest(signal);
  const branchEntry = manifest.branches[branch];

  if (branchEntry === undefined) {
    return false;
  }

  await Promise.all(
    branchEntry.indexFiles.map(descriptor => loadIndexDocument(descriptor, config.indexBranch, signal))
  );

  return true;
}
