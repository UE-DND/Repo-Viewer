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

/**
 * GitHub Token管理器类
 * 
 * 管理多个GitHub Personal Access Token的加载、轮换和失败处理。
 * 支持从环境变量和localStorage加载token，并提供自动轮换机制以避免rate limit。
 */
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

  /**
   * 从环境变量和localStorage加载GitHub Token
   * 
   * @returns void
   */
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

  /**
   * 获取当前使用的Token
   * 
   * @returns 当前Token字符串，如果没有可用token则返回空字符串
   */
  public getCurrentToken(): string {
    if (this.tokens.length === 0) {
      return '';
    }
    return this.tokens[this.currentIndex] ?? '';
  }

  /**
   * 切换到下一个可用Token
   * 
   * 自动跳过已标记为失败的token，如果所有token都失败则清除失败记录并重新开始。
   * 
   * @returns 下一个可用的Token字符串
   */
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

  /**
   * 标记Token已被使用
   * 
   * 记录token使用次数，当使用次数超过30次时自动轮换到下一个token。
   * 
   * @param token - 已使用的Token字符串
   * @returns void
   */
  public markTokenUsed(token: string): void {
    const count = this.usageCount.get(token) ?? 0;
    this.usageCount.set(token, count + 1);

    if (count > 30) {
      this.usageCount.set(token, 0);
      this.getNextToken();
    }
  }

  /**
   * 标记Token失败
   * 
   * 将token添加到失败列表并切换到下一个可用token。
   * 
   * @param token - 失败的Token字符串
   * @returns 下一个可用的Token字符串
   */
  public markTokenFailed(token: string): string {
    this.failedTokens.add(token);
    return this.getNextToken();
  }

  /**
   * 检查是否有可用Token
   * 
   * @returns 如果至少有一个token则返回true
   */
  public hasTokens(): boolean {
    return this.tokens.length > 0;
  }

  /**
   * 获取Token总数
   * 
   * @returns 已加载的token数量
   */
  public getTokenCount(): number {
    return this.tokens.length;
  }

  /**
   * 轮换到下一个Token
   * 
   * @returns 下一个可用的Token字符串
   */
  public rotateToNextToken(): string {
    return this.getNextToken();
  }

  /**
   * 标记当前Token失败
   * 
   * 将当前正在使用的token标记为失败状态。
   * 
   * @returns void
   */
  public markCurrentTokenFailed(): void {
    const currentToken = this.getCurrentToken();
    if (currentToken !== '') {
      this.markTokenFailed(currentToken);
    }
  }

  /**
   * 设置本地Token
   * 
   * 在localStorage中存储或删除GitHub PAT，并重新加载所有token。
   * 
   * @param token - Token字符串，空字符串表示删除
   * @returns void
   */
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

  /**
   * 获取GitHub PAT用于API请求
   * 
   * 返回当前token并自动记录使用次数。
   * 
   * @returns GitHub Personal Access Token字符串
   */
  public getGitHubPAT(): string {
    const token = this.getCurrentToken();
    if (token !== '') {
      this.markTokenUsed(token);
    }
    return token;
  }

  /**
   * 处理API错误响应
   * 
   * 根据HTTP状态码自动处理token轮换，支持401/403/429/400等错误。
   * 
   * @param error - API响应的Response对象
   * @returns void
   */
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
