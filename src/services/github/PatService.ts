import { configManager } from '@/config';
import { GitHubTokenManager } from './TokenManager';

/**
 * GitHub PAT 统一服务
 * 提供统一的 PAT 获取和管理接口
 */
export class PatService {
  private static instance: PatService | null = null;
  private tokenManager: GitHubTokenManager;

  private constructor() {
    this.tokenManager = new GitHubTokenManager();
  }

  /**
   * 获取 PatService 单例实例
   */
  static getInstance(): PatService {
    PatService.instance ??= new PatService();
    return PatService.instance;
  }

  /**
   * 获取当前可用的 GitHub PAT
   * @returns GitHub PAT 字符串，如果没有可用 token 则返回空字符串
   */
  getCurrentPAT(): string {
    return this.tokenManager.getCurrentToken();
  }

  /**
   * 获取下一个可用的 GitHub PAT（用于轮换）
   * @returns GitHub PAT 字符串
   */
  getNextPAT(): string {
    return this.tokenManager.getNextToken();
  }

  /**
   * 获取 GitHub PAT 并标记使用（推荐使用）
   * @returns GitHub PAT 字符串
   */
  getGitHubPAT(): string {
    return this.tokenManager.getGitHubPAT();
  }

  /**
   * 检查是否有可用的 PAT
   * @returns 是否有可用的 PAT
   */
  hasTokens(): boolean {
    return this.tokenManager.hasTokens();
  }

  /**
   * 获取可用 PAT 数量
   * @returns PAT 数量
   */
  getTokenCount(): number {
    return this.tokenManager.getTokenCount();
  }

  /**
   * 标记当前 PAT 为失败状态
   */
  markCurrentTokenFailed(): void {
    this.tokenManager.markCurrentTokenFailed();
  }

  /**
   * 处理 API 错误（自动处理 token 轮换）
   * @param error API 响应错误
   */
  handleApiError(error: Response): void {
    this.tokenManager.handleApiError(error);
  }

  /**
   * 设置本地 PAT（开发环境使用）
   * @param token PAT 字符串
   */
  setLocalToken(token: string): void {
    this.tokenManager.setLocalToken(token);
  }

  /**
   * 重新加载环境变量中的 PAT
   */
  reloadTokens(): void {
    this.tokenManager.loadTokensFromEnv();
  }

  /**
   * 获取 PAT 配置的调试信息
   * @returns 调试信息对象
   */
  getDebugInfo(): { totalTokens: number; tokenSources: unknown } {
    const debugInfo = configManager.getDebugInfo();
    return {
      totalTokens: debugInfo.configSummary.tokenCount,
      tokenSources: debugInfo.tokenSources
    };
  }

  /**
   * 获取推荐的 PAT 配置格式
   * @returns 推荐配置示例
   */
  getRecommendedConfig(): Record<string, string> {
    return {
      'VITE_GITHUB_PAT1': 'your_primary_token_here',
      'VITE_GITHUB_PAT2': 'your_secondary_token_here',
      'VITE_GITHUB_PAT3': 'your_tertiary_token_here'
    };
  }

  /**
   * 重置单例实例（主要用于测试）
   */
  static resetInstance(): void {
    PatService.instance = null;
  }
}

/**
 * 导出默认的 PAT 服务实例
 */
export const patService = PatService.getInstance();

/**
 * 兼容性导出 - 直接获取 PAT 的便捷函数
 */
export const getGitHubPAT = (): string => patService.getGitHubPAT();
export const hasGitHubTokens = (): boolean => patService.hasTokens();
export const markTokenFailed = (): void => {
  patService.markCurrentTokenFailed();
};
