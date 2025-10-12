import type { GitHubContent } from '@/types';
import { GitHubAuth } from './GitHubAuth';
import { GitHubSearchService } from './GitHubSearchService';
import { GitHubPrefetchService } from './GitHubPrefetchService';
import { GitHubStatsService } from './GitHubStatsService';
import {
  getConfig,
  getCurrentBranch as getActiveBranch,
  setCurrentBranch as setActiveBranch,
  getDefaultBranch,
  type ConfigInfo
} from './GitHubConfig';
import { getBranches as fetchBranches } from './GitHubBranchService';

// GitHub服务，使用模块导出而非类

// 获取GitHub PAT总数
export function getTokenCount(): number {
  return GitHubAuth.getTokenCount();
}

// 检查是否配置了有效token
export function hasToken(): boolean {
  return GitHubAuth.hasToken();
}

// 设置本地token（开发环境使用）
export function setLocalToken(token: string): void {
  GitHubAuth.setLocalToken(token);
}

// 获取配置信息
export function getGitHubConfig(): ConfigInfo {
  return getConfig();
}

export function getCurrentBranch(): string {
  return getActiveBranch();
}

export function setCurrentBranch(branch: string): void {
  setActiveBranch(branch);
}

export function getDefaultBranchName(): string {
  return getDefaultBranch();
}

export async function getBranches(): Promise<string[]> {
  return fetchBranches();
}

// 获取目录内容
export async function getContents(path: string, signal?: AbortSignal): Promise<GitHubContent[]> {
  const { getContents: getContentsImpl } = await import('./GitHubContentService');
  const contents = await getContentsImpl(path, signal);

  // 预加载相关内容
  void GitHubPrefetchService.prefetchRelatedContent(contents).catch(() => {
    // 忽略预加载错误
  });

  return contents;
}

// 获取文件内容
export async function getFileContent(fileUrl: string): Promise<string> {
  const { getFileContent: getFileContentImpl } = await import('./GitHubContentService');
  return getFileContentImpl(fileUrl);
}

// 使用GitHub API进行搜索
export async function searchWithGitHubApi(
  searchTerm: string,
  currentPath = '',
  fileTypeFilter?: string
): Promise<GitHubContent[]> {
  return GitHubSearchService.searchWithGitHubApi(searchTerm, currentPath, fileTypeFilter);
}

// 搜索文件
export async function searchFiles(
  searchTerm: string,
  currentPath = '',
  recursive = false,
  fileTypeFilter?: string
): Promise<GitHubContent[]> {
  return GitHubSearchService.searchFiles(searchTerm, currentPath, recursive, fileTypeFilter);
}

// 智能预取目录内容
export function prefetchContents(path: string, priority: 'high' | 'medium' | 'low' = 'low'): void {
  GitHubPrefetchService.prefetchContents(path, priority);
}

// 批量预加载多个路径
export async function batchPrefetchContents(paths: string[], maxConcurrency = 3): Promise<void> {
  return GitHubPrefetchService.batchPrefetchContents(paths, maxConcurrency);
}

// 标记代理服务失败
export function markProxyServiceFailed(proxyUrl: string): void {
  GitHubAuth.markProxyServiceFailed(proxyUrl);
}

// 获取当前使用的代理服务
export function getCurrentProxyService(): string {
  return GitHubAuth.getCurrentProxyService();
}

// 重置失败的代理服务记录
export function resetFailedProxyServices(): void {
  GitHubAuth.resetFailedProxyServices();
}

// 转换相对图片URL为绝对URL
export function transformImageUrl(src: string | undefined, markdownFilePath: string, useTokenMode: boolean): string | undefined {
  return GitHubAuth.transformImageUrl(src, markdownFilePath, useTokenMode);
}

// 清除缓存和重置网络状态
export async function clearCache(): Promise<void> {
  return GitHubStatsService.clearCache();
}

// 获取缓存统计
export function getCacheStats(): ReturnType<typeof GitHubStatsService.getCacheStats> {
  return GitHubStatsService.getCacheStats();
}

// 获取网络请求统计
export async function getNetworkStats(): Promise<ReturnType<typeof GitHubStatsService.getNetworkStats>> {
  return GitHubStatsService.getNetworkStats();
}

// 获取批处理器（用于调试）
export async function getBatcher(): Promise<unknown> {
  const { getBatcher: getBatcherImpl } = await import('./GitHubContentService');
  return getBatcherImpl();
}

// 为了向后兼容，导出一个包含所有函数的对象
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

export type { ConfigInfo } from './GitHubConfig';
