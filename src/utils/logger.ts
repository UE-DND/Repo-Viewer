// 开发者日志
export const logger = {
  log: (...args: any[]) => {
    if (import.meta.env.VITE_DEVELOPER_MODE === 'true') {
      console.log('[App]', ...args);
    }
  },
  warn: (...args: any[]) => {
    if (import.meta.env.VITE_DEVELOPER_MODE === 'true') {
      console.warn('[App]', ...args);
    }
  },
  error: (...args: any[]) => {
    if (import.meta.env.VITE_DEVELOPER_MODE === 'true') {
      console.error('[App]', ...args);
    }
  },
  info: (...args: any[]) => {
    if (import.meta.env.VITE_DEVELOPER_MODE === 'true') {
      console.info('[App]', ...args);
    }
  },
  debug: (...args: any[]) => {
    if (import.meta.env.VITE_DEVELOPER_MODE === 'true') {
      console.debug('[App:Debug]', ...args);
    }
  },
  time: (label: string) => {
    if (import.meta.env.VITE_DEVELOPER_MODE === 'true') {
      console.time(`[App:Time] ${label}`);
    }
  },
  timeEnd: (label: string) => {
    if (import.meta.env.VITE_DEVELOPER_MODE === 'true') {
      console.timeEnd(`[App:Time] ${label}`);
    }
  },
  group: (label: string) => {
    if (import.meta.env.VITE_DEVELOPER_MODE === 'true') {
      console.group(`[App:Group] ${label}`);
    }
  },
  groupEnd: () => {
    if (import.meta.env.VITE_DEVELOPER_MODE === 'true') {
      console.groupEnd();
    }
  }
}; 