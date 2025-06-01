import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import * as path from 'path'
import * as http from 'http'
import * as https from 'https'

// 开发者模式配置 - 控制调试信息显示
const DEVELOPER_MODE = process.env.DEVELOPER_MODE === 'true';

// 创建日志工具
const logger = {
  log: (...args: any[]) => {
    if (DEVELOPER_MODE) {
      console.log('[Vite]', ...args);
    }
  },
  warn: (...args: any[]) => {
    if (DEVELOPER_MODE) {
      console.warn('[Vite]', ...args);
    }
  },
  error: (...args: any[]) => {
    if (DEVELOPER_MODE) {
      console.error('[Vite]', ...args);
    }
  },
  info: (...args: any[]) => {
    if (DEVELOPER_MODE) {
      console.info('[Vite]', ...args);
    }
  }
};

// 在开发环境中的请求日志记录配置
// 可通过开发者模式控制显示
class RequestLoggerMiddleware {
  onProxyReq(proxyReq: http.ClientRequest, req: http.IncomingMessage) {
    logger.log('Sending Request to the Target:', req.method, req.url);
  }
  
  onProxyRes(proxyRes: http.IncomingMessage, req: http.IncomingMessage) {
    logger.log('Received Response from the Target:', proxyRes.statusCode, req.url);
  }
  
  onError(err: Error) {
    logger.error('proxy error', err);
  }
}

// 创建请求日志实例
const requestLogger = new RequestLoggerMiddleware();

// 获取所有环境变量中的GitHub PAT
function getAllGithubPATs() {
  const env = process.env || {};
  const patEnvVars = {};
  
  for (const key in env) {
    if (key.startsWith('GITHUB_PAT') && env[key]) {
      patEnvVars[`process.env.${key}`] = JSON.stringify(env[key]);
    }
  }
  
  return patEnvVars;
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000, // 指定端口
    proxy: {
      '/github-api': {
        target: 'https://api.github.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/github-api/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', requestLogger.onError);
          proxy.on('proxyReq', requestLogger.onProxyReq);
          proxy.on('proxyRes', requestLogger.onProxyRes);
        },
      },
      '/github-raw': {
        target: 'https://raw.githubusercontent.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/github-raw/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', requestLogger.onError);
          proxy.on('proxyReq', requestLogger.onProxyReq);
          proxy.on('proxyRes', requestLogger.onProxyRes);
        },
      },
      '/github-proxy': {
        target: 'https://mirror.ghproxy.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/github-proxy/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', requestLogger.onError);
          proxy.on('proxyReq', requestLogger.onProxyReq);
          proxy.on('proxyRes', requestLogger.onProxyRes);
        },
      },
      '/static-data': {
        target: 'https://raw.githubusercontent.com',
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('error', requestLogger.onError);
          proxy.on('proxyReq', requestLogger.onProxyReq);
          proxy.on('proxyRes', requestLogger.onProxyRes);
        },
      }
    },
    open: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'pdfjs-dist': path.resolve(__dirname, 'node_modules/pdfjs-dist')
    }
  },
  optimizeDeps: {
    include: ['pdfjs-dist']
  },
  // 将环境变量转发到前端
  define: {
    ...getAllGithubPATs()
  }
}) 