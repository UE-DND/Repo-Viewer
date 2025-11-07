import { getSearchIndexConfig } from '@/config';

import type { SearchIndexManifest } from '../../schemas';
import {
  checkIndexBranchExists,
  fetchManifest,
  invalidateSearchIndexCache as clearSearchIndexCache,
  prefetchSearchIndexForBranch as prefetchBranch,
  refreshSearchIndexManifest
} from './fetchers';
import {
  createSearchIndexError,
  SearchIndexError,
  SearchIndexErrorCode,
  type SearchIndexErrorDetails
} from './errors';
import {
  searchIndex,
  type SearchIndexResultItem,
  type SearchIndexSearchOptions
} from './search';

export { searchIndex, SearchIndexError, SearchIndexErrorCode, createSearchIndexError };
export type { SearchIndexErrorDetails, SearchIndexResultItem, SearchIndexSearchOptions };

export async function getSearchIndexManifest(signal?: AbortSignal): Promise<SearchIndexManifest> {
  return fetchManifest(signal);
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
    throw createSearchIndexError(
      SearchIndexErrorCode.INDEX_BRANCH_MISSING,
      'Search index branch does not exist',
      { branch: config.indexBranch }
    );
  }

  await fetchManifest(signal);
}

export async function getIndexedBranches(signal?: AbortSignal): Promise<string[]> {
  const manifest = await fetchManifest(signal);
  return Object.keys(manifest.branches);
}

export async function prefetchSearchIndexForBranch(branch: string, signal?: AbortSignal): Promise<boolean> {
  return prefetchBranch(branch, signal);
}

export function invalidateSearchIndexCache(): void {
  clearSearchIndexCache();
}

export async function refreshSearchIndex(signal?: AbortSignal): Promise<SearchIndexManifest> {
  return refreshSearchIndexManifest(signal);
}

