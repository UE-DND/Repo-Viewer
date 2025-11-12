import type { SearchIndexManifest, SearchIndexDocument, SearchIndexFileDescriptor } from '../../schemas';

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

export function getManifestCache(): ManifestCacheEntry | null {
  return manifestCache;
}

export function setManifestCache(entry: ManifestCacheEntry | null): void {
  manifestCache = entry;
}

export function getIndexCacheEntry(cacheKey: string): IndexCacheEntry | undefined {
  return indexCache.get(cacheKey);
}

export function setIndexCacheEntry(cacheKey: string, entry: IndexCacheEntry): void {
  indexCache.set(cacheKey, entry);
}

export function getBranchExistenceCache(branch: string): BranchCacheEntry | undefined {
  return branchExistenceCache.get(branch);
}

export function setBranchExistenceCache(branch: string, entry: BranchCacheEntry): void {
  branchExistenceCache.set(branch, entry);
}

export function clearCaches(): void {
  manifestCache = null;
  indexCache.clear();
  branchExistenceCache.clear();
}

export function getCacheKeyForDescriptor(descriptor: SearchIndexFileDescriptor): string {
  return `${descriptor.path}@${descriptor.sha256 ?? ''}`;
}

