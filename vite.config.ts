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

// GitHub PAT 相关配置
const PAT_BASE_KEY = 'GITHUB_PAT'
const MAX_PAT_NUMBER = 10

// 映射配置
const ENV_MAPPING_CONFIG = {
  // 站点配置
  SITE_TITLE: 'VITE_SITE_TITLE',
  SITE_DESCRIPTION: 'VITE_SITE_DESCRIPTION',
  SITE_KEYWORDS: 'VITE_SITE_KEYWORDS',
  SITE_OG_IMAGE: 'VITE_SITE_OG_IMAGE',

  // GitHub仓库配置
  GITHUB_REPO_OWNER: 'VITE_GITHUB_REPO_OWNER',
  GITHUB_REPO_NAME: 'VITE_GITHUB_REPO_NAME',
  GITHUB_REPO_BRANCH: 'VITE_GITHUB_REPO_BRANCH',

  // 功能配置
  HOMEPAGE_FILTER_ENABLED: 'VITE_HOMEPAGE_FILTER_ENABLED',
  HOMEPAGE_ALLOWED_FOLDERS: 'VITE_HOMEPAGE_ALLOWED_FOLDERS',
  HOMEPAGE_ALLOWED_FILETYPES: 'VITE_HOMEPAGE_ALLOWED_FILETYPES',
  HIDE_MAIN_FOLDER_DOWNLOAD: 'VITE_HIDE_MAIN_FOLDER_DOWNLOAD',
  HIDE_DOWNLOAD_FOLDERS: 'VITE_HIDE_DOWNLOAD_FOLDERS',

  // 代理配置
  DOWNLOAD_PROXY_URL: 'VITE_DOWNLOAD_PROXY_URL',
  DOWNLOAD_PROXY_URL_BACKUP1: 'VITE_DOWNLOAD_PROXY_URL_BACKUP1',
  DOWNLOAD_PROXY_URL_BACKUP2: 'VITE_DOWNLOAD_PROXY_URL_BACKUP2',

  // 访问配置
  USE_TOKEN_MODE: 'VITE_USE_TOKEN_MODE',

  // 开发者配置
  DEVELOPER_MODE: 'VITE_DEVELOPER_MODE',
  CONSOLE_LOGGING: 'VITE_CONSOLE_LOGGING'
} as const

const normalizeEnvValue = (value?: string): string | undefined => {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const syncEnvMapping = (envSource: Record<string, string | undefined>) => {
  Object.entries(ENV_MAPPING_CONFIG).forEach(([plainKey, viteKey]) => {
    const plainValue = normalizeEnvValue(envSource[plainKey] ?? process.env[plainKey])
    const viteValue = normalizeEnvValue(envSource[viteKey] ?? process.env[viteKey])

    if (plainValue && !viteValue) {
      process.env[viteKey] = plainValue
      envSource[viteKey] = plainValue
    }
  })
}

// 仅在开发模式下同步 PAT，避免生产构建时将令牌暴露给前端
const syncPatEnvVariablesForDev = (envSource: Record<string, string | undefined>, isProdLike: boolean) => {
  if (isProdLike) {
    return
  }

  const suffixes = ['', ...Array.from({ length: MAX_PAT_NUMBER }, (_, index) => `${index + 1}`)]

  suffixes.forEach((suffix) => {
    const plainKey = `${PAT_BASE_KEY}${suffix}`
    const viteKey = `VITE_${plainKey}`
    const plainValue = normalizeEnvValue(envSource[plainKey] ?? process.env[plainKey])

    if (plainValue && !process.env[viteKey]) {
      process.env[viteKey] = plainValue
      envSource[viteKey] = plainValue
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

// 在开发环境中的请求日志记录配置，可通过开发者模式控制显示
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
  const env = loadEnv(mode, process.cwd(), '')

  // 同步变量映射
  syncEnvMapping(env)

  const isProdLike = mode === 'production' || process.env.NODE_ENV === 'production'
  syncPatEnvVariablesForDev(env, isProdLike);

  // 开发者模式配置 - 控制调试信息显示
  // 使用映射后的VITE_前缀变量或原始变量
  const DEVELOPER_MODE = (env.VITE_DEVELOPER_MODE || env.DEVELOPER_MODE) === 'true';
  const logger = createLogger(DEVELOPER_MODE);

  // 创建请求日志实例
  const requestLogger = new RequestLoggerMiddleware(logger);

  return {
    plugins: [react()],
    build: {
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks: {
            // 核心框架包
            'react-vendor': ['react', 'react-dom'],
            // UI组件库 - 分离大包
            'mui-core': ['@mui/material', '@emotion/react', '@emotion/styled'],
            'mui-icons': ['@mui/icons-material'],
            // Markdown相关包 - 按需加载的重点
            'markdown-core': ['react-markdown', 'remark-gfm', 'rehype-raw'],
            'markdown-math': ['katex', 'rehype-katex', 'remark-math'],
            // 动画和交互库
            'animation-vendor': ['framer-motion'],
            'interaction-vendor': ['react-zoom-pan-pinch'],
            // 工具类库
            'http-vendor': ['axios'],
            'file-vendor': ['jszip', 'file-saver'],
            'react-utils': ['react-use', 'react-helmet-async', 'notistack'],
            'virtualization': ['react-virtualized-auto-sizer', 'react-window'],
            // 其他工具
            'validation': ['zod']
          },
          // 添加更智能的分块策略
          chunkFileNames: (chunkInfo) => {
            // 为懒加载的预览组件设置专门的命名
            if (chunkInfo.name?.includes('preview')) {
              return 'assets/preview/[name]-[hash].js';
            }
            // 为vendors设置专门的目录
            if (chunkInfo.name?.includes('vendor')) {
              return 'assets/vendor/[name]-[hash].js';
            }
            return 'assets/js/[name]-[hash].js';
          },
          // 资源文件命名
          assetFileNames: (assetInfo) => {
            // CSS文件分类
            if (assetInfo.name?.endsWith('.css')) {
              if (assetInfo.name.includes('katex')) {
                return 'assets/css/vendor/katex-[hash][extname]';
              }
              return 'assets/css/[name]-[hash][extname]';
            }
            return 'assets/[ext]/[name]-[hash][extname]';
          }
        }
      }
    },
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
      alias: [
        { find: '@', replacement: path.resolve(__dirname, './src') }
      ]
    },
    optimizeDeps: {
      // 预构建优化 - 提升开发体验
      include: [
        // 核心依赖预构建
        'react',
        'react-dom',
        '@mui/material',
        '@emotion/react',
        '@emotion/styled',
        'axios',
        // 懒加载时也会用到的基础工具
        'framer-motion',
        'react-use',
        // 确保样式解析相关包被正确预构建（处理 CJS/ESM 兼容）
        'style-to-js',
        'style-to-object',
        // Markdown 相关包预构建
        'react-markdown',
        'remark-gfm',
        'remark-math',
        'rehype-katex'
      ],
      // 排除不需要预构建的包
      exclude: [
        // 懒加载的重包排除预构建，减少开发时的构建时间
        'katex',
        'jszip'
      ]
    },
    // 将环境变量转发到前端
    define: {
      ...getAllGithubPATs(),
      __APP_VERSION__: JSON.stringify(getPackageVersion())
    }
  }
})
