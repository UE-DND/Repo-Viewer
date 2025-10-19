import { configManager } from '@/config';
import { GitHubTokenManager } from './TokenManager';

/**
 * GitHub PAT服务类
 * 
 * 提供统一的Personal Access Token获取和管理接口。
 * 支持token轮换、失败处理和调试信息。
 */
export class PatService {
  private static instance: PatService | null = null;
  private tokenManager: GitHubTokenManager;

  private constructor() {
    this.tokenManager = new GitHubTokenManager();
  }

  /**
   * 获取PatService单例实例
   * 
   * @returns PatService实例
   */
  static getInstance(): PatService {
    PatService.instance ??= new PatService();
    return PatService.instance;
  }

  /**
   * 获取当前可用的GitHub PAT
   * 
   * @returns GitHub PAT字符串，如果没有可用token则返回空字符串
   */
  getCurrentPAT(): string {
    return this.tokenManager.getCurrentToken();
  }

  /**
   * 获取下一个可用的GitHub PAT
   * 
   * 用于token轮换。
   * 
   * @returns GitHub PAT字符串
   */
  getNextPAT(): string {
    return this.tokenManager.getNextToken();
  }

  /**
   * 获取GitHub PAT并标记使用
   * 
   * 推荐使用此方法，会自动记录使用次数。
   * 
   * @returns GitHub PAT字符串
   */
  getGitHubPAT(): string {
    return this.tokenManager.getGitHubPAT();
  }

  /**
   * 检查是否有可用的PAT
   * 
   * @returns 如果有可用PAT返回true
   */
  hasTokens(): boolean {
    return this.tokenManager.hasTokens();
  }

  /**
   * 获取可用PAT数量
   * 
   * @returns PAT数量
   */
  getTokenCount(): number {
    return this.tokenManager.getTokenCount();
  }

  /**
   * 标记当前PAT为失败状态
   * 
   * @returns void
   */
  markCurrentTokenFailed(): void {
    this.tokenManager.markCurrentTokenFailed();
  }

  /**
   * 处理API错误
   * 
   * 自动处理token轮换。
   * 
   * @param error - API响应错误对象
   * @returns void
   */
  handleApiError(error: Response): void {
    this.tokenManager.handleApiError(error);
  }

  /**
   * 设置本地PAT
   * 
   * 主要用于开发环境。
   * 
   * @param token - PAT字符串
   * @returns void
   */
  setLocalToken(token: string): void {
    this.tokenManager.setLocalToken(token);
  }

  /**
   * 重新加载环境变量中的PAT
   * 
   * @returns void
   */
  reloadTokens(): void {
    this.tokenManager.loadTokensFromEnv();
  }

  /**
   * 获取PAT配置的调试信息
   * 
   * @returns 包含token数量和来源的调试信息对象
   */
  getDebugInfo(): { totalTokens: number; tokenSources: unknown } {
    const debugInfo = configManager.getDebugInfo();
    return {
      totalTokens: debugInfo.configSummary.tokenCount,
      tokenSources: debugInfo.tokenSources
    };
  }

  /**
   * 获取推荐的PAT配置格式
   * 
   * @returns 推荐配置示例对象
   */
  getRecommendedConfig(): Record<string, string> {
    return {
      'VITE_GITHUB_PAT1': 'your_primary_token_here',
      'VITE_GITHUB_PAT2': 'your_secondary_token_here',
      'VITE_GITHUB_PAT3': 'your_tertiary_token_here'
    };
  }

  /**
   * 重置单例实例
   * 
   * 主要用于测试。
   * 
   * @returns void
   */
  static resetInstance(): void {
    PatService.instance = null;
  }
}

/**
 * PAT服务单例实例
 * 
 * 全局PAT服务实例。
 */
export const patService = PatService.getInstance();

/**
 * 获取GitHub PAT的便捷函数
 * 
 * @returns GitHub PAT字符串
 */
export const getGitHubPAT = (): string => patService.getGitHubPAT();

/**
 * 检查是否有GitHub Token的便捷函数
 * 
 * @returns 如果有可用token返回true
 */
export const hasGitHubTokens = (): boolean => patService.hasTokens();

/**
 * 标记token失败的便捷函数
 * 
 * @returns void
 */
export const markTokenFailed = (): void => {
  patService.markCurrentTokenFailed();
};
