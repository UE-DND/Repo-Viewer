import { GitHubTokenManager } from '../TokenManager';
import {
  markProxyServiceFailed as proxyMarkServiceFailed,
  getCurrentProxyService as proxyGetCurrentService,
  resetFailedProxyServices as proxyResetFailedServices,
  transformImageUrl as proxyTransformImageUrl
} from '../proxy';
import { ErrorManager } from '@/utils/error/ErrorManager';
import type { GitHubError } from '@/types/errors';
import { shouldUseServerAPI } from '../config';

// GitHub认证管理器
const tokenManager = new GitHubTokenManager();

/**
 * 获取GitHub PAT总数
 *
 * @returns 已配置的GitHub Personal Access Token数量
 */
export function getTokenCount(): number {
  return tokenManager.getTokenCount();
}

/**
 * 检查是否配置了有效的GitHub Token
 *
 * @returns 如果至少配置了一个有效token则返回true，否则返回false
 */
export function hasToken(): boolean {
  return tokenManager.hasTokens();
}

/**
 * 设置本地开发环境Token
 *
 * 在localStorage中存储GitHub PAT，主要用于开发环境测试。
 *
 * @param token - GitHub Personal Access Token
 * @returns void
 */
export function setLocalToken(token: string): void {
  tokenManager.setLocalToken(token);
}

/**
 * 获取GitHub API请求头
 *
 * 根据当前环境和配置返回适当的请求头。
 * 在服务端API模式下不包含认证信息，在Token模式下包含Authorization头。
 *
 * @returns HTTP请求头对象
 */
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

/**
 * 更新 Token 的 Rate Limit 状态
 *
 * 从成功的 API 响应中提取 rate limit 信息并更新 token 状态。
 *
 * @param response - API 响应对象
 * @returns void
 */
export function updateTokenRateLimitFromResponse(response: Response): void {
  const currentToken = tokenManager.getCurrentToken();
  if (currentToken === '') {
    return;
  }

  const remainingHeader = response.headers.get('x-ratelimit-remaining');
  const resetHeader = response.headers.get('x-ratelimit-reset');

  if (remainingHeader !== null && resetHeader !== null) {
    const remaining = parseInt(remainingHeader, 10);
    const reset = parseInt(resetHeader, 10);

    if (!isNaN(remaining) && !isNaN(reset)) {
      tokenManager.updateTokenRateLimit(currentToken, remaining, reset);
    }
  }
}

/**
 * 处理GitHub API错误
 *
 * 统一处理GitHub API返回的错误响应，包括rate limit信息和错误详情。
 * 自动处理token轮换和错误记录。
 *
 * @param error - 错误的Response对象
 * @param endpoint - API端点路径
 * @param method - HTTP请求方法，默认为'GET'
 * @returns 格式化的GitHubError对象
 */
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

/**
 * 标记代理服务失败
 *
 * 将指定的代理服务标记为失败状态，触发代理服务切换。
 *
 * @param proxyUrl - 失败的代理服务URL
 * @returns void
 */
export function markProxyServiceFailed(proxyUrl: string): void {
  proxyMarkServiceFailed(proxyUrl);
}

/**
 * 获取当前使用的代理服务
 *
 * @returns 当前活跃的代理服务URL
 */
export function getCurrentProxyService(): string {
  return proxyGetCurrentService();
}

/**
 * 重置失败的代理服务记录
 *
 * 清除所有代理服务的失败标记，允许重新尝试使用。
 *
 * @returns void
 */
export function resetFailedProxyServices(): void {
  proxyResetFailedServices();
}

/**
 * 转换相对图片URL为绝对URL
 *
 * 将Markdown文件中的相对路径图片URL转换为可访问的绝对URL，
 * 根据useTokenMode决定是否使用代理服务。
 *
 * @param src - 原始图片URL（可能是相对路径）
 * @param markdownFilePath - Markdown文件的路径
 * @param useTokenMode - 是否使用Token模式
 * @param branch - 分支名称（可选）
 * @returns 转换后的绝对URL，如果输入为undefined则返回undefined
 */
export function transformImageUrl(src: string | undefined, markdownFilePath: string, useTokenMode: boolean, branch?: string): string | undefined {
  return proxyTransformImageUrl(src, markdownFilePath, useTokenMode, branch);
}

/**
 * 获取 Token 管理器实例
 *
 * @returns TokenManager 实例
 */
export function getTokenManager(): GitHubTokenManager {
  return tokenManager;
}
