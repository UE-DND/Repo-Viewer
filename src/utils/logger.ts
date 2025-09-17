import { isDeveloperMode } from '../config/ConfigManager';

// 开发者日志
export const logger = {
  log: (...args: any[]) => {
    if (isDeveloperMode()) {
      console.log('[App]', ...args);
    }
  },
  warn: (...args: any[]) => {
    if (isDeveloperMode()) {
      console.warn('[App]', ...args);
    }
  },
  error: (...args: any[]) => {
    if (isDeveloperMode()) {
      console.error('[App]', ...args);
    }
  },
  info: (...args: any[]) => {
    if (isDeveloperMode()) {
      console.info('[App]', ...args);
    }
  },
  debug: (...args: any[]) => {
    if (isDeveloperMode()) {
      console.debug('[App:Debug]', ...args);
    }
  },
  time: (label: string) => {
    if (isDeveloperMode()) {
      console.time(`[App:Time] ${label}`);
    }
  },
  timeEnd: (label: string) => {
    if (isDeveloperMode()) {
      console.timeEnd(`[App:Time] ${label}`);
    }
  },
  group: (label: string) => {
    if (isDeveloperMode()) {
      console.group(`[App:Group] ${label}`);
    }
  },
  groupEnd: () => {
    if (isDeveloperMode()) {
      console.groupEnd();
    }
  }
}; 