import { logger } from '../utils';
import { getSiteConfig, getGithubConfig } from '../config';

/**
 * 配置信息接口
 */
export interface ConfigInfo {
  /** 网站标题 */
  siteTitle: string;
  /** 仓库所有者 */
  repoOwner: string;
  /** 仓库名称 */
  repoName: string;
  /** 仓库分支 */
  repoBranch: string;
}

/**
 * 配置API成功响应接口
 */
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

/**
 * 获取当前配置信息
 * 
 * @returns 当前的配置信息对象
 */
const getConfig = (): ConfigInfo => currentConfig;

/**
 * 获取网站标题
 * 
 * @returns 当前网站标题
 */
const getSiteTitle = (): string => currentConfig.siteTitle;

/**
 * 检查配置服务是否已初始化
 * 
 * @returns 如果已初始化返回true，否则返回false
 */
const isServiceInitialized = (): boolean => isInitialized;

/**
 * 初始化配置服务
 * 
 * 从API加载配置信息并更新文档标题。
 * 使用 Promise 缓存防止竞态条件，确保配置只加载一次。
 * 
 * @returns Promise，解析为配置信息对象
 */
const init = (): Promise<ConfigInfo> => {
  // 已初始化，直接返回当前配置
  if (isInitialized) {
    return Promise.resolve(currentConfig);
  }

  // 正在初始化，返回缓存的 Promise
  if (initPromise !== null) {
    return initPromise;
  }
  
  // 先设置 initPromise，防止竞态条件
  initPromise = loadConfig()
    .then(config => {
      isInitialized = true;
      updateDocumentTitle(config.siteTitle);
      return config;
    })
    .catch((error: unknown) => {
      logger.error('配置初始化失败', error);
      // 失败时重置 initPromise，允许重试
      initPromise = null;
      return currentConfig;
    });
  
  return initPromise;
};

/**
 * 配置服务API接口
 */
interface ConfigServiceApi {
  /** 初始化配置服务 */
  init: () => Promise<ConfigInfo>;
  /** 重新加载配置 */
  loadConfig: () => Promise<ConfigInfo>;
  /** 获取当前配置 */
  getConfig: () => ConfigInfo;
  /** 获取网站标题 */
  getSiteTitle: () => string;
  /** 检查是否已初始化 */
  isInitialized: () => boolean;
}

/**
 * 配置服务对象
 * 
 * 提供配置管理功能，包括从API加载配置、获取配置信息和检查初始化状态。
 */
export const ConfigService: ConfigServiceApi = {
  init,
  loadConfig,
  getConfig,
  getSiteTitle,
  isInitialized: isServiceInitialized
};

export default ConfigService;