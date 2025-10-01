import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import * as path from 'path'
import * as http from 'http'
import * as https from 'https'
import { readFileSync } from 'fs'
// 导入配置管理器
import { configManager, applyEnvMappingForVite } from './src/config'

type Logger = {
  log: (...args: any[]) => void
  warn: (...args: any[]) => void
  error: (...args: any[]) => void
  info: (...args: any[]) => void
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

  // 统一由 ConfigManager 执行环境变量映射（SSOT）
  const isProdLike = mode === 'production' || process.env.NODE_ENV === 'production'
  applyEnvMappingForVite(env, { isProdLike })

  // 开发者模式配置 - 控制调试信息显示
  // 使用映射后的VITE_前缀变量或原始变量
  const DEVELOPER_MODE = (env.VITE_DEVELOPER_MODE || env.DEVELOPER_MODE) === 'true';
  const logger = createLogger(DEVELOPER_MODE);

  // 创建请求日志实例
  const requestLogger = new RequestLoggerMiddleware(logger);

  return {
    plugins: [
      react(),
      {
        name: 'vercel-api-handler',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {

            if (req.url?.startsWith('/api/github')) {
              try {
                logger.log('处理 API 请求:', req.url);

                const module = await import('./api/github');
                const handler = module.default;

                const urlParts = req.url.split('?');
                const query: Record<string, string | string[]> = {};

                if (urlParts.length > 1) {
                  const params = new URLSearchParams(urlParts[1]);
                  params.forEach((value, key) => {
                    const existing = query[key];
                    if (existing) {
                      query[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
                    } else {
                      query[key] = value;
                    }
                  });
                }

                const vercelReq = {
                  query,
                  body: undefined,
                  headers: req.headers,
                  method: req.method
                } as any;

                const vercelRes = {
                  status: (code: number) => {
                    res.statusCode = code;
                    return vercelRes;
                  },
                  json: (data: any) => {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(data));
                    return vercelRes;
                  },
                  send: (data: any) => {
                    if (Buffer.isBuffer(data)) {
                      res.end(data);
                    } else {
                      res.end(data);
                    }
                    return vercelRes;
                  },
                  setHeader: (name: string, value: string | number) => {
                    res.setHeader(name, value);
                    return vercelRes;
                  }
                } as any;

                await handler(vercelReq, vercelRes);
                logger.log('API 请求处理完成');
              } catch (error) {
                logger.error('API handler error:', error);
                if (!res.headersSent) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({
                    error: 'Internal server error',
                    message: error instanceof Error ? error.message : 'Unknown error'
                  }));
                }
              }
            } else {
              next();
            }
          });
        }
      }
    ],
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
