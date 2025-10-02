import type { Config } from '../types';
import { configManager } from '../core/config-manager';

export const getConfig = (): Config => configManager.getConfig();
export const getSiteConfig = (): Config['site'] => getConfig().site;
export const getGithubConfig = (): Config['github'] => getConfig().github;
export const getFeaturesConfig = (): Config['features'] => getConfig().features;
export const getProxyConfig = (): Config['proxy'] => getConfig().proxy;
export const getAccessConfig = (): Config['access'] => getConfig().access;
export const getDeveloperConfig = (): Config['developer'] => getConfig().developer;
export const getRuntimeConfig = (): Config['runtime'] => getConfig().runtime;
export const getTokensConfig = (): Config['tokens'] => getConfig().tokens;
export const isDeveloperMode = (): boolean => getConfig().developer.mode;
export const isTokenMode = (): boolean => getConfig().access.useTokenMode;
export const isDevEnvironment = (): boolean => getConfig().runtime.isDev;
export const getGithubPATs = (): string[] => getConfig().tokens.githubPATs;
