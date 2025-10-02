import { GitHubContent } from '@/types';
import { GitHubAuth } from './GitHubAuth';
import { GitHubSearchService } from './GitHubSearchService';
import { GitHubPrefetchService } from './GitHubPrefetchService';
import { GitHubStatsService } from './GitHubStatsService';
import { getConfig, ConfigInfo } from './GitHubConfig';

export class GitHubService {
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

  // 获取目录内容
  public static async getContents(path: string, signal?: AbortSignal): Promise<GitHubContent[]> {
    const { GitHubContentService } = await import('./GitHubContentService');
    const contents = await GitHubContentService.getContents(path, signal);

    // 预加载相关内容
    GitHubPrefetchService.prefetchRelatedContent(contents).catch(() => {});

    return contents;
  }

  // 获取文件内容
  public static async getFileContent(fileUrl: string): Promise<string> {
    const { GitHubContentService } = await import('./GitHubContentService');
    return GitHubContentService.getFileContent(fileUrl);
  }

  // 使用GitHub API进行搜索
  public static async searchWithGitHubApi(
    searchTerm: string,
    currentPath: string = '',
    fileTypeFilter?: string
  ): Promise<GitHubContent[]> {
    return GitHubSearchService.searchWithGitHubApi(searchTerm, currentPath, fileTypeFilter);
  }

  // 搜索文件
  public static async searchFiles(
    searchTerm: string,
    currentPath: string = '',
    recursive: boolean = false,
    fileTypeFilter?: string
  ): Promise<GitHubContent[]> {
    return GitHubSearchService.searchFiles(searchTerm, currentPath, recursive, fileTypeFilter);
  }

  // 智能预取目录内容
  public static prefetchContents(path: string, priority: 'high' | 'medium' | 'low' = 'low'): void {
    GitHubPrefetchService.prefetchContents(path, priority);
  }

  // 批量预加载多个路径
  public static async batchPrefetchContents(paths: string[], maxConcurrency: number = 3): Promise<void> {
    return GitHubPrefetchService.batchPrefetchContents(paths, maxConcurrency);
  }

  // 标记代理服务失败
  public static markProxyServiceFailed(proxyUrl: string): void {
    GitHubAuth.markProxyServiceFailed(proxyUrl);
  }

  // 获取当前使用的代理服务
  public static getCurrentProxyService(): string {
    return GitHubAuth.getCurrentProxyService();
  }

  // 重置失败的代理服务记录
  public static resetFailedProxyServices(): void {
    GitHubAuth.resetFailedProxyServices();
  }

  // 转换相对图片URL为绝对URL
  public static transformImageUrl(src: string | undefined, markdownFilePath: string, useTokenMode: boolean): string | undefined {
    return GitHubAuth.transformImageUrl(src, markdownFilePath, useTokenMode);
  }

  // 清除缓存和重置网络状态
  public static async clearCache(): Promise<void> {
    return GitHubStatsService.clearCache();
  }

  // 获取缓存统计
  public static getCacheStats() {
    return GitHubStatsService.getCacheStats();
  }

  // 获取网络请求统计
  public static async getNetworkStats() {
    return GitHubStatsService.getNetworkStats();
  }

  // 获取批处理器（用于调试）
  public static async getBatcher() {
    const { GitHubContentService } = await import('./GitHubContentService');
    return GitHubContentService.getBatcher();
  }
}

// 重新导出类型和配置
export type { ConfigInfo } from './GitHubConfig';
