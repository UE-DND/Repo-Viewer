import { getGithubConfig, getAccessConfig } from '../../../config';
import { getForceServerProxy, shouldUseServerAPI } from '../config/ProxyForceManager';

// 基础配置
const githubConfig = getGithubConfig();
export const GITHUB_REPO_OWNER = githubConfig.repoOwner;
export const GITHUB_REPO_NAME = githubConfig.repoName;
export const DEFAULT_BRANCH = githubConfig.repoBranch;

// 运行时配置
const accessConfig = getAccessConfig();

// 是否使用服务端 API（运行时判定）
export const USE_SERVER_API = shouldUseServerAPI();

// 模式设置
export const USE_TOKEN_MODE = accessConfig.useTokenMode;

// 强制使用服务端 API 代理所有请求
export const FORCE_SERVER_PROXY = getForceServerProxy();

// 工具函数
export const isDevEnvironment = import.meta.env.DEV;

// GitHub API 基础配置
export const GITHUB_API_BASE = 'https://api.github.com';

// 配置信息接口
export interface ConfigInfo {
  repoOwner: string;
  repoName: string;
  repoBranch: string;
}

// 获取配置信息
export async function getConfig(): Promise<ConfigInfo> {
  const latestConfig = getGithubConfig();

  return {
    repoOwner: latestConfig.repoOwner,
    repoName: latestConfig.repoName,
    repoBranch: latestConfig.repoBranch
  };
}

// 获取 API URL
export function getApiUrl(path: string): string {
  const safePath = path.replace(/^\/+/, '');
  const apiUrl = `${GITHUB_API_BASE}/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${safePath}?ref=${DEFAULT_BRANCH}`;

  // 开发环境使用本地代理
  if (isDevEnvironment) {
    const encodedPath = safePath
      ? safePath.split('/').map(segment => encodeURIComponent(segment)).join('/')
      : '';
    return `/github-api/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${encodedPath}?ref=${DEFAULT_BRANCH}`;
  }

  return apiUrl;
}
