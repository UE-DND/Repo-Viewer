// 导出文件相关工具
export * from './files/fileHelpers';

// 导出格式化工具
export * from './format/formatters';

// 导出日志工具
export { logger } from './logging/logger';

// 导出代理工具
export { getProxiedUrl } from './network/proxyHelper';

// 导出认证相关工具
export * from './auth/token-helper';

// 导出事件相关工具
export * from './events/eventEmitter';

// 导出错误管理工具
export { ErrorManager } from './error/ErrorManager';

// 导出PDF相关工具
export * from './pdf/pdfLoading';

// 导出渲染优化工具
export * from './rendering/latexOptimizer';

// 导出路由相关工具
export * from './routing/urlManager';

// 导出G3曲线工具
export * from '../theme/g3Curves';

// 通用工具函数
export const debounce = <F extends (...args: any[]) => any>(
  func: F,
  waitFor: number
): ((...args: Parameters<F>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<F>): void => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };
};
