import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import * as path from 'path'
import * as http from 'http'
import * as https from 'https'
import { readFileSync } from 'fs'
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

function getAllGithubPATs() {
  return configManager.getPATsForViteDefine(process.env);
}
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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const isProdLike = mode === 'production' || process.env.NODE_ENV === 'production'
  applyEnvMappingForVite(env, { isProdLike })

  const DEVELOPER_MODE = (env.VITE_DEVELOPER_MODE || env.DEVELOPER_MODE) === 'true';
  const logger = createLogger(DEVELOPER_MODE);
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
                logger.log('处理 API 请求:', decodeURIComponent(req.url));

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
          manualChunks: (id) => {
            if (!id.includes('node_modules')) {
              return undefined
            }

            const chunkGroups: Record<string, string[]> = {
              'react-vendor': ['react', 'react-dom'],
              'mui-core': ['@mui/material', '@emotion/react', '@emotion/styled'],
              'mui-icons': ['@mui/icons-material'],
              'markdown-core': ['react-markdown', 'remark-gfm', 'rehype-raw'],
              'markdown-math': ['katex', 'rehype-katex', 'remark-math'],
              'animation-vendor': ['framer-motion'],
              'interaction-vendor': ['react-zoom-pan-pinch'],
              'http-vendor': ['axios'],
              'file-vendor': ['jszip', 'file-saver'],
              'react-utils': ['react-use', 'react-helmet-async', 'notistack'],
              'virtualization': ['react-virtualized-auto-sizer', 'react-window'],
              validation: ['zod']
            }

            for (const [chunkName, packages] of Object.entries(chunkGroups)) {
              if (packages.some((pkg) => id.includes(`/node_modules/${pkg}/`) || id.includes(`\\node_modules\\${pkg}\\`))) {
                return chunkName
              }
            }

            return undefined
          },
          chunkFileNames: (chunkInfo) => {
            if (chunkInfo.name?.includes('preview')) {
              return 'assets/preview/[name]-[hash].js';
            }
            if (chunkInfo.name?.includes('vendor')) {
              return 'assets/vendor/[name]-[hash].js';
            }
            return 'assets/js/[name]-[hash].js';
          },
          assetFileNames: (assetInfo) => {
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
      port: 3000,
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
      include: [
        'react',
        'react-dom',
        '@mui/material',
        '@emotion/react',
        '@emotion/styled',
        'axios',
        'framer-motion',
        'react-use',
        'style-to-js',
        'style-to-object',
        'react-markdown',
        'remark-gfm',
        'remark-math',
        'rehype-katex',
        'jszip'
      ],
      exclude: [
        'katex'
      ]
    },
    define: {
      ...getAllGithubPATs(),
      __APP_VERSION__: JSON.stringify(getPackageVersion())
    }
  }
})
