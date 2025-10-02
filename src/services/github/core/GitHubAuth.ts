import { GitHubTokenManager } from '../TokenManager';
import { ProxyService } from '../proxy/ProxyService';
import { ErrorManager } from '@/utils/error/ErrorManager';
import { GitHubError } from '@/types/errors';
import { shouldUseServerAPI } from '../config/ProxyForceManager';

export class GitHubAuth {
  private static readonly tokenManager = new GitHubTokenManager();

  // 获取GitHub PAT总数
  public static getTokenCount(): number {
    return this.tokenManager.getTokenCount();
  }

  // 检查是否配置了有效token
  public static hasToken(): boolean {
    return this.tokenManager.hasTokens();
  }

  // 设置本地token（开发环境使用）
  public static setLocalToken(token: string): void {
    this.tokenManager.setLocalToken(token);
  }

  // 获取请求头
  public static getAuthHeaders(): HeadersInit {
    if (shouldUseServerAPI()) {
      // 使用服务端API时，不需要在前端添加认证头
      return {
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      };
    }

    const token = this.tokenManager.getGitHubPAT();
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    return headers;
  }

  // 处理API错误 - 增强版错误处理
  public static handleApiError(error: Response, endpoint: string, method = 'GET'): GitHubError {
    // 先调用原有的token管理器错误处理
    this.tokenManager.handleApiError(error);

    // 创建详细的GitHub错误
    const gitHubError = ErrorManager.createGitHubError(
      error.statusText || `HTTP ${error.status} 错误`,
      error.status,
      endpoint,
      method,
      {
        remaining: parseInt(error.headers.get('x-ratelimit-remaining') || '0'),
        reset: parseInt(error.headers.get('x-ratelimit-reset') || '0')
      },
      {
        url: error.url,
        headers: Object.fromEntries(error.headers.entries())
      }
    );

    // 记录错误
    ErrorManager.captureError(gitHubError);

    return gitHubError;
  }

  // 标记代理服务失败
  public static markProxyServiceFailed(proxyUrl: string): void {
    ProxyService.markProxyServiceFailed(proxyUrl);
  }

  // 获取当前使用的代理服务
  public static getCurrentProxyService(): string {
    return ProxyService.getCurrentProxyService();
  }

  // 重置失败的代理服务记录
  public static resetFailedProxyServices(): void {
    ProxyService.resetFailedProxyServices();
  }

  // 转换相对图片URL为绝对URL
  public static transformImageUrl(src: string | undefined, markdownFilePath: string, useTokenMode: boolean): string | undefined {
    return ProxyService.transformImageUrl(src, markdownFilePath, useTokenMode);
  }
}