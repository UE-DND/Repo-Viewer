/**
 * 工具函数模块 - 按功能域组织
 * 
 * 使用方式:
 * import { file, network, cache } from '@/utils';
 * 
 * file.isImageFile('test.jpg');
 * network.getProxiedUrl(url);
 * cache.SmartCache;
 */

// 文件操作工具
import * as fileHelpers from './files/fileHelpers';
export const file = fileHelpers;

// 格式化工具
import * as formatHelpers from './format/formatters';
export const format = formatHelpers;

// 日志工具
import { logger as loggerInstance } from './logging/logger';
export const logger = loggerInstance;
export const logging = { logger: loggerInstance };

// 网络相关工具
import { getProxiedUrl } from './network/proxyHelper';
export const network = {
  getProxiedUrl
};

// 认证工具
import * as tokenHelper from './auth/token-helper';
export const auth = tokenHelper;

// 事件处理工具
import * as eventEmitter from './events/eventEmitter';
export const events = eventEmitter;

// 错误管理工具
import { ErrorManager as ErrorManagerClass } from './error/ErrorManager';
import * as errorHandlerModule from './error/errorHandler';
export const error = {
  ErrorManager: ErrorManagerClass,
  ...errorHandlerModule
};

// PDF相关工具
import * as pdfLoading from './pdf/pdfLoading';
import * as pdfPreviewHelper from './pdf/pdfPreviewHelper';
export const pdf = {
  ...pdfLoading,
  ...pdfPreviewHelper
};

// 渲染优化工具
import * as latexOptimizer from './rendering/latexOptimizer';
export const rendering = latexOptimizer;

// 路由工具
import * as urlManager from './routing/urlManager';
export const routing = urlManager;

// 重试工具
import * as retryUtils from './retry/retryUtils';
export const retry = retryUtils;

// 请求管理工具
import { requestManager as requestManagerInstance } from './request/requestManager';
export const request = {
  manager: requestManagerInstance
};

// 缓存工具
import * as SmartCacheModule from './cache/SmartCache';
export const cache = SmartCacheModule;

// 加密和哈希工具
import * as hashUtils from './crypto/hashUtils';
export const crypto = hashUtils;

// 内容处理工具
import * as contentFilters from './content';
export const content = contentFilters;

// 排序工具
import * as sortingUtils from './sorting/contentSorting';
export const sorting = sortingUtils;

// 主题相关工具
import * as g3Curves from '@/theme/g3Curves';
export const theme = g3Curves;

// 懒加载工具
export * as lazyLoading from './lazy-loading';

/**
 * 性能优化工具集合
 */
export const performance = {
  /**
   * 防抖函数
   * 
   * 限制函数执行频率，在指定时间内多次调用只执行最后一次。
   * 
   * @param func - 要防抖的函数
   * @param waitFor - 等待时间（毫秒）
   * @returns 防抖后的函数
   */
  debounce: <F extends (...args: unknown[]) => unknown>(
    func: F,
    waitFor: number
  ): ((...args: Parameters<F>) => void) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return (...args: Parameters<F>): void => {
      if (timeout !== null) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => {
        func(...args);
      }, waitFor);
    };
  },

  /**
   * 节流函数
   * 
   * 限制函数执行频率，在指定时间窗口内最多执行一次。
   * 
   * @param func - 要节流的函数
   * @param limit - 时间窗口（毫秒）
   * @returns 节流后的函数
   */
  throttle: <F extends (...args: unknown[]) => unknown>(
    func: F,
    limit: number
  ): ((...args: Parameters<F>) => void) => {
    let inThrottle = false;
    
    return (...args: Parameters<F>): void => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => {
          inThrottle = false;
        }, limit);
      }
    };
  }
};

// 类型导出（保持类型的扁平导出以便使用）
export type { RetryOptions } from './retry/retryUtils';
export type { SmartCacheOptions } from './cache/SmartCache';
export type { RequestOptions } from './request/requestManager';
export type { ErrorHandlerOptions } from './error/errorHandler';
export type { HomepageFilterConfig } from './content';