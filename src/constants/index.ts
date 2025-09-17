import { getSiteConfig } from '../config/ConfigManager';

// 应用常量

// 站点标题
export const SITE_TITLE = getSiteConfig().title;

// API相关常量
export const API_CONSTANTS = {
  GITHUB_API_URL: 'https://api.github.com',
  DEFAULT_PER_PAGE: 100
};

// 本地存储键
export const STORAGE_KEYS = {
  COLOR_MODE: 'colorMode',
  RECENT_REPOS: 'recentRepos',
  ACCESS_TOKEN: 'accessToken'
}; 