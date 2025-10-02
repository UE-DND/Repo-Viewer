import { getSiteConfig } from '../config';
export const SITE_TITLE = getSiteConfig().title;
export const API_CONSTANTS = {
  GITHUB_API_URL: 'https://api.github.com',
  DEFAULT_PER_PAGE: 100
};
export const STORAGE_KEYS = {
  COLOR_MODE: 'colorMode',
  RECENT_REPOS: 'recentRepos',
  ACCESS_TOKEN: 'accessToken'
};
