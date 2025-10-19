import { getDeveloperConfig } from '@/config';

/**
 * 判断是否应该输出日志
 * 
 * 根据开发者配置决定是否输出不同级别的日志。
 * 
 * @param level - 日志级别
 * @returns 是否应该输出该级别的日志
 */
const shouldLog = (level: 'log' | 'info' | 'debug' | 'warn' | 'error' | 'group' | 'groupEnd'): boolean => {
  const { mode, consoleLogging } = getDeveloperConfig();

  switch (level) {
    case 'debug':
    case 'log':
    case 'info':
      return mode;
    case 'warn':
    case 'error':
    case 'group':
    case 'groupEnd':
      return mode || consoleLogging;
    default:
      return mode;
  }
};

/**
 * 日志记录器
 * 
 * 提供统一的日志输出接口，根据配置控制日志输出级别。
 * 所有日志都带有'[App]'前缀以便区分。
 */
export const logger = {
  log: (...args: unknown[]) => {
    if (shouldLog('log')) {
      // eslint-disable-next-line no-console
      console.log('[App]', ...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (shouldLog('warn')) {
      console.warn('[App]', ...args);
    }
  },
  error: (...args: unknown[]) => {
    if (shouldLog('error')) {
      console.error('[App]', ...args);
    }
  },
  info: (...args: unknown[]) => {
    if (shouldLog('info')) {
      // eslint-disable-next-line no-console
      console.info('[App]', ...args);
    }
  },
  debug: (...args: unknown[]) => {
    if (shouldLog('debug')) {
      // eslint-disable-next-line no-console
      console.debug('[App:Debug]', ...args);
    }
  },
  group: (label: string) => {
    if (shouldLog('group')) {
      // eslint-disable-next-line no-console
      console.group(`[App:Group] ${label}`);
    }
  },
  groupEnd: () => {
    if (shouldLog('groupEnd')) {
      // eslint-disable-next-line no-console
      console.groupEnd();
    }
  }
};
