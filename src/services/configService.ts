import { logger } from '../utils';
import { getSiteConfig, getGithubConfig } from '../config';

/**
 * 配置信息接口
 */
export interface ConfigInfo {
  siteTitle: string;
  repoOwner: string;
  repoName: string;
  repoBranch: string;
}

interface ConfigApiSuccessResponse {
  status: 'success';
  data?: unknown;
}

/**
 * 配置默认值
 */
const DEFAULT_CONFIG: ConfigInfo = {
  siteTitle: getSiteConfig().title,
  repoOwner: getGithubConfig().repoOwner,
  repoName: getGithubConfig().repoName,
  repoBranch: getGithubConfig().repoBranch
};

// 存储当前配置
let currentConfig: ConfigInfo = { ...DEFAULT_CONFIG };

// 初始化状态
let isInitialized = false;
let isLoading = false;
let initPromise: Promise<ConfigInfo> | null = null;

const isConfigApiSuccessResponse = (value: unknown): value is ConfigApiSuccessResponse => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return (value as { status?: unknown }).status === 'success';
};

const normalizeConfigData = (data: unknown): Partial<ConfigInfo> => {
  if (typeof data !== 'object' || data === null) {
    return {};
  }

  const record = data as Record<string, unknown>;
  const normalized: Partial<ConfigInfo> = {};

  const siteTitle = record['siteTitle'];
  if (typeof siteTitle === 'string') {
    normalized.siteTitle = siteTitle;
  }

  const repoOwner = record['repoOwner'];
  if (typeof repoOwner === 'string') {
    normalized.repoOwner = repoOwner;
  }

  const repoName = record['repoName'];
  if (typeof repoName === 'string') {
    normalized.repoName = repoName;
  }

  const repoBranch = record['repoBranch'];
  if (typeof repoBranch === 'string') {
    normalized.repoBranch = repoBranch;
  }

  return normalized;
};

const updateDocumentTitle = (siteTitle: string): void => {
  if (typeof document === 'undefined') {
    return;
  }

  const trimmedTitle = siteTitle.trim();

  if (trimmedTitle.length === 0) {
    return;
  }

  document.title = trimmedTitle;
};

const loadConfig = async (): Promise<ConfigInfo> => {
  try {
    logger.debug('正在从API加载配置信息...');

    const headers: HeadersInit = {
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache'
    };

    const timestamp = Date.now().toString();
    const response = await fetch(`/api/github?action=getConfig&t=${encodeURIComponent(timestamp)}`, { headers });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status.toString()}`);
    }

    const contentType = response.headers.get('content-type');

    if (typeof contentType !== 'string' || !contentType.includes('application/json')) {
      logger.warn(`API响应格式不是JSON: ${contentType ?? 'unknown'}`);
      const text = await response.text();
      logger.debug('API原始响应:', text);
      throw new Error('API返回格式不正确');
    }

    const result: unknown = await response.json();

    if (isConfigApiSuccessResponse(result)) {
      const normalizedConfig = normalizeConfigData(result.data);
      currentConfig = {
        ...DEFAULT_CONFIG,
        ...normalizedConfig
      };

      logger.debug('配置信息加载成功', currentConfig);
      return currentConfig;
    }

    logger.warn('API返回无效配置数据，使用默认值');
  } catch (error: unknown) {
    logger.error('加载配置失败，使用默认配置', error);
  }

  currentConfig = { ...DEFAULT_CONFIG };
  return currentConfig;
};

const getConfig = (): ConfigInfo => currentConfig;

const getSiteTitle = (): string => currentConfig.siteTitle;

const isServiceInitialized = (): boolean => isInitialized;

const init = (): Promise<ConfigInfo> => {
  if (isInitialized) {
    return Promise.resolve(currentConfig);
  }

  if (isLoading && initPromise !== null) {
    return initPromise;
  }

  isLoading = true;

  const promise = loadConfig()
    .then(config => {
      isInitialized = true;
      updateDocumentTitle(config.siteTitle);
      return config;
    })
    .catch((error: unknown) => {
      logger.error('配置初始化失败', error);
      return currentConfig;
    })
    .finally(() => {
      isLoading = false;
      initPromise = null;
    });

  initPromise = promise;
  return promise;
};

interface ConfigServiceApi {
  init: () => Promise<ConfigInfo>;
  loadConfig: () => Promise<ConfigInfo>;
  getConfig: () => ConfigInfo;
  getSiteTitle: () => string;
  isInitialized: () => boolean;
}

export const ConfigService: ConfigServiceApi = {
  init,
  loadConfig,
  getConfig,
  getSiteTitle,
  isInitialized: isServiceInitialized
};

export default ConfigService;