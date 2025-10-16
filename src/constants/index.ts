import { getSiteConfig } from '../config';

/** 网站标题 */
export const SITE_TITLE = getSiteConfig().title;

/** API常量配置 */
export const API_CONSTANTS = {
  GITHUB_API_URL: 'https://api.github.com',
  DEFAULT_PER_PAGE: 100
};

/** 本地存储键名 */
export const STORAGE_KEYS = {
  COLOR_MODE: 'colorMode',
  RECENT_REPOS: 'recentRepos',
  ACCESS_TOKEN: 'accessToken'
};
