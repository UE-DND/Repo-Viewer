import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import * as path from 'path'
import * as http from 'http'
import { readFileSync } from 'fs'
import { configManager, applyEnvMappingForVite } from './src/config'

const rootDir = path.resolve(process.cwd())

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  brightWhite: '\x1b[97m',
  gray: '\x1b[90m',
  white: '\x1b[37m'
}

type Logger = {
  log: (...args: any[]) => void
  warn: (...args: any[]) => void
  error: (...args: any[]) => void
  info: (...args: any[]) => void
}

const getTimestamp = (): string => {
  const now = new Date()
  return now.toLocaleTimeString('zh-CN', { hour12: false })
}

const createLogger = (developerMode: boolean): Logger => ({
  log: (...args: any[]) => {
    if (developerMode) {
      console.log(`${colors.dim}${getTimestamp()}${colors.reset}`, `${colors.bright}${colors.cyan}[vite]${colors.reset}`, ...args)
    }
  },
  warn: (...args: any[]) => {
    if (developerMode) {
      console.warn(`${colors.dim}${getTimestamp()}${colors.reset}`, `${colors.bright}${colors.yellow}[vite]${colors.reset}`, ...args)
    }
  },
  error: (...args: any[]) => {
    if (developerMode) {
      console.error(`${colors.dim}${getTimestamp()}${colors.reset}`, `${colors.bright}${colors.red}[vite]${colors.reset}`, ...args)
    }
  },
  info: (...args: any[]) => {
    if (developerMode) {
      console.info(`${colors.dim}${getTimestamp()}${colors.reset}`, `${colors.bright}${colors.blue}[vite]${colors.reset}`, ...args)
    }
  }
})

class RequestLoggerMiddleware {
  constructor(private readonly logger: Logger) {}

  private decodeUrl(url: string | undefined): string {
    if (!url) return ''
    try {
      return decodeURIComponent(url)
    } catch {
      return url
    }
  }

  onProxyReq(proxyReq: http.ClientRequest, req: http.IncomingMessage) {
    const method = req.method || 'UNKNOWN'
    const methodColor = method === 'GET' ? colors.green : method === 'POST' ? colors.blue : colors.cyan
    const decodedUrl = this.decodeUrl(req.url)
    this.logger.log(`${methodColor}${method}${colors.reset}`, `${colors.gray}${decodedUrl}${colors.reset}`)
  }

  onProxyRes(proxyRes: http.IncomingMessage, req: http.IncomingMessage) {
    const statusCode = proxyRes.statusCode || 0
    let statusColor = colors.green
    if (statusCode >= 400) {
      statusColor = colors.red
    } else if (statusCode >= 300) {
      statusColor = colors.yellow
    }
    const decodedUrl = this.decodeUrl(req.url)
    this.logger.log(`${statusColor}${statusCode}${colors.reset}`, `${colors.gray}${decodedUrl}${colors.reset}`)
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
    const packagePath = path.resolve(rootDir, 'package.json');
    const packageContent = readFileSync(packagePath, 'utf-8');
    const packageJson = JSON.parse(packageContent);
    return packageJson.version;
  } catch (error) {
    console.warn('Failed to read package.json version:', error);
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
                logger.log(`${colors.brightWhite}Processing API request:${colors.reset}`, `${colors.gray}${decodeURIComponent(req.url)}${colors.reset}`);

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
                logger.log(`${colors.green}API request completed${colors.reset}`);
              } catch (error) {
                logger.error(`${colors.red}API handler error:${colors.reset}`, error);
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
      rolldownOptions: {
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
        { find: '@', replacement: path.resolve(rootDir, 'src') }
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
        'jszip',
        'prismjs'
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
