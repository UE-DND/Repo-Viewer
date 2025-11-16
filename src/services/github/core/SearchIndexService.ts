import { getGithubConfig, getSearchIndexConfig } from '@/config';
import { logger } from '@/utils';
import { shouldUseServerAPI } from '../config/ProxyForceManager';
import { getAuthHeaders } from './Auth';
import {
  safeValidateSearchIndexManifest,
  safeValidateSearchIndexDocument,
  type SearchIndexManifest,
  type SearchIndexDocument,
  type SearchIndexFileDescriptor,
  type SearchIndexFileEntry
} from '../schemas';

interface ManifestCacheEntry {
  data: SearchIndexManifest;
  fetchedAt: number;
}

interface IndexCacheEntry {
  document: SearchIndexDocument;
  fetchedAt: number;
}

interface BranchCacheEntry {
  exists: boolean;
  fetchedAt: number;
}

let manifestCache: ManifestCacheEntry | null = null;
const indexCache = new Map<string, IndexCacheEntry>();
const branchExistenceCache = new Map<string, BranchCacheEntry>();

export const enum SearchIndexErrorCode {
  DISABLED = 'SEARCH_INDEX_DISABLED',
  MANIFEST_NOT_FOUND = 'SEARCH_INDEX_MANIFEST_NOT_FOUND',
  MANIFEST_INVALID = 'SEARCH_INDEX_MANIFEST_INVALID',
  INDEX_BRANCH_MISSING = 'SEARCH_INDEX_BRANCH_MISSING',
  INDEX_FILE_NOT_FOUND = 'SEARCH_INDEX_FILE_NOT_FOUND',
  INDEX_DOCUMENT_INVALID = 'SEARCH_INDEX_DOCUMENT_INVALID',
  INDEX_BRANCH_NOT_INDEXED = 'SEARCH_INDEX_BRANCH_NOT_INDEXED',
  UNSUPPORTED_COMPRESSION = 'SEARCH_INDEX_UNSUPPORTED_COMPRESSION'
}

export interface SearchIndexErrorDetails {
  status?: number;
  branch?: string;
  path?: string;
  compression?: string;
  cause?: unknown;
}

export class SearchIndexError extends Error {
  readonly code: SearchIndexErrorCode;
  readonly details?: SearchIndexErrorDetails;

  constructor(code: SearchIndexErrorCode, message: string, details?: SearchIndexErrorDetails) {
    super(message);
    this.code = code;
    if (details !== undefined) {
      this.details = details;
    }
    this.name = 'SearchIndexError';
  }
}

interface FetchOptions {
  signal?: AbortSignal | null;
  expectBinary?: boolean;
}

function buildRawContentUrl(branch: string, targetPath: string): string {
  const { repoOwner, repoName } = getGithubConfig();
  const encodedBranch = branch.split('/').map(encodeURIComponent).join('/');
  const normalizedPath = targetPath.replace(/^\/+/, '');
  const encodedPath = normalizedPath.split('/').map(encodeURIComponent).join('/');
  return `https://raw.githubusercontent.com/${repoOwner}/${repoName}/${encodedBranch}/${encodedPath}`;
}

function createSearchIndexError(
  code: SearchIndexErrorCode,
  message: string,
  details?: SearchIndexErrorDetails
): SearchIndexError {
  return new SearchIndexError(code, message, details);
}

interface SearchIndexAssetParams {
  indexBranch: string;
  path: string;
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

  return response.json() as Promise<T>;
}

function hasAuthorizationHeader(headers: HeadersInit): boolean {
  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    return headers.has('Authorization') || headers.has('authorization');
  }

  if (Array.isArray(headers)) {
    return headers.some(([key]) => key.toLowerCase() === 'authorization');
  }

  return Object.keys(headers as Record<string, string>).some((key) => key.toLowerCase() === 'authorization');
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

  return response.json() as Promise<T>;
}

async function fetchManifest(signal?: AbortSignal): Promise<SearchIndexManifest> {
  const config = getSearchIndexConfig();
  if (!config.enabled) {
    throw createSearchIndexError(SearchIndexErrorCode.DISABLED, 'Search index feature is disabled');
  }

  const now = Date.now();
  if (manifestCache !== null && now - manifestCache.fetchedAt <= config.refreshIntervalMs) {
    return manifestCache.data;
  }

  const params = {
    indexBranch: config.indexBranch,
    path: config.manifestPath
  };

  try {
    const data = shouldUseServerAPI()
      ? await fetchFromServerApi<unknown>(params, SearchIndexErrorCode.MANIFEST_NOT_FOUND, { signal: signal ?? null })
      : await fetchDirect<unknown>(params, SearchIndexErrorCode.MANIFEST_NOT_FOUND, { signal: signal ?? null });

    const validation = safeValidateSearchIndexManifest(data);
    if (!validation.success) {
      throw createSearchIndexError(SearchIndexErrorCode.MANIFEST_INVALID, validation.error);
    }

    manifestCache = {
      data: validation.data,
      fetchedAt: now
    };
    return validation.data;
  } catch (error) {
    if (error instanceof SearchIndexError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'Unknown manifest fetch error';
    throw createSearchIndexError(SearchIndexErrorCode.MANIFEST_NOT_FOUND, message, { cause: error });
  }
}

async function checkIndexBranchExists(signal?: AbortSignal): Promise<boolean> {
  const config = getSearchIndexConfig();
  const cacheKey = config.indexBranch;
  const cached = branchExistenceCache.get(cacheKey);
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
      const query = new URLSearchParams({ action: 'getGitRef', ref: refPath, repoScope: 'search-index' });
      const response = await fetch(`/api/github?${query.toString()}`, { method: 'GET', signal: signal ?? null });
      if (response.status === 404) {
        branchExistenceCache.set(cacheKey, { exists: false, fetchedAt: Date.now() });
        return false;
      }
      if (!response.ok) {
        throw new Error(`Failed to check git ref via server API: ${response.status.toString()}`);
      }
      branchExistenceCache.set(cacheKey, { exists: true, fetchedAt: Date.now() });
      return true;
    }

    const url = `https://api.github.com/repos/${repoOwner}/${repoName}/git/ref/${refPath.split('/').map(encodeURIComponent).join('/')}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
      signal: signal ?? null
    });

    if (response.status === 404) {
      branchExistenceCache.set(cacheKey, { exists: false, fetchedAt: Date.now() });
      return false;
    }

    if (!response.ok) {
      throw new Error(`Failed to check git ref: ${response.status.toString()}`);
    }

    branchExistenceCache.set(cacheKey, { exists: true, fetchedAt: Date.now() });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown branch detection error';
    logger.warn(`[SearchIndex] 检测索引分支失败: ${message}`);
    throw createSearchIndexError(SearchIndexErrorCode.INDEX_BRANCH_MISSING, message, { cause: error });
  }
}

function getCacheKeyForDescriptor(descriptor: SearchIndexFileDescriptor): string {
  return `${descriptor.path}@${descriptor.sha256 ?? ''}`;
}

async function decompressGzip(arrayBuffer: ArrayBuffer): Promise<string> {
  if (typeof DecompressionStream === 'function') {
    const stream = new Response(arrayBuffer).body;
    if (stream === null) {
      throw new Error('无法创建解压流');
    }
    const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
    const decompressedBuffer = await new Response(decompressedStream).arrayBuffer();
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(decompressedBuffer);
  }

  throw createSearchIndexError(
    SearchIndexErrorCode.UNSUPPORTED_COMPRESSION,
    '当前环境不支持 gzip 解压，请在生成索引时关闭压缩或添加 polyfill',
    { compression: 'gzip' }
  );
}

async function loadIndexDocument(
  descriptor: SearchIndexFileDescriptor,
  indexBranch: string,
  signal?: AbortSignal
): Promise<SearchIndexDocument> {
  const cacheKey = getCacheKeyForDescriptor(descriptor);
  const config = getSearchIndexConfig();
  const cached = indexCache.get(cacheKey);
  if (cached !== undefined && Date.now() - cached.fetchedAt <= config.refreshIntervalMs) {
    return cached.document;
  }

  const expectBinary = descriptor.compression === 'gzip';

  try {
    const asset: SearchIndexAssetParams = { indexBranch, path: descriptor.path };
    const data = shouldUseServerAPI()
      ? await fetchFromServerApi<unknown>(
        asset,
        SearchIndexErrorCode.INDEX_FILE_NOT_FOUND,
        { signal: signal ?? null, expectBinary }
      )
      : await fetchDirect<unknown>(
        asset,
        SearchIndexErrorCode.INDEX_FILE_NOT_FOUND,
        { signal: signal ?? null, expectBinary }
      );

    let rawJson: unknown = data;

    if (expectBinary) {
      const buffer = data as ArrayBuffer;
      const text = await decompressGzip(buffer);
      rawJson = JSON.parse(text) as unknown;
    }

    const validation = safeValidateSearchIndexDocument(rawJson);
    if (!validation.success) {
      throw createSearchIndexError(SearchIndexErrorCode.INDEX_DOCUMENT_INVALID, validation.error, {
        path: descriptor.path
      });
    }

    const now = Date.now();
    indexCache.set(cacheKey, { document: validation.data, fetchedAt: now });
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

export interface SearchIndexSearchOptions {
  keyword: string;
  branches?: string[];
  pathPrefix?: string;
  extensions?: string[];
  limit?: number;
  signal?: AbortSignal;
}

export interface SearchIndexResultItem {
  branch: string;
  path: string;
  name: string;
  extension?: string;
  size?: number;
  binary?: boolean;
  htmlUrl?: string;
  downloadUrl?: string;
  commit: string;
  shortCommit: string;
  score: number;
  snippet?: string;
}

function normalizeExtensions(extensions?: string[]): Set<string> | null {
  if (extensions === undefined) {
    return null;
  }
  const normalized = extensions
    .map(ext => ext.trim().toLowerCase())
    .filter(ext => ext.length > 0)
    .map(ext => (ext.startsWith('.') ? ext.slice(1) : ext));
  return normalized.length > 0 ? new Set(normalized) : null;
}

function scoreMatch(entry: SearchIndexFileEntry, keyword: string): { matched: boolean; score: number; snippet?: string } {
  const normalizedKeyword = keyword.toLowerCase();
  let score = 0;
  let snippet: string | undefined;

  const pathLower = entry.path.toLowerCase();
  const nameLower = entry.name.toLowerCase();

  if (nameLower.includes(normalizedKeyword)) {
    score += 5;
  }

  if (pathLower.includes(normalizedKeyword)) {
    score += 3;
  }

  if (Array.isArray(entry.tokens) && entry.tokens.some(token => token.toLowerCase() === normalizedKeyword)) {
    score += 2;
  }

  if (Array.isArray(entry.fragments)) {
    const matchedFragment = entry.fragments.find(fragment => fragment.snippet.toLowerCase().includes(normalizedKeyword));
    if (matchedFragment !== undefined) {
      score += 1;
      snippet = matchedFragment.snippet;
    }
  }

  if (typeof entry.scoreBoost === 'number') {
    score += entry.scoreBoost;
  }

  const matched = score > 0;
  const result: { matched: boolean; score: number; snippet?: string } = { matched, score };
  if (snippet !== undefined) {
    result.snippet = snippet;
  }
  return result;
}

export async function getSearchIndexManifest(signal?: AbortSignal): Promise<SearchIndexManifest> {
  const manifest = await fetchManifest(signal);
  return manifest;
}

export function isSearchIndexEnabled(): boolean {
  return getSearchIndexConfig().enabled;
}

export async function ensureSearchIndexReady(signal?: AbortSignal): Promise<void> {
  const config = getSearchIndexConfig();
  if (!config.enabled) {
    throw createSearchIndexError(SearchIndexErrorCode.DISABLED, 'Search index feature is disabled');
  }

  const branchExists = await checkIndexBranchExists(signal);
  if (!branchExists) {
    throw createSearchIndexError(SearchIndexErrorCode.INDEX_BRANCH_MISSING, 'Search index branch does not exist', {
      branch: config.indexBranch
    });
  }

  await fetchManifest(signal);
}

export async function getIndexedBranches(signal?: AbortSignal): Promise<string[]> {
  const manifest = await fetchManifest(signal);
  return Object.keys(manifest.branches);
}

export async function prefetchSearchIndexForBranch(branch: string, signal?: AbortSignal): Promise<boolean> {
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

export async function searchIndex(options: SearchIndexSearchOptions): Promise<SearchIndexResultItem[]> {
  const config = getSearchIndexConfig();
  if (!config.enabled) {
    throw createSearchIndexError(SearchIndexErrorCode.DISABLED, 'Search index feature is disabled');
  }

  const keyword = options.keyword.trim();
  if (keyword.length === 0) {
    return [];
  }

  const manifest = await fetchManifest(options.signal);
  const manifestDefaultBranch = manifest.repository.defaultBranch.trim().length > 0
    ? manifest.repository.defaultBranch
    : config.defaultBranch;
  const requestedBranches = options.branches !== undefined && options.branches.length > 0
    ? options.branches
    : [manifestDefaultBranch];

  const normalizedBranches = requestedBranches
    .map(branch => branch.trim())
    .filter(branch => branch.length > 0)
    .filter(branch => branch !== config.indexBranch);

  let candidateBranches = Array.from(new Set(normalizedBranches));
  if (candidateBranches.length === 0) {
    candidateBranches = Object.keys(manifest.branches);
  }

  const indexedBranches = candidateBranches.filter(branch => manifest.branches[branch] !== undefined);
  if (indexedBranches.length === 0) {
    throw createSearchIndexError(SearchIndexErrorCode.INDEX_BRANCH_NOT_INDEXED, 'No indexed branches found for search request', {
      branch: candidateBranches.join(', ')
    });
  }

  const extensionFilter = normalizeExtensions(options.extensions);
  const pathPrefix = options.pathPrefix?.trim().toLowerCase() ?? '';
  const limit = options.limit ?? 100;

  const results: SearchIndexResultItem[] = [];

  for (const branch of indexedBranches) {
    const branchInfo = manifest.branches[branch];
    if (branchInfo === undefined) {
      continue;
    }

    const indexFiles = branchInfo.indexFiles;

    for (const indexDescriptor of indexFiles) {
      const document = await loadIndexDocument(indexDescriptor, config.indexBranch, options.signal);

      for (const entry of document.files) {
        if (entry.type !== 'file') {
          continue;
        }

        if (pathPrefix.length > 0 && !entry.path.toLowerCase().startsWith(pathPrefix)) {
          continue;
        }

        if (extensionFilter !== null) {
          const extension = entry.extension?.toLowerCase() ?? '';
          if (!extensionFilter.has(extension)) {
            continue;
          }
        }

        const { matched, score, snippet } = scoreMatch(entry, keyword);
        if (!matched) {
          continue;
        }

        const resultItem: SearchIndexResultItem = {
          branch,
          path: entry.path,
          name: entry.name,
          commit: document.commit,
          shortCommit: document.shortCommit,
          score
        };

        if (entry.extension !== undefined) {
          resultItem.extension = entry.extension;
        }

        if (entry.size !== undefined) {
          resultItem.size = entry.size;
        }

        if (entry.binary !== undefined) {
          resultItem.binary = entry.binary;
        }

        if (entry.htmlUrl !== undefined) {
          resultItem.htmlUrl = entry.htmlUrl;
        }

        if (entry.downloadUrl !== undefined) {
          resultItem.downloadUrl = entry.downloadUrl;
        }

        if (snippet !== undefined) {
          resultItem.snippet = snippet;
        }

        results.push(resultItem);

        if (results.length >= limit) {
          break;
        }
      }

      if (results.length >= limit) {
        break;
      }
    }

    if (results.length >= limit) {
      break;
    }
  }

  results.sort((a, b) => {
    const scoreDiff = b.score - a.score;
    if (scoreDiff !== 0) {
      return scoreDiff;
    }
    return a.path.localeCompare(b.path);
  });
  return results.slice(0, limit);
}

export function invalidateSearchIndexCache(): void {
  manifestCache = null;
  indexCache.clear();
  branchExistenceCache.clear();
}

export async function refreshSearchIndex(signal?: AbortSignal): Promise<SearchIndexManifest> {
  invalidateSearchIndexCache();
  return fetchManifest(signal);
}
