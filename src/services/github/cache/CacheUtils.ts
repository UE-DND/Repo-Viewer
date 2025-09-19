import type { CacheConfig, CacheItemMeta } from './CacheTypes';

export function calculateTTL(config: CacheConfig, item: CacheItemMeta): number {
  if (!config.enableAdaptiveTTL) return config.defaultTTL;
  let ttl = config.defaultTTL;
  if (item.accessCount >= config.frequentAccessThreshold) {
    ttl *= config.frequentAccessMultiplier;
  }
  return Math.min(Math.max(ttl, config.minTTL), config.maxTTL);
}

export function estimateSize(obj: any): number {
  try {
    return new Blob([JSON.stringify(obj)]).size;
  } catch {
    return 1024;
  }
}
