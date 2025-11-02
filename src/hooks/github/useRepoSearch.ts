import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GitHub } from '@/services/github';
import { getSearchIndexConfig } from '@/config';
import { logger } from '@/utils';
import type { GitHubContent } from '@/types';
import {
  SearchIndexError,
  SearchIndexErrorCode,
  type SearchIndexResultItem
} from '@/services/github/core/SearchIndexService';

export type RepoSearchMode = 'search-index' | 'github-api';

export type RepoSearchFallbackReason =
  | 'index-disabled'
  | 'index-not-ready'
  | 'index-error'
  | 'branch-not-indexed';

export interface RepoSearchFilters {
  keyword: string;
  branches: string[];
  pathPrefix: string;
  extensions: string[];
}

export interface RepoSearchIndexItem extends SearchIndexResultItem {
  source: 'search-index';
}

export interface RepoSearchApiItem extends GitHubContent {
  source: 'github-api';
  branch: string;
}

export type RepoSearchItem = RepoSearchIndexItem | RepoSearchApiItem;

export interface RepoSearchExecutionResult {
  mode: RepoSearchMode;
  items: RepoSearchItem[];
  took: number;
  filters: RepoSearchFilters;
  completedAt: number;
}

export interface RepoSearchError {
  source: 'index' | 'search';
  code?: string;
  message: string;
  details?: unknown;
  raw?: unknown;
}

export interface RepoSearchIndexStatus {
  enabled: boolean;
  ready: boolean;
  loading: boolean;
  error: RepoSearchError | null;
  indexedBranches: string[];
  lastUpdatedAt?: number;
}

export interface RepoSearchExecuteOptions extends Partial<RepoSearchFilters> {
  mode?: RepoSearchMode;
}

export interface RepoSearchState {
  keyword: string;
  setKeyword: (value: string) => void;
  branchFilter: string[];
  setBranchFilter: (branches: string[] | string) => void;
  extensionFilter: string[];
  setExtensionFilter: (extensions: string[] | string) => void;
  pathPrefix: string;
  setPathPrefix: (prefix: string) => void;
  availableBranches: string[];
  availableModes: RepoSearchMode[];
  preferredMode: RepoSearchMode;
  setPreferredMode: (mode: RepoSearchMode) => void;
  mode: RepoSearchMode;
  fallbackReason: RepoSearchFallbackReason | null;
  indexStatus: RepoSearchIndexStatus;
  searchResult: RepoSearchExecutionResult | null;
  searchLoading: boolean;
  searchError: RepoSearchError | null;
  search: (options?: RepoSearchExecuteOptions) => Promise<RepoSearchExecutionResult | null>;
  clearResults: () => void;
  resetFilters: () => void;
  isBranchIndexed: (branch: string) => boolean;
  refreshIndexStatus: () => void;
  initializeIndex: () => void;
}

interface UseRepoSearchOptions {
  currentBranch: string;
  defaultBranch: string;
  branches: string[];
}

const SEARCH_INDEX_DEFAULT_LIMIT = 200;

function sanitizeBranchList(
  branches: string[],
  availableBranches: Set<string>,
  branchOrder: Map<string, number>
): string[] {
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const rawName of branches) {
    const trimmed = rawName.trim();
    if (trimmed.length === 0) {
      continue;
    }
    if (!availableBranches.has(trimmed)) {
      continue;
    }
    if (seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized.sort((a, b) => {
    const rankA = branchOrder.get(a);
    const rankB = branchOrder.get(b);

    if (rankA !== undefined && rankB !== undefined) {
      return rankA - rankB;
    }
    if (rankA !== undefined) {
      return -1;
    }
    if (rankB !== undefined) {
      return 1;
    }

    return a.localeCompare(b, 'zh-CN');
  });
}

function sanitizeExtensions(extensions: string[] | string): string[] {
  const values = Array.isArray(extensions) ? extensions : [extensions];
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const rawValue of values) {
    const trimmed = rawValue.trim().toLowerCase();
    if (trimmed.length === 0) {
      continue;
    }
    const extension = trimmed.startsWith('.') ? trimmed.slice(1) : trimmed;
    if (extension.length === 0 || seen.has(extension)) {
      continue;
    }
    seen.add(extension);
    normalized.push(extension);
  }

  return normalized;
}

function normalizeSearchIndexError(error: unknown): RepoSearchError {
  if (error instanceof SearchIndexError) {
    return {
      source: 'index',
      code: error.code,
      message: error.message,
      details: error.details,
      raw: error
    } satisfies RepoSearchError;
  }

  const message = error instanceof Error ? error.message : 'Unknown search index error';
  return {
    source: 'index',
    code: 'UNKNOWN',
    message,
    raw: error
  } satisfies RepoSearchError;
}

function normalizeSearchError(error: unknown, mode: RepoSearchMode): RepoSearchError {
  if (error instanceof SearchIndexError) {
    return {
      source: 'search',
      code: error.code,
      message: error.message,
      details: error.details,
      raw: error
    } satisfies RepoSearchError;
  }

  const message = error instanceof Error ? error.message : 'Unknown search error';
  return {
    source: 'search',
    code: mode === 'search-index' ? SearchIndexErrorCode.INDEX_FILE_NOT_FOUND : 'UNKNOWN',
    message,
    raw: error
  } satisfies RepoSearchError;
}

export function useRepoSearch({ currentBranch, defaultBranch, branches }: UseRepoSearchOptions): RepoSearchState {
  const searchIndexConfig = getSearchIndexConfig();
  const indexBranchName = searchIndexConfig.indexBranch;
  const indexFeatureEnabled = GitHub.SearchIndex.isEnabled();

  const { availableBranchSet, availableBranches, branchOrder } = useMemo(() => {
    const set = new Set<string>();
    const order = new Map<string, number>();
    const list: string[] = [];

  const appendBranch = (candidate: string): void => {
      const trimmed = candidate.trim();
      if (trimmed.length === 0 || trimmed === indexBranchName || set.has(trimmed)) {
        return;
      }

      set.add(trimmed);
      order.set(trimmed, list.length);
      list.push(trimmed);
    };

    for (const branch of branches) {
      appendBranch(branch);
    }

    appendBranch(defaultBranch);
    appendBranch(currentBranch);

    return {
      availableBranchSet: set,
      availableBranches: list,
      branchOrder: order
    };
  }, [branches, currentBranch, defaultBranch, indexBranchName]);

  const [filters, setFilters] = useState<RepoSearchFilters>(() => ({
    keyword: '',
    branches: currentBranch !== '' && currentBranch !== indexBranchName ? [currentBranch] : [],
    pathPrefix: '',
    extensions: []
  }));

  useEffect(() => {
    setFilters(prev => {
      const sanitizedBranches = sanitizeBranchList(prev.branches, availableBranchSet, branchOrder);
      const unchanged =
        sanitizedBranches.length === prev.branches.length &&
        sanitizedBranches.every((branch, index) => branch === prev.branches[index]);

      if (unchanged) {
        return prev;
      }

      return {
        ...prev,
        branches: sanitizedBranches
      } satisfies RepoSearchFilters;
    });
  }, [availableBranchSet, branchOrder]);

  const previousBranchRef = useRef<string>(currentBranch);

  useEffect(() => {
    const previous = previousBranchRef.current;
    if (currentBranch === previous) {
      return;
    }

    previousBranchRef.current = currentBranch;

    setFilters(prev => {
      const hasCustomSelection = prev.branches.length > 1 && previous !== '';
      const branchMatched = prev.branches.length === 1 && prev.branches[0] === previous;

      if (!hasCustomSelection && branchMatched) {
        const nextBranches = currentBranch !== '' && currentBranch !== indexBranchName ? [currentBranch] : [];
        return {
          ...prev,
          branches: nextBranches
        } satisfies RepoSearchFilters;
      }

      if (prev.branches.length === 0) {
        const nextBranches = currentBranch !== '' && currentBranch !== indexBranchName ? [currentBranch] : [];
        return {
          ...prev,
          branches: nextBranches
        } satisfies RepoSearchFilters;
      }

      return prev;
    });
  }, [currentBranch, indexBranchName]);

  const [preferredMode, setPreferredMode] = useState<RepoSearchMode>(indexFeatureEnabled ? 'search-index' : 'github-api');

  useEffect(() => {
    if (!indexFeatureEnabled && preferredMode !== 'github-api') {
      setPreferredMode('github-api');
    }
  }, [indexFeatureEnabled, preferredMode]);

  const [indexStatus, setIndexStatus] = useState<RepoSearchIndexStatus>(() => ({
    enabled: indexFeatureEnabled,
    ready: false,
    loading: false,
    error: null,
    indexedBranches: []
  }));

  const prefetchedBranchesRef = useRef<Set<string>>(new Set());
  const [indexRefreshToken, setIndexRefreshToken] = useState<number>(0);
  const [indexInitialized, setIndexInitialized] = useState<boolean>(false);

  const initializeIndex = useCallback(() => {
    setIndexInitialized(true);
  }, []);

  const refreshIndexStatus = useCallback(() => {
    GitHub.SearchIndex.invalidateCache();
    prefetchedBranchesRef.current.clear();
    setIndexRefreshToken(token => token + 1);
  }, []);

  useEffect(() => {
    if (!indexFeatureEnabled) {
      setIndexStatus({
        enabled: false,
        ready: false,
        loading: false,
        error: null,
        indexedBranches: []
      });
      return;
    }

    // 只有在索引被初始化后才执行检测
    if (!indexInitialized) {
      return;
    }

    const abortController = new AbortController();
    const { signal } = abortController;

    setIndexStatus(prev => ({
      ...prev,
      enabled: true,
      loading: true,
      error: null
    }));

    (async () => {
      try {
        await GitHub.SearchIndex.ensureReady(signal);
        const indexedBranches = await GitHub.SearchIndex.getIndexedBranches(signal);

        if (signal.aborted) {
          return;
        }

        setIndexStatus({
          enabled: true,
          ready: true,
          loading: false,
          error: null,
          indexedBranches,
          lastUpdatedAt: Date.now()
        });
      } catch (error: unknown) {
        if (signal.aborted) {
          return;
        }

        const normalized = normalizeSearchIndexError(error);
        setIndexStatus({
          enabled: true,
          ready: false,
          loading: false,
          error: normalized,
          indexedBranches: [],
          lastUpdatedAt: Date.now()
        });
      }
    })().catch((error: unknown) => {
      if (!signal.aborted) {
        logger.error('[RepoSearch] 意外的索引状态刷新错误', error);
      }
    });

    return () => {
      abortController.abort();
    };
  }, [indexFeatureEnabled, indexRefreshToken, indexInitialized]);

  const isBranchIndexed = useCallback(
    (branch: string) => indexStatus.indexedBranches.includes(branch),
    [indexStatus.indexedBranches]
  );

  const computeEffectiveBranches = useCallback((): string[] => {
    if (filters.branches.length > 0) {
      return sanitizeBranchList(filters.branches, availableBranchSet, branchOrder);
    }

    const fallbackCandidates: string[] = [];
    if (currentBranch !== '' && currentBranch !== indexBranchName) {
      fallbackCandidates.push(currentBranch);
    } else if (defaultBranch !== '' && defaultBranch !== indexBranchName) {
      fallbackCandidates.push(defaultBranch);
    }

    return sanitizeBranchList(fallbackCandidates, availableBranchSet, branchOrder);
  }, [filters.branches, availableBranchSet, branchOrder, currentBranch, defaultBranch, indexBranchName]);

  const fallbackReason = useMemo<RepoSearchFallbackReason | null>(() => {
    if (preferredMode !== 'search-index') {
      return null;
    }

    if (!indexFeatureEnabled) {
      return 'index-disabled';
    }

    if (indexStatus.error !== null) {
      return 'index-error';
    }

    if (!indexStatus.ready) {
      return 'index-not-ready';
    }

    const targetBranches = computeEffectiveBranches();

    if (targetBranches.length === 0) {
      return null;
    }

    if (!targetBranches.some(branch => isBranchIndexed(branch))) {
      return 'branch-not-indexed';
    }

    return null;
  }, [preferredMode, indexFeatureEnabled, indexStatus.error, indexStatus.ready, computeEffectiveBranches, isBranchIndexed]);

  const effectiveMode: RepoSearchMode = preferredMode === 'search-index' && fallbackReason !== null
    ? 'github-api'
    : preferredMode;

  useEffect(() => {
    if (preferredMode !== 'search-index') {
      return;
    }

    if (!indexFeatureEnabled || !indexStatus.ready || !indexInitialized) {
      return;
    }

    const candidateBranches = computeEffectiveBranches();

    const branchesToPrefetch = candidateBranches.filter(branch => {
      if (!isBranchIndexed(branch)) {
        return false;
      }
      return !prefetchedBranchesRef.current.has(branch);
    });

    if (branchesToPrefetch.length === 0) {
      return;
    }

    const abortController = new AbortController();
    const { signal } = abortController;

    (async () => {
      await Promise.allSettled(
        branchesToPrefetch.map(async branch => {
          try {
            const success = await GitHub.SearchIndex.prefetchBranch(branch, signal);
            if (!signal.aborted && success) {
              prefetchedBranchesRef.current.add(branch);
            }
          } catch (error: unknown) {
            if (!signal.aborted) {
              logger.warn(`[RepoSearch] 预加载索引失败: ${branch}`, error);
            }
          }
        })
      );
    })().catch((error: unknown) => {
      if (!signal.aborted) {
        logger.warn('[RepoSearch] 预加载索引时出现未捕获异常', error);
      }
    });

    return () => {
      abortController.abort();
    };
  }, [preferredMode, indexFeatureEnabled, indexStatus.ready, indexInitialized, computeEffectiveBranches, isBranchIndexed]);

  const [searchResult, setSearchResult] = useState<RepoSearchExecutionResult | null>(null);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<RepoSearchError | null>(null);

  const availableModes = useMemo<RepoSearchMode[]>(() => {
    if (indexFeatureEnabled) {
      return ['search-index', 'github-api'];
    }
    return ['github-api'];
  }, [indexFeatureEnabled]);

  const setKeyword = useCallback((value: string) => {
    setFilters(prev => ({
      ...prev,
      keyword: value
    }));
  }, []);

  const setBranchFilter = useCallback((branchesOrBranch: string[] | string) => {
    const normalized = sanitizeBranchList(
      Array.isArray(branchesOrBranch) ? branchesOrBranch : [branchesOrBranch],
      availableBranchSet,
      branchOrder
    );
    setFilters(prev => ({
      ...prev,
      branches: normalized
    }));
  }, [availableBranchSet, branchOrder]);

  const setExtensionFilter = useCallback((extensions: string[] | string) => {
    const normalized = sanitizeExtensions(extensions);
    setFilters(prev => ({
      ...prev,
      extensions: normalized
    }));
  }, []);

  const setPathPrefix = useCallback((prefix: string) => {
    setFilters(prev => ({
      ...prev,
      pathPrefix: prefix.trim()
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      keyword: '',
      branches: currentBranch !== '' && currentBranch !== indexBranchName
        ? sanitizeBranchList([currentBranch], availableBranchSet, branchOrder)
        : [],
      pathPrefix: '',
      extensions: []
    });
  }, [currentBranch, indexBranchName, availableBranchSet, branchOrder]);

  const clearResults = useCallback(() => {
    setSearchResult(null);
    setSearchError(null);
  }, []);

  const search = useCallback<RepoSearchState['search']>(async (options) => {
    const mergedFilters: RepoSearchFilters = {
      keyword: options?.keyword ?? filters.keyword,
      branches: options?.branches ?? filters.branches,
      pathPrefix: options?.pathPrefix ?? filters.pathPrefix,
      extensions: options?.extensions ?? filters.extensions
    };

  const sanitizedBranches = sanitizeBranchList(mergedFilters.branches, availableBranchSet, branchOrder);
    const sanitizedExtensions = sanitizeExtensions(mergedFilters.extensions);
    const keyword = mergedFilters.keyword.trim();

    if (keyword.length === 0) {
      const emptyResult: RepoSearchExecutionResult = {
        mode: effectiveMode,
        items: [],
        took: 0,
        filters: {
          keyword,
          branches: sanitizedBranches,
          pathPrefix: mergedFilters.pathPrefix.trim(),
          extensions: sanitizedExtensions
        },
        completedAt: Date.now()
      };
      setSearchResult(emptyResult);
      setSearchError(null);
      return emptyResult;
    }

    const modeToUse = options?.mode ?? effectiveMode;
    const resolvedMode: RepoSearchMode = modeToUse === 'search-index' && fallbackReason !== null
      ? 'github-api'
      : modeToUse;

    setSearchLoading(true);
    setSearchError(null);

    const startedAt = performance.now();

    try {
      if (resolvedMode === 'search-index') {
        const candidateBranches = sanitizedBranches.length > 0
          ? sanitizedBranches
          : computeEffectiveBranches();

        const indexedBranches = candidateBranches.filter(branch => {
          if (branch === indexBranchName) {
            return false;
          }
          return isBranchIndexed(branch);
        });

        if (indexedBranches.length === 0) {
          throw new SearchIndexError(
            SearchIndexErrorCode.INDEX_BRANCH_NOT_INDEXED,
            'None of the selected branches have available search indexes',
            { branch: candidateBranches.join(', ') }
          );
        }

        const pathPrefixRaw = mergedFilters.pathPrefix.trim();
        const pathPrefix = pathPrefixRaw === '' ? undefined : pathPrefixRaw;

        const searchIndexOptions: Parameters<typeof GitHub.SearchIndex.search>[0] = {
          keyword,
          branches: indexedBranches,
          limit: SEARCH_INDEX_DEFAULT_LIMIT
        };

        if (pathPrefix !== undefined) {
          searchIndexOptions.pathPrefix = pathPrefix;
        }

        if (sanitizedExtensions.length > 0) {
          searchIndexOptions.extensions = sanitizedExtensions;
        }

        const results = await GitHub.SearchIndex.search(searchIndexOptions);

        const took = performance.now() - startedAt;
        const items: RepoSearchItem[] = results.map(item => ({
          ...item,
          source: 'search-index' as const
        }));

        const execution: RepoSearchExecutionResult = {
          mode: 'search-index',
          items,
          took,
          filters: {
            keyword,
            branches: indexedBranches,
            pathPrefix: pathPrefixRaw,
            extensions: sanitizedExtensions
          },
          completedAt: Date.now()
        };

        setSearchResult(execution);
        return execution;
      }

      // 确定要搜索的分支列表
      let targetBranches = sanitizedBranches;
      if (targetBranches.length === 0) {
        if (currentBranch !== '' && currentBranch !== indexBranchName) {
          targetBranches = [currentBranch];
        } else if (defaultBranch !== '' && defaultBranch !== indexBranchName) {
          targetBranches = [defaultBranch];
        } else {
          targetBranches = [defaultBranch];
        }
      }

      const pathPrefixRaw = mergedFilters.pathPrefix.trim();

      // 使用 Trees API 进行多分支搜索
      const branchResults = await GitHub.Search.searchMultipleBranchesWithTreesApi(
        keyword,
        targetBranches,
        pathPrefixRaw,
        sanitizedExtensions[0]
      );

      const allItems: RepoSearchItem[] = branchResults.flatMap(({ branch, results }: { branch: string; results: GitHubContent[] }) =>
        results.map((item: GitHubContent) => ({
          ...item,
          source: 'github-api' as const,
          branch
        }))
      );

      const took = performance.now() - startedAt;

      const execution: RepoSearchExecutionResult = {
        mode: 'github-api',
        items: allItems,
        took,
        filters: {
          keyword,
          branches: targetBranches,
          pathPrefix: pathPrefixRaw,
          extensions: sanitizedExtensions
        },
        completedAt: Date.now()
      };

      setSearchResult(execution);
      return execution;
    } catch (error: unknown) {
      const normalized = normalizeSearchError(error, resolvedMode);
      setSearchError(normalized);

      const enrichedError = new Error(normalized.message);
      enrichedError.name = 'RepoSearchError';
      Object.assign(enrichedError, {
        code: normalized.code,
        details: normalized.details,
        source: normalized.source,
        cause: normalized.raw
      });

      throw enrichedError;
    } finally {
      setSearchLoading(false);
    }
  }, [filters, availableBranchSet, branchOrder, effectiveMode, fallbackReason, computeEffectiveBranches, currentBranch, defaultBranch, indexBranchName, isBranchIndexed]);

  return {
    keyword: filters.keyword,
    setKeyword,
    branchFilter: filters.branches,
    setBranchFilter,
    extensionFilter: filters.extensions,
    setExtensionFilter,
    pathPrefix: filters.pathPrefix,
    setPathPrefix,
    availableBranches,
    availableModes,
    preferredMode,
    setPreferredMode,
    mode: effectiveMode,
    fallbackReason,
    indexStatus,
    searchResult,
    searchLoading,
    searchError,
    search,
    clearResults,
    resetFilters,
    isBranchIndexed,
    refreshIndexStatus,
    initializeIndex
  } satisfies RepoSearchState;
}
