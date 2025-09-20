import { GitHubContent } from '../../../types';
import { GitHubAuth } from './GitHubAuth';
import { GitHubSearchService } from './GitHubSearchService';
import { GitHubPrefetchService } from './GitHubPrefetchService';
import { GitHubStatsService } from './GitHubStatsService';
import { getConfig, ConfigInfo } from './GitHubConfig';

// GitHub API服务类 - 重构后的主类，整合各个功能模块
export class GitHubService {
  // === 认证和配置相关方法 ===

  // 获取GitHub PAT总数
  public static getTokenCount(): number {
    return GitHubAuth.getTokenCount();
  }

  // 检查是否配置了有效token
  public static hasToken(): boolean {
    return GitHubAuth.hasToken();
  }

  // 设置本地token（开发环境使用）
  public static setLocalToken(token: string): void {
    GitHubAuth.setLocalToken(token);
  }

  // 获取配置信息
  public static async getConfig(): Promise<ConfigInfo> {
    return getConfig();
  }

  // === 内容获取相关方法 ===

  // 获取目录内容
  public static async getContents(path: string, signal?: AbortSignal): Promise<GitHubContent[]> {
    const { GitHubContentService } = await import('./GitHubContentService');
    const contents = await GitHubContentService.getContents(path, signal);

    GitHubPrefetchService.prefetchRelatedContent(contents).catch(() => {});

    return contents;
  }

  // 获取文件内容
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

export type { ConfigInfo } from './GitHubConfig';
