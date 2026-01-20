import type { SearchIndexManifest } from '../../schemas';

interface ManifestCacheEntry {
  data: SearchIndexManifest;
  fetchedAt: number;
}

export type DocfindSearchHandler = (query: string, limit?: number) => Promise<unknown[]>;

interface ModuleCacheEntry {
  search: DocfindSearchHandler;
  hash: string;
}

let manifestCache: ManifestCacheEntry | null = null;
const moduleCache = new Map<string, ModuleCacheEntry>();

export function getManifestCache(): ManifestCacheEntry | null {
  return manifestCache;
}

export function setManifestCache(entry: ManifestCacheEntry | null): void {
  manifestCache = entry;
}

export function getModuleCacheEntry(branch: string): ModuleCacheEntry | undefined {
  return moduleCache.get(branch);
}

export function setModuleCacheEntry(branch: string, entry: ModuleCacheEntry): void {
  moduleCache.set(branch, entry);
}

export function clearCaches(): void {
  manifestCache = null;
  moduleCache.clear();
}
