import { getDeveloperConfig } from '@/config';

// 开发者日志
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

export const logger = {
  log: (...args: any[]) => {
    if (shouldLog('log')) {
      console.log('[App]', ...args);
    }
  },
  warn: (...args: any[]) => {
    if (shouldLog('warn')) {
      console.warn('[App]', ...args);
    }
  },
  error: (...args: any[]) => {
    if (shouldLog('error')) {
      console.error('[App]', ...args);
    }
  },
  info: (...args: any[]) => {
    if (shouldLog('info')) {
      console.info('[App]', ...args);
    }
  },
  debug: (...args: any[]) => {
    if (shouldLog('debug')) {
      console.debug('[App:Debug]', ...args);
    }
  },
  group: (label: string) => {
    if (shouldLog('group')) {
      console.group(`[App:Group] ${label}`);
    }
  },
  groupEnd: () => {
    if (shouldLog('groupEnd')) {
      console.groupEnd();
    }
  }
};
