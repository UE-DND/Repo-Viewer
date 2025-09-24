import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

// 配置常量
const GITHUB_API_BASE = 'https://api.github.com';

const parseBooleanFlag = (value?: string | null): boolean => {
  if (typeof value !== 'string') {
    return false;
  }
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
};

const resolveBooleanFlag = (keys: string[]): boolean =>
  keys.some(key => parseBooleanFlag(process.env[key]));

const developerModeEnabled = resolveBooleanFlag(['DEVELOPER_MODE', 'VITE_DEVELOPER_MODE']);
const consoleLoggingEnabled = resolveBooleanFlag(['CONSOLE_LOGGING', 'VITE_CONSOLE_LOGGING']);

type LogLevel = 'info' | 'warn' | 'error';

const shouldLog = (level: LogLevel): boolean => {
  switch (level) {
    case 'info':
      return developerModeEnabled;
    case 'warn':
    case 'error':
      return developerModeEnabled || consoleLoggingEnabled;
    default:
      return developerModeEnabled;
  }
};

const apiLogger = {
  info: (...args: any[]) => {
    if (shouldLog('info')) {
      console.log('[API]', ...args);
    }
  },
  warn: (...args: any[]) => {
    if (shouldLog('warn')) {
      console.warn('[API]', ...args);
    }
  },
  error: (...args: any[]) => {
    if (shouldLog('error')) {
      console.error('[API]', ...args);
    }
  }
};

// GitHub Token管理器
class GitHubTokenManager {
  private tokens: string[] = [];
  private currentIndex: number = 0;
  private failedTokens: Set<string> = new Set();

  constructor() {
    this.loadTokensFromEnv();
  }

  private loadTokensFromEnv() {
    // 清空现有token
    this.tokens = [];

    try {
      // 尝试查找环境变量中的所有PAT
      const envKeys = Object.keys(process.env);
      const patKeys = envKeys.filter(key => {
        if (!(key.startsWith('GITHUB_PAT') || key.startsWith('VITE_GITHUB_PAT'))) {
          return false;
        }
        const value = process.env[key];
        return typeof value === 'string' && value.trim().length > 0;
      });

      // 收集所有有效的PAT
      const tokens = patKeys
        .map(key => process.env[key])
        .filter((token): token is string => typeof token === 'string' && token.trim().length > 0);
      this.tokens = tokens;

      apiLogger.info(`已加载 ${this.tokens.length} 个GitHub令牌`);
    } catch (error) {
      apiLogger.error('加载GitHub token失败:', error);
    }
  }

  public getCurrentToken(): string {
    if (this.tokens.length === 0) return '';
    const token = this.tokens[this.currentIndex];
    return token ?? '';
  }

  public getNextToken(): string {
    if (this.tokens.length === 0) return '';

    // 轮换到下一个有效的令牌
    let attempts = 0;
    while (attempts < this.tokens.length) {
      this.currentIndex = (this.currentIndex + 1) % this.tokens.length;
      const token = this.tokens[this.currentIndex];

      // 跳过已知失败的令牌
      if (token && this.failedTokens.has(token)) {
        attempts++;
        continue;
      }

      return token ?? '';
    }

    // 如果所有令牌都失败，重置并返回第一个令牌
    this.failedTokens.clear();
    this.currentIndex = 0;
    const firstToken = this.tokens[0];
    return firstToken ?? '';
  }

  public markTokenFailed(token: string) {
    this.failedTokens.add(token);
  }

  public hasTokens(): boolean {
    return this.tokens.length > 0;
  }

  public getTokenCount(): number {
    return this.tokens.length;
  }

  public getTokenStatus(): { hasTokens: boolean; count: number } {
    return {
      hasTokens: this.hasTokens(),
      count: this.getTokenCount()
    };
  }
}

// 创建token管理器实例
const tokenManager = new GitHubTokenManager();

const normalizeEnvValue = (value?: string | null): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const resolveEnvValue = (keys: string[], fallback = ''): string => {
  for (const key of keys) {
    const value = normalizeEnvValue(process.env[key]);
    if (value) {
      return value;
    }
  }
  return fallback;
};

interface RepoEnvConfig {
  repoOwner: string;
  repoName: string;
  repoBranch: string;
}

const getRepoEnvConfig = (): RepoEnvConfig => ({
  repoOwner: resolveEnvValue(['GITHUB_REPO_OWNER', 'VITE_GITHUB_REPO_OWNER']),
  repoName: resolveEnvValue(['GITHUB_REPO_NAME', 'VITE_GITHUB_REPO_NAME']),
  repoBranch: resolveEnvValue(['GITHUB_REPO_BRANCH', 'VITE_GITHUB_REPO_BRANCH'], 'main') || 'main'
});

// 构建认证头
function getAuthHeaders() {
  const token = tokenManager.getCurrentToken();
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Repo-Viewer'
  };

  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  return headers;
}

// 处理API请求失败
async function handleRequestWithRetry(requestFn: () => Promise<any>) {
  try {
    return await requestFn();
  } catch (error: any) {
    // 检查是否是认证错误或速率限制错误
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      apiLogger.warn(`令牌认证失败或达到限制，尝试轮换令牌...`);
      const currentToken = tokenManager.getCurrentToken();
      if (currentToken) {
        tokenManager.markTokenFailed(currentToken);
      }

      // 获取新令牌并重试
      const newToken = tokenManager.getNextToken();
      if (newToken && newToken !== currentToken) {
        apiLogger.info(`已轮换到新令牌`);
        return await requestFn(); // 使用新令牌重试
      }
    }

    // 其他错误或没有可用令牌，抛出异常
    throw error;
  }
}

// API处理函数
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { action, path, url } = req.query;

    const actionParam = Array.isArray(action) ? action[0] : action;

    if (!actionParam || typeof actionParam !== 'string') {
      return res.status(400).json({ error: '缺少action参数' });
    }

    // 获取配置信息 - 新增API
    if (actionParam === 'getConfig') {
      const { repoOwner, repoName, repoBranch } = getRepoEnvConfig();
      return res.status(200).json({
        status: 'success',
        data: {
          repoOwner,
          repoName,
          repoBranch
        }
      });
    }

    // 获取令牌状态 - 新增API
    if (actionParam === 'getTokenStatus') {
      return res.status(200).json({
        status: 'success',
        data: tokenManager.getTokenStatus()
      });
    }

    // 获取仓库内容
    if (actionParam === 'getContents') {
      if (typeof path !== 'string') {
        return res.status(400).json({ error: '缺少path参数' });
      }

      const { repoOwner, repoName, repoBranch } = getRepoEnvConfig();

      if (!repoOwner || !repoName) {
        return res.status(500).json({
          error: '仓库配置缺失',
          message: '缺少 GITHUB_REPO_OWNER 或 GITHUB_REPO_NAME 环境变量'
        });
      }

      const branch = repoBranch || 'main';

      // 处理空路径
      const pathSegment = path === '' ? '' : `/${path}`;
      const apiPath = `/repos/${repoOwner}/${repoName}/contents${pathSegment}?ref=${branch}`;

      try {
        const response = await handleRequestWithRetry(() =>
          axios.get(`${GITHUB_API_BASE}${apiPath}`, {
            headers: getAuthHeaders()
          })
        );

        return res.status(200).json(response.data);
      } catch (error: any) {
        apiLogger.error('GitHub API请求失败:', error.message);

        return res.status(error.response?.status || 500).json({
          error: '获取内容失败',
          message: error.message
        });
      }
    }

    // 获取文件内容
    if (actionParam === 'getFileContent') {
      // 规范化并校验 url 参数
      const urlParam = Array.isArray(url) ? (url.length > 0 ? url[0] : undefined) : url;
      if (typeof urlParam !== 'string' || urlParam.trim() === '') {
        return res.status(400).json({ error: '缺少url参数' });
      }

      try {
        const urlString = urlParam;

        // 判断是否是二进制文件
        const isBinaryFile = /\.(png|jpg|jpeg|gif|pdf|docx|xlsx|pptx|zip|rar|7z|exe|dll|so|dylib|bin)$/i.test(urlString);

        // 设置正确的响应类型
        if (isBinaryFile) {
          // 获取文件扩展名
          const fileExtension = urlString.split('.').pop()?.toLowerCase();

          // 设置正确的Content-Type
          if (fileExtension) {
            const contentTypeMap: Record<string, string> = {
              'pdf': 'application/pdf',
              'png': 'image/png',
              'jpg': 'image/jpeg',
              'jpeg': 'image/jpeg',
              'gif': 'image/gif',
              'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
              'zip': 'application/zip',
              'rar': 'application/x-rar-compressed',
              '7z': 'application/x-7z-compressed'
            };

            const contentType = contentTypeMap[fileExtension] || 'application/octet-stream';
            res.setHeader('Content-Type', contentType);
          } else {
            res.setHeader('Content-Type', 'application/octet-stream');
          }

          // 二进制文件，使用arraybuffer响应类型
          const response = await handleRequestWithRetry(() =>
            axios.get(urlString, {
              headers: getAuthHeaders(),
              responseType: 'arraybuffer'
            })
          );

          return res.status(200).send(response.data);
        } else {
          // 文本文件
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');

          const response = await handleRequestWithRetry(() =>
            axios.get(urlString, {
              headers: getAuthHeaders()
            })
          );

          return res.status(200).send(response.data);
        }
      } catch (error: any) {
        apiLogger.error('获取文件内容失败:', error.message);
        return res.status(error.response?.status || 500).json({
          error: '获取文件内容失败',
          message: error.message
        });
      }
    }


    // 搜索仓库
    if (actionParam === 'search') {
      const { q, sort, order } = req.query;

      // 规范化查询参数
      const qParam = Array.isArray(q) ? (q.length > 0 ? q[0] : '') : (q ?? '');
      if (typeof qParam !== 'string' || qParam.trim() === '') {
        return res.status(400).json({ error: '缺少搜索参数' });
      }

      const { repoOwner, repoName } = getRepoEnvConfig();

      if (!repoOwner || !repoName) {
        return res.status(500).json({
          error: '仓库配置缺失',
          message: '缺少 GITHUB_REPO_OWNER 或 GITHUB_REPO_NAME 环境变量'
        });
      }

      const searchQuery = `repo:${repoOwner}/${repoName} ${qParam}`;

      try {
        const response = await handleRequestWithRetry(() =>
          axios.get(`${GITHUB_API_BASE}/search/code`, {
            headers: getAuthHeaders(),
            params: {
              q: searchQuery,
              sort: (Array.isArray(sort) ? sort[0] : sort) || 'best-match',
              order: (Array.isArray(order) ? order[0] : order) || 'desc'
            }
          })
        );

        return res.status(200).json(response.data);
      } catch (error: any) {
        apiLogger.error('GitHub搜索API请求失败:', error.message);
        return res.status(error.response?.status || 500).json({
          error: '搜索失败',
          message: error.message
        });
      }
    }

    // 未知操作
    return res.status(400).json({ error: '不支持的操作' });
  } catch (error: any) {
    apiLogger.error('API请求处理错误:', error);
    let message = '处理请求时发生错误';

    if (error.response) {
      const status = error.response.status;
      message = `GitHub API错误 (${status}): ${error.response.data?.message || '未知错误'}`;
    } else if (error.message) {
      message = error.message;
    }

    return res.status(500).json({ error: message });
  }
}
