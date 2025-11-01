import type { VercelRequest, VercelResponse } from '@vercel/node';
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
  info: (...args: unknown[]): void => {
    if (shouldLog('info')) {
      // 开发者模式下允许使用 console.log
      // eslint-disable-next-line no-console
      console.log('[API]', ...args);
    }
  },
  warn: (...args: unknown[]): void => {
    if (shouldLog('warn')) {
      console.warn('[API]', ...args);
    }
  },
  error: (...args: unknown[]): void => {
    if (shouldLog('error')) {
      console.error('[API]', ...args);
    }
  }
};

// GitHub Token管理器
class GitHubTokenManager {
  private tokens: string[] = [];
  private currentIndex = 0;
  private failedTokens = new Set<string>();

  constructor() {
    this.loadTokensFromEnv();
  }

  private loadTokensFromEnv(): void {
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
      this.tokens = patKeys
        .map(key => process.env[key])
        .filter((token): token is string => typeof token === 'string' && token.trim().length > 0);

      apiLogger.info('已加载', this.tokens.length, '个GitHub令牌');
    } catch (error) {
      apiLogger.error('加载GitHub token失败:', error);
    }
  }

  public getCurrentToken(): string {
    if (this.tokens.length === 0) {
      return '';
    }
    const token = this.tokens[this.currentIndex];
    return token ?? '';
  }

  public getNextToken(): string {
    if (this.tokens.length === 0) {
      return '';
    }

    // 轮换到下一个有效的令牌
    let attempts = 0;
    while (attempts < this.tokens.length) {
      this.currentIndex = (this.currentIndex + 1) % this.tokens.length;
      const token = this.tokens[this.currentIndex];

      // 跳过已知失败的令牌
      if (token !== undefined && token.length > 0 && this.failedTokens.has(token)) {
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

  public markTokenFailed(token: string): void {
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
    if (value !== undefined && value.length > 0) {
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

const getRepoEnvConfig = (): RepoEnvConfig => {
  const branch = resolveEnvValue(['GITHUB_REPO_BRANCH', 'VITE_GITHUB_REPO_BRANCH'], 'main');
  return {
    repoOwner: resolveEnvValue(['GITHUB_REPO_OWNER', 'VITE_GITHUB_REPO_OWNER']),
    repoName: resolveEnvValue(['GITHUB_REPO_NAME', 'VITE_GITHUB_REPO_NAME']),
    repoBranch: branch.length > 0 ? branch : 'main'
  };
};

const getSingleQueryParam = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value.length > 0 ? value[0] : undefined;
  }
  return typeof value === 'string' ? value : undefined;
};

const parseBranchOverride = (value: string | string[] | undefined): string | undefined => {
  const param = getSingleQueryParam(value);
  if (param === undefined) {
    return undefined;
  }

  const trimmed = param.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const parsePositiveInt = (value: string | string[] | undefined, fallback: number, maxValue?: number): number => {
  const param = getSingleQueryParam(value);
  if (param === undefined) {
    return fallback;
  }

  const parsed = Number.parseInt(param, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  if (maxValue !== undefined) {
    return Math.min(parsed, maxValue);
  }

  return parsed;
};

// 构建认证头
function getAuthHeaders(): Record<string, string> {
  const token = tokenManager.getCurrentToken();
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Repo-Viewer'
  };

  if (token.length > 0) {
    headers['Authorization'] = `token ${token}`;
  }

  return headers;
}

// Axios 错误响应接口
interface AxiosErrorResponse {
  response?: {
    status: number;
    data?: {
      message?: string;
    };
  };
  message?: string;
}

// 处理API请求失败
async function handleRequestWithRetry<T>(requestFn: () => Promise<T>): Promise<T> {
  try {
    const result = await requestFn();
    return result;
  } catch (error) {
    const axiosError = error as AxiosErrorResponse;
    // 检查是否是认证错误或速率限制错误
    const responseStatus = axiosError.response?.status;
    if (responseStatus !== undefined && (responseStatus === 401 || responseStatus === 403)) {
      apiLogger.warn('令牌认证失败或达到限制，尝试轮换令牌...');
      const currentToken = tokenManager.getCurrentToken();
      if (currentToken.length > 0) {
        tokenManager.markTokenFailed(currentToken);
      }

      // 获取新令牌并重试
      const newToken = tokenManager.getNextToken();
      if (newToken.length > 0 && newToken !== currentToken) {
        apiLogger.info('已轮换到新令牌');
        const retryResult = await requestFn(); // 使用新令牌重试
        return retryResult;
      }
    }

    // 其他错误或没有可用令牌，抛出异常
    throw error;
  }
}

/**
 * GitHub API请求处理函数
 * 
 * 统一处理所有GitHub相关的API请求，包括获取内容、搜索、分支列表等。
 * 支持token管理和自动轮换。
 * 
 * @param req - Vercel请求对象
 * @param res - Vercel响应对象
 * @returns Promise，处理完成后解析
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const { action, path, url, branch, page, per_page } = req.query;

    const actionParam = Array.isArray(action) ? action[0] : action;

    if (actionParam === undefined || typeof actionParam !== 'string' || actionParam.length === 0) {
      res.status(400).json({ error: '缺少action参数' });
      return;
    }

    // 获取配置信息 - 新增API
    if (actionParam === 'getConfig') {
      const { repoOwner, repoName, repoBranch } = getRepoEnvConfig();
      res.status(200).json({
        status: 'success',
        data: {
          repoOwner,
          repoName,
          repoBranch
        }
      });
      return;
    }

    // 获取令牌状态 - 新增API
    if (actionParam === 'getTokenStatus') {
      res.status(200).json({
        status: 'success',
        data: tokenManager.getTokenStatus()
      });
      return;
    }

    if (actionParam === 'getBranches') {
      const { repoOwner, repoName, repoBranch } = getRepoEnvConfig();

      if (repoOwner.length === 0 || repoName.length === 0) {
        res.status(500).json({
          error: '仓库配置缺失',
          message: '缺少 GITHUB_REPO_OWNER 或 GITHUB_REPO_NAME 环境变量'
        });
        return;
      }

      const perPageValue = parsePositiveInt(per_page, 100, 100);
      const pageValue = parsePositiveInt(page, 1);

      const query = new URLSearchParams();
      query.set('per_page', perPageValue.toString());
      query.set('page', pageValue.toString());

      const apiPath = `/repos/${repoOwner}/${repoName}/branches?${query.toString()}`;

      try {
        const response = await handleRequestWithRetry(() =>
          axios.get<unknown>(`${GITHUB_API_BASE}${apiPath}`, {
            headers: getAuthHeaders()
          })
        );

        res.status(200).json({
          status: 'success',
          data: {
            defaultBranch: repoBranch.length > 0 ? repoBranch : 'main',
            branches: response.data
          }
        });
        return;
      } catch (error) {
        const axiosError = error as AxiosErrorResponse;
        apiLogger.error('获取分支列表失败:', axiosError.message ?? '未知错误');

        res.status(axiosError.response?.status ?? 500).json({
          error: '获取分支列表失败',
          message: axiosError.message ?? '未知错误'
        });
        return;
      }
    }

    // 获取仓库内容
    if (actionParam === 'getContents') {
      if (typeof path !== 'string') {
        res.status(400).json({ error: '缺少path参数' });
        return;
      }

      const { repoOwner, repoName, repoBranch } = getRepoEnvConfig();
      const branchOverride = parseBranchOverride(branch);

      if (repoOwner.length === 0 || repoName.length === 0) {
        res.status(500).json({
          error: '仓库配置缺失',
          message: '缺少 GITHUB_REPO_OWNER 或 GITHUB_REPO_NAME 环境变量'
        });
        return;
      }

      const branchToUse = branchOverride ?? (repoBranch.length > 0 ? repoBranch : 'main');
      const encodedBranch = encodeURIComponent(branchToUse);

      // 处理空路径
      const pathSegment = path === '' ? '' : `/${path}`;
      const apiPath = `/repos/${repoOwner}/${repoName}/contents${pathSegment}?ref=${encodedBranch}`;

      try {
        const response = await handleRequestWithRetry(() =>
          axios.get<unknown>(`${GITHUB_API_BASE}${apiPath}`, {
            headers: getAuthHeaders()
          })
        );

        res.status(200).json(response.data);
        return;
      } catch (error) {
        const axiosError = error as AxiosErrorResponse;
        apiLogger.error('GitHub API请求失败:', axiosError.message ?? '未知错误');

        res.status(axiosError.response?.status ?? 500).json({
          error: '获取内容失败',
          message: axiosError.message ?? '未知错误'
        });
        return;
      }
    }

    // 获取文件内容
    if (actionParam === 'getFileContent') {
      // 规范化并校验 url 参数
      const urlParam = Array.isArray(url) ? (url.length > 0 ? url[0] : undefined) : url;
      if (typeof urlParam !== 'string' || urlParam.trim() === '') {
        res.status(400).json({ error: '缺少url参数' });
        return;
      }

      try {
        const urlString = urlParam;

        // 判断是否是二进制文件
        const isBinaryFile = /\.(png|jpg|jpeg|gif|pdf|zip|rar|7z|exe|dll|so|dylib|bin)$/i.test(urlString);

        // 设置正确的响应类型
        if (isBinaryFile) {
          // 获取文件扩展名
          const fileExtension = urlString.split('.').pop()?.toLowerCase();

          // 设置正确的Content-Type
          if (fileExtension !== undefined && fileExtension.length > 0) {
            const contentTypeMap: Record<string, string> = {
              'pdf': 'application/pdf',
              'png': 'image/png',
              'jpg': 'image/jpeg',
              'jpeg': 'image/jpeg',
              'gif': 'image/gif',
              'zip': 'application/zip',
              'rar': 'application/x-rar-compressed',
              '7z': 'application/x-7z-compressed'
            };

            const contentType = contentTypeMap[fileExtension] ?? 'application/octet-stream';
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

          res.status(200).send(response.data);
          return;
        } else {
          // 文本文件
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');

          const response = await handleRequestWithRetry(() =>
            axios.get<unknown>(urlString, {
              headers: getAuthHeaders()
            })
          );

          res.status(200).send(response.data);
          return;
        }
      } catch (error) {
        const axiosError = error as AxiosErrorResponse;
        apiLogger.error('获取文件内容失败:', axiosError.message ?? '未知错误');
        res.status(axiosError.response?.status ?? 500).json({
          error: '获取文件内容失败',
          message: axiosError.message ?? '未知错误'
        });
        return;
      }
    }


    // 搜索仓库
    if (actionParam === 'search') {
      const { q, sort, order } = req.query;

      // 规范化查询参数
      const qParam = Array.isArray(q) ? (q.length > 0 ? q[0] : '') : (q ?? '');
      if (typeof qParam !== 'string' || qParam.trim() === '') {
        res.status(400).json({ error: '缺少搜索参数' });
        return;
      }

      const { repoOwner, repoName } = getRepoEnvConfig();

      if (repoOwner.length === 0 || repoName.length === 0) {
        res.status(500).json({
          error: '仓库配置缺失',
          message: '缺少 GITHUB_REPO_OWNER 或 GITHUB_REPO_NAME 环境变量'
        });
        return;
      }

      const searchQuery = `repo:${repoOwner}/${repoName} ${qParam}`;

      try {
        const response = await handleRequestWithRetry(() =>
          axios.get<unknown>(`${GITHUB_API_BASE}/search/code`, {
            headers: getAuthHeaders(),
            params: {
              q: searchQuery,
              sort: (Array.isArray(sort) ? sort[0] : sort) ?? 'best-match',
              order: (Array.isArray(order) ? order[0] : order) ?? 'desc'
            }
          })
        );

        res.status(200).json(response.data);
        return;
      } catch (error) {
        const axiosError = error as AxiosErrorResponse;
        apiLogger.error('GitHub搜索API请求失败:', axiosError.message ?? '未知错误');
        res.status(axiosError.response?.status ?? 500).json({
          error: '搜索失败',
          message: axiosError.message ?? '未知错误'
        });
        return;
      }
    }

    // 未知操作
    res.status(400).json({ error: '不支持的操作' });
  } catch (error) {
    const axiosError = error as AxiosErrorResponse;
    apiLogger.error('API请求处理错误:', error);
    let message = '处理请求时发生错误';

    const response = axiosError.response;
    if (response !== undefined) {
      const status = response.status;
      const statusStr = String(status);
      message = `GitHub API错误 (${statusStr}): ${response.data?.message ?? '未知错误'}`;
    } else {
      const errorMsg = axiosError.message;
      if (errorMsg !== undefined && errorMsg.length > 0) {
        message = errorMsg;
      }
    }

    res.status(500).json({ error: message });
  }
}
