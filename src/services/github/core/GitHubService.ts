import { GitHubContent } from '../../../types';
import { GitHubAuth } from './GitHubAuth';
import { GitHubSearchService } from './GitHubSearchService';
import { GitHubPrefetchService } from './GitHubPrefetchService';
import { GitHubStatsService } from './GitHubStatsService';
import { getConfig, ConfigInfo } from './GitHubConfig';

// GitHub API 服务类 - 整合各个功能模块
export class GitHubService {
  // === 认证和配置相关方法 ===
  public static getTokenCount(): number {
    return GitHubAuth.getTokenCount();
  }

  public static hasToken(): boolean {
    return GitHubAuth.hasToken();
  }

  public static setLocalToken(token: string): void {
    GitHubAuth.setLocalToken(token);
  }

  public static async getConfig(): Promise<ConfigInfo> {
    return getConfig();
  }

  // === 内容获取相关方法 ===
  public static async getContents(path: string, signal?: AbortSignal): Promise<GitHubContent[]> {
    const { GitHubContentService } = await import('./GitHubContentService');
    const contents = await GitHubContentService.getContents(path, signal);

    // 预加载相关内容
    GitHubPrefetchService.prefetchRelatedContent(contents).catch(() => {});

    return contents;
  }

  public static async getFileContent(fileUrl: string): Promise<string> {
    const { GitHubContentService } = await import('./GitHubContentService');
    return GitHubContentService.getFileContent(fileUrl);
  }

  // === 搜索相关方法 ===
  public static async searchWithGitHubApi(
    searchTerm: string,
    currentPath: string = '',
    fileTypeFilter?: string
  ): Promise<GitHubContent[]> {
    return GitHubSearchService.searchWithGitHubApi(searchTerm, currentPath, fileTypeFilter);
  }

  public static async searchFiles(
    searchTerm: string,
    currentPath: string = '',
    recursive: boolean = false,
    fileTypeFilter?: string
  ): Promise<GitHubContent[]> {
    return GitHubSearchService.searchFiles(searchTerm, currentPath, recursive, fileTypeFilter);
  }

  // === 预加载相关方法 ===
  public static prefetchContents(path: string, priority: 'high' | 'medium' | 'low' = 'low'): void {
    GitHubPrefetchService.prefetchContents(path, priority);
  }

  public static async batchPrefetchContents(paths: string[], maxConcurrency: number = 3): Promise<void> {
    return GitHubPrefetchService.batchPrefetchContents(paths, maxConcurrency);
  }

  // === 代理和图片处理相关方法 ===
  public static markProxyServiceFailed(proxyUrl: string): void {
    GitHubAuth.markProxyServiceFailed(proxyUrl);
  }

  public static getCurrentProxyService(): string {
    return GitHubAuth.getCurrentProxyService();
  }

  public static resetFailedProxyServices(): void {
    GitHubAuth.resetFailedProxyServices();
  }

  // 转换相对图片 URL 为绝对 URL
  public static transformImageUrl(
    src: string | undefined,
    markdownFilePath: string,
    useTokenMode: boolean
  ): string | undefined {
    return GitHubAuth.transformImageUrl(src, markdownFilePath, useTokenMode);
  }

  // === 统计和调试相关方法 ===
  public static async clearCache(): Promise<void> {
    return GitHubStatsService.clearCache();
  }

  public static getCacheStats() {
    return GitHubStatsService.getCacheStats();
  }

  public static async getNetworkStats() {
    return GitHubStatsService.getNetworkStats();
  }

  public static async getBatcher() {
    const { GitHubContentService } = await import('./GitHubContentService');
    return GitHubContentService.getBatcher();
  }
}

// 重新导出类型
export type { ConfigInfo } from './GitHubConfig';
