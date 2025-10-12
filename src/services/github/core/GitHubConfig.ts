import { getGithubConfig, getAccessConfig } from '@/config';

// 基础配置
const githubConfig = getGithubConfig();
export const GITHUB_REPO_OWNER = githubConfig.repoOwner;
export const GITHUB_REPO_NAME = githubConfig.repoName;
export const DEFAULT_BRANCH = githubConfig.repoBranch;

let currentBranch = (githubConfig.repoBranch ?? '').trim() || DEFAULT_BRANCH;

// 运行时配置
const accessConfig = getAccessConfig();

// 模式设置
export const USE_TOKEN_MODE = accessConfig.useTokenMode;

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

export function getDefaultBranch(): string {
  return DEFAULT_BRANCH;
}

export function getCurrentBranch(): string {
  return currentBranch;
}

export function setCurrentBranch(branch: string): void {
  const normalized = branch.trim();
  currentBranch = normalized.length > 0 ? normalized : DEFAULT_BRANCH;
}

// 获取配置信息
export function getConfig(): ConfigInfo {
  const githubConfig = getGithubConfig();
  
  // 使用配置中的分支，保持与后端一致
  return {
    repoOwner: githubConfig.repoOwner,
    repoName: githubConfig.repoName,
    repoBranch: currentBranch
  };
}

// 获取API URL
export function getApiUrl(path: string, branch?: string): string {
  const safePath = path.replace(/^\/+/, '');
  const activeBranch = (branch ?? currentBranch ?? DEFAULT_BRANCH).trim() || DEFAULT_BRANCH;
  const encodedBranch = encodeURIComponent(activeBranch);
  const apiUrl = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${safePath}?ref=${encodedBranch}`;

  // 开发环境使用本地代理
  if (isDevEnvironment) {
    const encodedPath = safePath.length > 0
      ? safePath.split('/').map(segment => encodeURIComponent(segment)).join('/')
      : '';
    return `/github-api/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${encodedPath}?ref=${encodedBranch}`;
  }

  return apiUrl;
}
