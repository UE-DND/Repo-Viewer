// 导出所有独立的函数
export {
  getTokenCount,
  hasToken,
  setLocalToken,
  getGitHubConfig,
  getCurrentBranch,
  setCurrentBranch,
  getDefaultBranchName,
  getBranches,
  getContents,
  getFileContent,
  searchWithGitHubApi,
  searchFiles,
  prefetchContents,
  batchPrefetchContents,
  markProxyServiceFailed,
  getCurrentProxyService,
  resetFailedProxyServices,
  transformImageUrl,
  clearCache,
  getCacheStats,
  getNetworkStats,
  getBatcher,
  type ConfigInfo
} from './github/core/Service';

// 导出其他服务
export { CacheManager } from './github/cache/CacheManager';
export { GitHubTokenManager } from './github/TokenManager';
export { ProxyService } from './github/proxy/ProxyService';
export { RequestBatcher } from './github/RequestBatcher';
export * from './github/core/Config';

// 导出Auth相关函数
export {
  getAuthHeaders,
  handleApiError
} from './github/core/Auth';

// 导出Prefetch相关函数
export {
  prefetchRelatedContent
} from './github/core/PrefetchService';
