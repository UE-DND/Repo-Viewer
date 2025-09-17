import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import * as path from 'path'
import * as http from 'http'
import * as https from 'https'
import { readFileSync } from 'fs'
// 导入配置管理器
import { configManager } from './src/config/ConfigManager'

type Logger = {
  log: (...args: any[]) => void
  warn: (...args: any[]) => void
  error: (...args: any[]) => void
  info: (...args: any[]) => void
}

// 同步仓库环境变量，确保本地(VITE_)与生产(非VITE_)命名互通
const REPO_ENV_KEYS = ['GITHUB_REPO_OWNER', 'GITHUB_REPO_NAME', 'GITHUB_REPO_BRANCH'] as const

const normalizeEnvValue = (value?: string): string | undefined => {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const syncRepoEnvVariables = (envSource: Record<string, string | undefined>) => {
  REPO_ENV_KEYS.forEach((key) => {
    const viteKey = `VITE_${key}`
    const plainValue = normalizeEnvValue(envSource[key] ?? process.env[key])
    const viteValue = normalizeEnvValue(envSource[viteKey] ?? process.env[viteKey])

    if (!viteValue && plainValue) {
      process.env[viteKey] = plainValue
    }

    if (!plainValue && viteValue) {
      process.env[key] = viteValue
    }
  })
}

const createLogger = (developerMode: boolean): Logger => ({
  log: (...args: any[]) => {
    if (developerMode) {
      console.log('[Vite]', ...args)
    }
  },
  warn: (...args: any[]) => {
    if (developerMode) {
      console.warn('[Vite]', ...args)
    }
  },
  error: (...args: any[]) => {
    if (developerMode) {
      console.error('[Vite]', ...args)
    }
  },
  info: (...args: any[]) => {
    if (developerMode) {
      console.info('[Vite]', ...args)
    }
  }
})

// 在开发环境中的请求日志记录配置
// 可通过开发者模式控制显示
class RequestLoggerMiddleware {
  constructor(private readonly logger: Logger) {}

  onProxyReq(proxyReq: http.ClientRequest, req: http.IncomingMessage) {
    this.logger.log('Sending Request to the Target:', req.method, req.url)
  }
  
  onProxyRes(proxyRes: http.IncomingMessage, req: http.IncomingMessage) {
    this.logger.log('Received Response from the Target:', proxyRes.statusCode, req.url)
  }
  
  onError(err: Error) {
    this.logger.error('proxy error', err)
  }
}

// 获取所有环境变量中的GitHub PAT
function getAllGithubPATs() {
  return configManager.getPATsForViteDefine(process.env);
}

// 获取package.json版本信息
function getPackageVersion() {
  try {
    const packagePath = path.resolve(__dirname, 'package.json');
    const packageContent = readFileSync(packagePath, 'utf-8');
    const packageJson = JSON.parse(packageContent);
    return packageJson.version;
  } catch (error) {
    console.warn('无法读取package.json版本信息:', error);
    return '1.0.0';
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  syncRepoEnvVariables(env);

  // 开发者模式配置 - 控制调试信息显示
  const DEVELOPER_MODE = process.env.DEVELOPER_MODE === 'true';
  const logger = createLogger(DEVELOPER_MODE);

  // 创建请求日志实例
  const requestLogger = new RequestLoggerMiddleware(logger);

  return {
    plugins: [react()],
    server: {
      port: 3000, // 指定端口
      proxy: {
        '/github-api': {
          target: 'https://api.github.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/github-api/, ''),
          configure: (proxy, _options) => {
            proxy.on('error', requestLogger.onError.bind(requestLogger));
            proxy.on('proxyReq', requestLogger.onProxyReq.bind(requestLogger));
            proxy.on('proxyRes', requestLogger.onProxyRes.bind(requestLogger));
          },
        },
        '/github-raw': {
          target: 'https://raw.githubusercontent.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/github-raw/, ''),
          configure: (proxy, _options) => {
            proxy.on('error', requestLogger.onError.bind(requestLogger));
            proxy.on('proxyReq', requestLogger.onProxyReq.bind(requestLogger));
            proxy.on('proxyRes', requestLogger.onProxyRes.bind(requestLogger));
          },
        },
        '/github-proxy': {
          target: 'https://mirror.ghproxy.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/github-proxy/, ''),
          configure: (proxy, _options) => {
            proxy.on('error', requestLogger.onError.bind(requestLogger));
            proxy.on('proxyReq', requestLogger.onProxyReq.bind(requestLogger));
            proxy.on('proxyRes', requestLogger.onProxyRes.bind(requestLogger));
          },
        },
        '/static-data': {
          target: 'https://raw.githubusercontent.com',
          changeOrigin: true,
          configure: (proxy, _options) => {
            proxy.on('error', requestLogger.onError.bind(requestLogger));
            proxy.on('proxyReq', requestLogger.onProxyReq.bind(requestLogger));
            proxy.on('proxyRes', requestLogger.onProxyRes.bind(requestLogger));
          },
        }
      },
      open: true
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },
    optimizeDeps: {
    },
    // 将环境变量转发到前端
    define: {
      ...getAllGithubPATs(),
      __APP_VERSION__: JSON.stringify(getPackageVersion())
    }
  }
})
