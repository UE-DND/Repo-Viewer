import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import * as path from 'path'
import * as http from 'http'
import * as https from 'https'
import { readFileSync } from 'fs'
import { configManager, applyEnvMappingForVite } from './src/config'
import type { GitHubContent, InitialContentHydrationPayload } from './src/types'

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

const INITIAL_CONTENT_EXCLUDE = new Set(['.gitkeep', 'Thumbs.db', '.DS_Store'])

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const createGitHubHeaders = (token?: string): Record<string, string> => {
  const headers: Record<string, string> = {
    'User-Agent': 'Repo-Viewer/Prefetch',
    Accept: 'application/vnd.github+json'
  }

  if (token && token.trim() !== '') {
    headers.Authorization = `token ${token}`
  }

  return headers
}

const mapRawContentItem = (item: unknown): GitHubContent | null => {
  if (!isRecord(item)) {
    return null
  }

  const { name, path: itemPath, type, sha } = item

  if (typeof name !== 'string' || typeof itemPath !== 'string' || typeof type !== 'string' || typeof sha !== 'string') {
    return null
  }

  const normalizedType: GitHubContent['type'] = type === 'dir' ? 'dir' : 'file'

  const result: GitHubContent = {
    name,
    path: itemPath,
    type: normalizedType,
    sha,
    download_url: typeof item.download_url === 'string' ? item.download_url : null,
  }

  if (typeof item.size === 'number') {
    result.size = item.size
  }

  if (typeof item.url === 'string') {
    result.url = item.url
  }

  if (typeof item.html_url === 'string') {
    result.html_url = item.html_url
  }

  if (typeof item.git_url === 'string') {
    result.git_url = item.git_url
  }

  if (
    isRecord(item._links) &&
    typeof item._links.self === 'string' &&
    typeof item._links.git === 'string' &&
    typeof item._links.html === 'string'
  ) {
    result._links = {
      self: item._links.self,
      git: item._links.git,
      html: item._links.html
    }
  }

  return result
}

const sortInitialContents = (contents: GitHubContent[]): GitHubContent[] => {
  return [...contents].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'dir' ? -1 : 1
    }
    return a.name.localeCompare(b.name, 'en', {
      numeric: true,
      sensitivity: 'base'
    })
  })
}

const serializeInitialPayload = (payload: InitialContentHydrationPayload): string => {
  return JSON.stringify(payload)
    .replace(/</g, '\u003C')
    .replace(/\u2028/g, '\u2028')
    .replace(/\u2029/g, '\u2029')
}

const createInitialContentPlugin = (appConfig: ReturnType<typeof configManager.getConfig>, logger: Logger) => {
  const { repoOwner, repoName, repoBranch } = appConfig.github
  const token = appConfig.tokens.githubPATs[0]

  if (!repoOwner || !repoName || !repoBranch) {
    logger.warn('Initial content hydration plugin skipped: GitHub repository config missing')
    return {
      name: 'repo-viewer-initial-content-disabled',
      apply: 'build',
      transformIndexHtml(html: string) {
        return html
      }
    }
  }

  let serializedPayloadPromise: Promise<string | null> | null = null

  const fetchInitialPayload = async (): Promise<InitialContentHydrationPayload | null> => {
    try {
      const headers = createGitHubHeaders(token)
      const directoryUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents?ref=${encodeURIComponent(repoBranch)}`
      const directoryResponse = await fetch(directoryUrl, { headers })

      if (!directoryResponse.ok) {
        logger.warn('Initial content directory request failed:', directoryResponse.status, directoryResponse.statusText)
        return null
      }

      const directoryJson = await directoryResponse.json()
      if (!Array.isArray(directoryJson)) {
        logger.warn('GitHub directory response format invalid, skipping initial content hydration')
        return null
      }

      const mapped = directoryJson
        .map(mapRawContentItem)
        .filter((item): item is GitHubContent => Boolean(item))

      const filtered = mapped.filter(item => {
        if (item.name.startsWith('.')) {
          return false
        }
        return !INITIAL_CONTENT_EXCLUDE.has(item.name)
      })

      if (filtered.length === 0) {
        logger.warn('Initial content directory is empty or all files filtered, skipping hydration')
        return null
      }

      const sorted = sortInitialContents(filtered)

      const readmeEntry = sorted.find(item => item.type === 'file' && /^readme(?:\.|$)/i.test(item.name))
      let readmeContent: string | undefined

      if (readmeEntry?.download_url) {
        try {
          const readmeHeaders = {
            ...headers,
            Accept: 'application/vnd.github.raw'
          }
          const readmeResponse = await fetch(readmeEntry.download_url, { headers: readmeHeaders })
          if (readmeResponse.ok) {
            readmeContent = await readmeResponse.text()
          } else {
            logger.warn('Failed to read README content:', readmeResponse.status, readmeResponse.statusText)
          }
        } catch (error) {
          logger.warn('Exception occurred while reading README content', error)
        }
      }

      const payload: InitialContentHydrationPayload = {
        version: 1,
        generatedAt: new Date().toISOString(),
        branch: repoBranch,
        repo: {
          owner: repoOwner,
          name: repoName
        },
        directories: [
          {
            path: '',
            contents: sorted
          }
        ],
        files: readmeEntry && readmeContent
          ? [
              {
                path: readmeEntry.path,
                downloadUrl: readmeEntry.download_url,
                sha: readmeEntry.sha,
                content: readmeContent,
                encoding: 'utf-8'
              }
            ]
          : []
      }

      logger.info('Initial content hydration data generated, will inject into build')
      return payload
    } catch (error) {
      logger.warn('Failed to fetch initial content hydration data, will continue with normal build', error)
      return null
    }
  }

  return {
    name: 'repo-viewer-initial-content',
    apply: 'build',
    enforce: 'post',
    async transformIndexHtml(html: string) {
      if (serializedPayloadPromise === null) {
        serializedPayloadPromise = (async () => {
          const payload = await fetchInitialPayload()
          if (!payload) {
            return null
          }
          return serializeInitialPayload(payload)
        })()
      }

      const serialized = await serializedPayloadPromise
      if (!serialized) {
        return html
      }

      return {
        html,
        tags: [
          {
            tag: 'script',
            attrs: {
              id: 'repo-viewer-initial-content',
              type: 'text/javascript'
            },
            children: `window.__INITIAL_CONTENT__ = ${serialized};`,
            injectTo: 'head'
          }
        ]
      }
    }
  }
}

class RequestLoggerMiddleware {
  constructor(private readonly logger: Logger) {}

  onProxyReq(proxyReq: http.ClientRequest, req: http.IncomingMessage) {
    const method = req.method || 'UNKNOWN'
    const methodColor = method === 'GET' ? colors.green : method === 'POST' ? colors.blue : colors.cyan
    this.logger.log(`${methodColor}${method}${colors.reset}`, `${colors.gray}${req.url}${colors.reset}`)
  }

  onProxyRes(proxyRes: http.IncomingMessage, req: http.IncomingMessage) {
    const statusCode = proxyRes.statusCode || 0
    let statusColor = colors.green
    if (statusCode >= 400) {
      statusColor = colors.red
    } else if (statusCode >= 300) {
      statusColor = colors.yellow
    }
    this.logger.log(`${statusColor}${statusCode}${colors.reset}`, `${colors.gray}${req.url}${colors.reset}`)
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
  const runtimeConfig = configManager.getConfig();

  return {
    plugins: [
      react(),
      createInitialContentPlugin(runtimeConfig, logger),
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
