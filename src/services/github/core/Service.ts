import type { GitHubContent } from '@/types';
import { 
  getTokenCount as authGetTokenCount,
  hasToken as authHasToken,
  setLocalToken as authSetLocalToken,
  markProxyServiceFailed as authMarkProxyServiceFailed,
  getCurrentProxyService as authGetCurrentProxyService,
  resetFailedProxyServices as authResetFailedProxyServices,
  transformImageUrl as authTransformImageUrl
} from './Auth';
import { 
  searchWithGitHubApi as searchWithApi,
  searchFiles as searchFilesImpl
} from './SearchService';
import { GitHubPrefetchService } from './PrefetchService';
import { 
  clearCache as statsClearCache,
  getCacheStats as statsGetCacheStats,
  getNetworkStats as statsGetNetworkStats
} from './StatsService';
import {
  getConfig,
  getCurrentBranch as getActiveBranch,
  setCurrentBranch as setActiveBranch,
  getDefaultBranch,
  type ConfigInfo
} from './Config';
import { getBranches as fetchBranches } from './BranchService';

// GitHub服务，使用模块导出而非类

/**
 * 获取GitHub PAT总数
 * 
 * @returns 已配置的GitHub Personal Access Token数量
 */
export function getTokenCount(): number {
  return authGetTokenCount();
}

/**
 * 检查是否配置了有效token
 * 
 * @returns 如果至少配置了一个有效token则返回true
 */
export function hasToken(): boolean {
  return authHasToken();
}

/**
 * 设置本地Token
 * 
 * 在localStorage中存储GitHub PAT，主要用于开发环境测试。
 * 
 * @param token - GitHub Personal Access Token
 * @returns void
 */
export function setLocalToken(token: string): void {
  authSetLocalToken(token);
}

/**
 * 获取GitHub配置信息
 * 
 * @returns GitHub仓库配置对象
 */
export function getGitHubConfig(): ConfigInfo {
  return getConfig();
}

/**
 * 获取当前活动分支名称
 * 
 * @returns 当前分支名称
 */
export function getCurrentBranch(): string {
  return getActiveBranch();
}

/**
 * 设置当前活动分支
 * 
 * @param branch - 要切换到的分支名称
 * @returns void
 */
export function setCurrentBranch(branch: string): void {
  setActiveBranch(branch);
}

/**
 * 获取默认分支名称
 * 
 * @returns 默认分支名称
 */
export function getDefaultBranchName(): string {
  return getDefaultBranch();
}

/**
 * 获取仓库的所有分支
 * 
 * @returns Promise，解析为分支名称数组
 */
export async function getBranches(): Promise<string[]> {
  return fetchBranches();
}

/**
 * 获取目录内容
 * 
 * 获取指定路径的目录内容，并自动触发相关内容的预加载。
 * 
 * @param path - 目录路径
 * @param signal - 可选的中断信号
 * @returns Promise，解析为GitHub内容数组
 */
export async function getContents(path: string, signal?: AbortSignal): Promise<GitHubContent[]> {
  const { getContents: getContentsImpl } = await import('./ContentService');
  const contents = await getContentsImpl(path, signal);

  // 预加载相关内容
  void GitHubPrefetchService.prefetchRelatedContent(contents).catch(() => {
    // 忽略预加载错误
  });

  return contents;
}

/**
 * 获取文件内容
 * 
 * @param fileUrl - 文件的URL地址
 * @returns Promise，解析为文件的文本内容
 */
export async function getFileContent(fileUrl: string): Promise<string> {
  const { getFileContent: getFileContentImpl } = await import('./ContentService');
  return getFileContentImpl(fileUrl);
}

/**
 * 使用GitHub API进行代码搜索
 * 
 * @param searchTerm - 搜索关键词
 * @param currentPath - 限制搜索的路径范围，默认为空
 * @param fileTypeFilter - 文件扩展名过滤器
 * @returns Promise，解析为匹配的GitHub内容数组
 */
export async function searchWithGitHubApi(
  searchTerm: string,
  currentPath = '',
  fileTypeFilter?: string
): Promise<GitHubContent[]> {
  return searchWithApi(searchTerm, currentPath, fileTypeFilter);
}

/**
 * 搜索文件
 * 
 * @param searchTerm - 搜索关键词
 * @param currentPath - 起始搜索路径
 * @param recursive - 是否递归搜索子目录
 * @param fileTypeFilter - 文件扩展名过滤器
 * @returns Promise，解析为匹配的文件数组
 */
export async function searchFiles(
  searchTerm: string,
  currentPath = '',
  recursive = false,
  fileTypeFilter?: string
): Promise<GitHubContent[]> {
  return searchFilesImpl(searchTerm, currentPath, recursive, fileTypeFilter);
}

/**
 * 智能预取目录内容
 * 
 * @param path - 要预取的目录路径
 * @param priority - 预取优先级，默认为'low'
 * @returns void
 */
export function prefetchContents(path: string, priority: 'high' | 'medium' | 'low' = 'low'): void {
  GitHubPrefetchService.prefetchContents(path, priority);
}

/**
 * 批量预加载多个路径
 * 
 * @param paths - 要预加载的路径数组
 * @param maxConcurrency - 最大并发数，默认为3
 * @returns Promise，所有预加载完成后解析
 */
export async function batchPrefetchContents(paths: string[], maxConcurrency = 3): Promise<void> {
  return GitHubPrefetchService.batchPrefetchContents(paths, maxConcurrency);
}

/**
 * 标记代理服务失败
 * 
 * @param proxyUrl - 失败的代理服务URL
 * @returns void
 */
export function markProxyServiceFailed(proxyUrl: string): void {
  authMarkProxyServiceFailed(proxyUrl);
}

/**
 * 获取当前使用的代理服务
 * 
 * @returns 当前活跃的代理服务URL
 */
export function getCurrentProxyService(): string {
  return authGetCurrentProxyService();
}

/**
 * 重置失败的代理服务记录
 * 
 * 清除所有代理服务的失败标记。
 * 
 * @returns void
 */
export function resetFailedProxyServices(): void {
  authResetFailedProxyServices();
}

/**
 * 转换相对图片URL为绝对URL
 * 
 * @param src - 原始图片URL
 * @param markdownFilePath - Markdown文件的路径
 * @param useTokenMode - 是否使用Token模式
 * @param branch - 分支名称（可选）
 * @returns 转换后的绝对URL
 */
export function transformImageUrl(src: string | undefined, markdownFilePath: string, useTokenMode: boolean, branch?: string): string | undefined {
  return authTransformImageUrl(src, markdownFilePath, useTokenMode, branch);
}

/**
 * 清除所有缓存和重置网络状态
 * 
 * @returns Promise，清除完成后解析
 */
export async function clearCache(): Promise<void> {
  return statsClearCache();
}

/**
 * 获取缓存统计信息
 * 
 * @returns 缓存统计对象
 */
export function getCacheStats(): ReturnType<typeof statsGetCacheStats> {
  return statsGetCacheStats();
}

/**
 * 获取网络请求统计信息
 * 
 * @returns Promise，解析为网络统计对象
 */
export async function getNetworkStats(): Promise<ReturnType<typeof statsGetNetworkStats>> {
  return statsGetNetworkStats();
}

/**
 * 获取请求批处理器实例
 * 
 * 主要用于调试目的。
 * 
 * @returns Promise，解析为批处理器实例
 */
export async function getBatcher(): Promise<unknown> {
  const { getBatcher: getBatcherImpl } = await import('./ContentService');
  return getBatcherImpl();
}

/**
 * GitHub服务对象
 * 
 * 为了向后兼容性，导出包含所有GitHub服务功能的常量对象。
 * 
 * @deprecated 推荐直接使用独立的导出函数
 */
export const GitHubService = {
  getTokenCount,
  hasToken,
  setLocalToken,
  getConfig: getGitHubConfig,
  getCurrentBranch,
  setCurrentBranch,
  getDefaultBranch: getDefaultBranchName,
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
  getBatcher
} as const;

export type { ConfigInfo } from './Config';
