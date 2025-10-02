import { logger } from '@/utils';
import {
  getGithubPATs,
  isTokenMode,
  isDeveloperMode,
  configManager,
  EnvParser
} from '@/config';

// 工具函数
const isDevEnvironment = import.meta.env.DEV;

// 模式设置
const USE_TOKEN_MODE = isTokenMode();

export class GitHubTokenManager {
  private tokens: string[] = [];
  private currentIndex = 0;
  private usageCount = new Map<string, number>();
  private failedTokens = new Set<string>();

  constructor() {
    if (isDevEnvironment || USE_TOKEN_MODE) {
      this.loadTokensFromEnv();
    }
    if (this.tokens.length > 0) {
      logger.info(`成功加载 ${this.tokens.length.toString()} 个GitHub Personal Access Token`);
    } else if (isDevEnvironment) {
      logger.warn('未加载任何GitHub Personal Access Token，API访问将受到严格限制');
    }
  }

  public loadTokensFromEnv(): void {
    this.tokens = [];

    try {
      const envTokens = getGithubPATs();
      this.tokens.push(...envTokens);

      if (envTokens.length > 0) {
        logger.debug(`从环境变量加载了 ${envTokens.length.toString()} 个 GitHub PAT`);
      }
      if (typeof localStorage !== 'undefined') {
        const localToken = localStorage.getItem('GITHUB_PAT');
        if (localToken !== null && localToken !== '' && EnvParser.validateToken(localToken)) {
          this.tokens.push(localToken.trim());
          logger.debug('已从localStorage加载token (已脱敏)');
        }
      }

      this.tokens = [...new Set(this.tokens)];

      if (this.tokens.length > 0) {
        logger.info(`成功加载 ${this.tokens.length.toString()} 个GitHub Personal Access Token`);
      }

      if (isDeveloperMode()) {
        const debugInfo = configManager.getDebugInfo();
        logger.debug('PAT 配置调试信息:', debugInfo);
      }
    } catch (error) {
      logger.error('加载GitHub token失败:', error);
    }
  }

  public getCurrentToken(): string {
    if (this.tokens.length === 0) {
      return '';
    }
    return this.tokens[this.currentIndex] ?? '';
  }

  public getNextToken(): string {
    if (this.tokens.length === 0) {
      return '';
    }

    let attempts = 0;
    while (attempts < this.tokens.length) {
      this.currentIndex = (this.currentIndex + 1) % this.tokens.length;
      const token = this.tokens[this.currentIndex];
      if (token === undefined || token === '') {
        attempts++;
        continue;
      }
      if (this.failedTokens.has(token)) {
        attempts++;
        continue;
      }

      return token;
    }

    this.failedTokens.clear();
    this.currentIndex = 0;
    return this.tokens[0] ?? '';
  }

  public markTokenUsed(token: string): void {
    const count = this.usageCount.get(token) ?? 0;
    this.usageCount.set(token, count + 1);

    if (count > 30) {
      this.usageCount.set(token, 0);
      this.getNextToken();
    }
  }

  public markTokenFailed(token: string): string {
    this.failedTokens.add(token);
    return this.getNextToken();
  }

  public hasTokens(): boolean {
    return this.tokens.length > 0;
  }

  public getTokenCount(): number {
    return this.tokens.length;
  }

  public rotateToNextToken(): string {
    return this.getNextToken();
  }

  public markCurrentTokenFailed(): void {
    const currentToken = this.getCurrentToken();
    if (currentToken !== '') {
      this.markTokenFailed(currentToken);
    }
  }

  public setLocalToken(token: string): void {
    if (typeof localStorage !== 'undefined') {
      if (token === '' || token.trim().length === 0) {
        localStorage.removeItem('GITHUB_PAT');
        logger.info('已移除本地GitHub token');
      } else {
        localStorage.setItem('GITHUB_PAT', token.trim());
        logger.info('已设置本地GitHub token');
      }
      this.loadTokensFromEnv();
    }
  }

  public getGitHubPAT(): string {
    const token = this.getCurrentToken();
    if (token !== '') {
      this.markTokenUsed(token);
    }
    return token;
  }

  public handleApiError(error: Response): void {
    if (error.status === 401 || error.status === 403) {
      const currentToken = this.getCurrentToken();
      if (currentToken !== '') {
        logger.warn(`令牌认证失败，尝试使用下一个令牌`);
        this.markTokenFailed(currentToken);
      }
    }

    if (error.status === 429) {
      const currentToken = this.getCurrentToken();
      if (currentToken !== '') {
        logger.warn(`令牌请求频率限制，尝试使用下一个令牌`);
        this.getNextToken();
      }
    }

    if (error.status === 400) {
      const currentToken = this.getCurrentToken();
      if (currentToken !== '') {
        logger.warn(`发生400错误(Bad Request)，可能是请求格式问题或Token权限不足，尝试使用下一个令牌`);
        this.getNextToken();
      }

      error.clone().text().then(errorText => {
        try {
          const errorJson = JSON.parse(errorText) as { message?: string; errors?: unknown[] };
          logger.error(`GitHub API 400错误详情: ${JSON.stringify(errorJson)}`);

          if (errorJson.message !== undefined && errorJson.message !== '') {
            logger.error(`错误消息: ${errorJson.message}`);
          }
          if (errorJson.errors !== undefined && Array.isArray(errorJson.errors)) {
            errorJson.errors.forEach((err: unknown, index: number) => {
              logger.error(`详细错误 #${(index + 1).toString()}: ${JSON.stringify(err)}`);
            });
          }
        } catch (_e) {
          logger.error(`GitHub API 400错误详情 (非JSON格式): ${errorText}`);
        }
      }).catch((_e: unknown) => {
        logger.error('无法解析400错误响应内容:', _e);
      });
    }
  }
}
