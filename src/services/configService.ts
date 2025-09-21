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

/**
 * 配置服务
 */
export class ConfigService {
  /**
   * 初始化配置服务
   * 确保只会初始化一次，返回Promise等待初始化完成
   */
  public static init(): Promise<ConfigInfo> {
    // 如果已经初始化或正在加载中，直接返回
    if (isInitialized) {
      return Promise.resolve(currentConfig);
    }

    if (isLoading && initPromise) {
      return initPromise;
    }

    isLoading = true;
    initPromise = this.loadConfig()
      .then(config => {
        isInitialized = true;
        isLoading = false;

        // 更新页面标题
        if (config.siteTitle && document) {
          document.title = config.siteTitle;
        }

        return config;
      })
      .catch(error => {
        isLoading = false;
        logger.error('配置初始化失败', error);
        return currentConfig;
      });

    return initPromise;
  }

  /**
   * 从后端API加载配置
   * @returns Promise<ConfigInfo> 配置信息
   */
  public static async loadConfig(): Promise<ConfigInfo> {
    try {
      logger.debug('正在从API加载配置信息...');
      
      // 明确指定请求头以避免浏览器缓存或格式问题
      const headers = {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      };
      
      // 添加时间戳避免缓存
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/github?action=getConfig&t=${timestamp}`, { headers });
      
      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        logger.warn(`API响应格式不是JSON: ${contentType}`);
        const text = await response.text();
        logger.debug('API原始响应:', text);
        throw new Error('API返回格式不正确');
      }
      
      const result = await response.json();
      
      if (result.status === 'success' && result.data) {
        // 更新配置，保留默认值作为备用
        currentConfig = {
          ...DEFAULT_CONFIG,
          ...result.data
        };
        
        logger.debug('配置信息加载成功', currentConfig);
        return currentConfig;
      } else {
        logger.warn('API返回无效配置数据，使用默认值');
        return DEFAULT_CONFIG;
      }
    } catch (error) {
      logger.error('加载配置失败，使用默认配置', error);
      return DEFAULT_CONFIG;
    }
  }
  
  /**
   * 获取当前配置
   * @returns ConfigInfo 当前配置信息
   */
  public static getConfig(): ConfigInfo {
    return currentConfig;
  }
  
  /**
   * 获取站点标题
   * @returns string 站点标题
   */
  public static getSiteTitle(): string {
    return currentConfig.siteTitle;
  }

  /**
   * 配置是否已初始化
   */
  public static isInitialized(): boolean {
    return isInitialized;
  }
}

export default ConfigService; 