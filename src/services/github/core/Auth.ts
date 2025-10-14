import { GitHubTokenManager } from '../TokenManager';
import { ProxyService } from '../proxy/ProxyService';
import { ErrorManager } from '@/utils/error/ErrorManager';
import type { GitHubError } from '@/types/errors';
import { shouldUseServerAPI } from '../config/ProxyForceManager';

// GitHub认证管理器，使用模块导出而非类
const tokenManager = new GitHubTokenManager();

// 获取GitHub PAT总数
export function getTokenCount(): number {
  return tokenManager.getTokenCount();
}

// 检查是否配置了有效token
export function hasToken(): boolean {
  return tokenManager.hasTokens();
}

// 设置本地token（开发环境使用）
export function setLocalToken(token: string): void {
  tokenManager.setLocalToken(token);
}

// 获取请求头
export function getAuthHeaders(): HeadersInit {
  if (shouldUseServerAPI()) {
    // 使用服务端API时，不需要在前端添加认证头
    return {
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };
  }

  const token = tokenManager.getGitHubPAT();
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  };

  if (token !== '') {
    headers['Authorization'] = `token ${token}`;
  }

  return headers;
}

// 处理API错误 - 增强版错误处理
export function handleApiError(error: Response, endpoint: string, method = 'GET'): GitHubError {
  // 先调用原有的token管理器错误处理
  tokenManager.handleApiError(error);

  // 创建详细的GitHub错误
  const remainingHeader = error.headers.get('x-ratelimit-remaining');
  const resetHeader = error.headers.get('x-ratelimit-reset');
  
  const gitHubError = ErrorManager.createGitHubError(
    error.statusText !== '' ? error.statusText : `HTTP ${error.status.toString()} 错误`,
    error.status,
    endpoint,
    method,
    {
      remaining: remainingHeader !== null && remainingHeader !== '' ? parseInt(remainingHeader, 10) : 0,
      reset: resetHeader !== null && resetHeader !== '' ? parseInt(resetHeader, 10) : 0
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
export function markProxyServiceFailed(proxyUrl: string): void {
  ProxyService.markProxyServiceFailed(proxyUrl);
}

// 获取当前使用的代理服务
export function getCurrentProxyService(): string {
  return ProxyService.getCurrentProxyService();
}

// 重置失败的代理服务记录
export function resetFailedProxyServices(): void {
  ProxyService.resetFailedProxyServices();
}

// 转换相对图片URL为绝对URL
export function transformImageUrl(src: string | undefined, markdownFilePath: string, useTokenMode: boolean): string | undefined {
  return ProxyService.transformImageUrl(src, markdownFilePath, useTokenMode);
}

// 为了向后兼容，导出一个包含所有函数的对象
export const GitHubAuth = {
  getTokenCount,
  hasToken,
  setLocalToken,
  getAuthHeaders,
  handleApiError,
  markProxyServiceFailed,
  getCurrentProxyService,
  resetFailedProxyServices,
  transformImageUrl
} as const;