import { getGithubConfig, getAccessConfig } from '@/config';

// 基础配置
const githubConfig = getGithubConfig();
export const GITHUB_REPO_OWNER = githubConfig.repoOwner;
export const GITHUB_REPO_NAME = githubConfig.repoName;
export const DEFAULT_BRANCH = githubConfig.repoBranch;

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

// 获取配置信息
export function getConfig(): ConfigInfo {
  const githubConfig = getGithubConfig();
  
  // 使用配置中的分支，保持与后端一致
  return {
    repoOwner: githubConfig.repoOwner,
    repoName: githubConfig.repoName,
    repoBranch: githubConfig.repoBranch
  };
}

// 获取API URL
export function getApiUrl(path: string): string {
  const safePath = path.replace(/^\/+/, '');
  const apiUrl = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${safePath}?ref=${DEFAULT_BRANCH}`;

  // 开发环境使用本地代理
  if (isDevEnvironment) {
    const encodedPath = safePath.length > 0
      ? safePath.split('/').map(segment => encodeURIComponent(segment)).join('/')
      : '';
    return `/github-api/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${encodedPath}?ref=${DEFAULT_BRANCH}`;
  }

  return apiUrl;
}