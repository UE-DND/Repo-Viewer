/**
 * 配置便捷访问函数
 * 提供简化的配置访问接口
 */

import { configManager } from '../core/config-manager';

// 基础配置访问函数
export const getConfig = () => configManager.getConfig();

// 分模块配置访问函数
export const getSiteConfig = () => getConfig().site;
export const getGithubConfig = () => getConfig().github;
export const getFeaturesConfig = () => getConfig().features;
export const getProxyConfig = () => getConfig().proxy;
export const getAccessConfig = () => getConfig().access;
export const getDeveloperConfig = () => getConfig().developer;
export const getRuntimeConfig = () => getConfig().runtime;
export const getTokensConfig = () => getConfig().tokens;

// 便捷判断函数
export const isDeveloperMode = () => getConfig().developer.mode;
export const isTokenMode = () => getConfig().access.useTokenMode;
export const isDevEnvironment = () => getConfig().runtime.isDev;

// Token相关便捷访问
export const getGithubPATs = () => getConfig().tokens.githubPATs;