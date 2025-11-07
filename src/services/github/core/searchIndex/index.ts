export {
  searchIndex,
  getSearchIndexManifest,
  isSearchIndexEnabled,
  ensureSearchIndexReady,
  getIndexedBranches,
  prefetchSearchIndexForBranch,
  invalidateSearchIndexCache,
  refreshSearchIndex,
  SearchIndexError,
  SearchIndexErrorCode,
  createSearchIndexError
} from './service';

export type {
  SearchIndexErrorDetails,
  SearchIndexResultItem,
  SearchIndexSearchOptions
} from './service';

