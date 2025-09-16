import { logger } from '../../utils';
import { 
  getGithubPATs, 
  isTokenMode, 
  isDeveloperMode,
  configManager, 
  EnvParser 
} from '../../config/ConfigManager';

// 工具函数
const isDevEnvironment = window.location.hostname === 'localhost';

// 模式设置
const USE_TOKEN_MODE = isTokenMode();

export class GitHubTokenManager {
  private tokens: string[] = [];
  private currentIndex: number = 0;
  private usageCount: Map<string, number> = new Map();
  private failedTokens: Set<string> = new Set();
  
  constructor() {
    // 只在开发环境或配置了使用令牌模式时加载令牌
    if (isDevEnvironment || USE_TOKEN_MODE) {
      this.loadTokensFromEnv();
    }
    
    // 记录token加载状态
    if (this.tokens.length > 0) {
      logger.info(`成功加载 ${this.tokens.length} 个GitHub Personal Access Token`);
    } else if (isDevEnvironment) {
      logger.warn('未加载任何GitHub Personal Access Token，API访问将受到严格限制');
    }
  }
  
  public loadTokensFromEnv() {
    // 清空现有token
    this.tokens = [];
    
    try {
      // 使用统一的配置管理器获取所有 tokens
      const envTokens = getGithubPATs();
      this.tokens.push(...envTokens);
      
      // 记录加载的环境变量 tokens 数量
      if (envTokens.length > 0) {
        logger.debug(`从环境变量加载了 ${envTokens.length} 个 GitHub PAT`);
      }
      
      // 尝试从localStorage加载token（用于开发环境）
      if (typeof localStorage !== 'undefined') {
        const localToken = localStorage.getItem('GITHUB_PAT');
        if (localToken && EnvParser.validateToken(localToken)) {
          this.tokens.push(localToken.trim());
          logger.debug('已从localStorage加载token (已脱敏)');
        }
      }
      
      // 去重处理
      this.tokens = [...new Set(this.tokens)];
      
      // 记录token加载状态
      if (this.tokens.length > 0) {
        logger.info(`成功加载 ${this.tokens.length} 个GitHub Personal Access Token`);
      }
      
      // 开发者模式下显示详细调试信息
      if (isDeveloperMode()) {
        const debugInfo = configManager.getDebugInfo();
        logger.debug('PAT 配置调试信息:', debugInfo);
      }
    } catch (error) {
      logger.error('加载GitHub token失败:', error);
    }
  }
  
  public getCurrentToken(): string {
    if (this.tokens.length === 0) return '';
    return this.tokens[this.currentIndex];
  }
  
  public getNextToken(): string {
    if (this.tokens.length === 0) return '';
    
    // 轮换到下一个有效的令牌
    let attempts = 0;
    while (attempts < this.tokens.length) {
      this.currentIndex = (this.currentIndex + 1) % this.tokens.length;
      const token = this.tokens[this.currentIndex];
      
      // 跳过已知失败的令牌
      if (this.failedTokens.has(token)) {
        attempts++;
        continue;
      }
      
      return token;
    }
    
    // 如果所有令牌都失败，重置并返回第一个令牌
    this.failedTokens.clear();
    this.currentIndex = 0;
    return this.tokens[0];
  }
  
  public markTokenUsed(token: string) {
    const count = this.usageCount.get(token) || 0;
    this.usageCount.set(token, count + 1);
    
    // 如果一个令牌使用次数过多，自动轮换到下一个
    if (count > 30) {
      this.usageCount.set(token, 0);
      this.getNextToken();
    }
  }
  
  public markTokenFailed(token: string) {
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
    // 获取下一个可用的令牌
    return this.getNextToken();
  }
  
  public markCurrentTokenFailed(): void {
    const currentToken = this.getCurrentToken();
    if (currentToken) {
      this.markTokenFailed(currentToken);
    }
  }
  
  // 设置本地token（开发环境使用）
  public setLocalToken(token: string): void {
    if (typeof localStorage !== 'undefined') {
      if (!token || token.trim().length === 0) {
        localStorage.removeItem('GITHUB_PAT');
        logger.info('已移除本地GitHub token');
      } else {
        localStorage.setItem('GITHUB_PAT', token.trim());
        logger.info('已设置本地GitHub token');
      }
      this.loadTokensFromEnv();
    }
  }
  
  // 获取GitHub PAT并标记使用
  public getGitHubPAT(): string {
    const token = this.getCurrentToken();
    if (token) {
      this.markTokenUsed(token);
    }
    return token;
  }
  
  // 处理API错误
  public handleApiError(error: Response): void {
    // 如果是授权问题，标记当前令牌为失败并尝试使用下一个
    if (error.status === 401 || error.status === 403) {
      const currentToken = this.getCurrentToken();
      if (currentToken) {
        logger.warn(`令牌认证失败，尝试使用下一个令牌`);
        this.markTokenFailed(currentToken);
      }
    }
    
    // 如果是速率限制问题，也轮换令牌
    if (error.status === 429) {
      const currentToken = this.getCurrentToken();
      if (currentToken) {
        logger.warn(`令牌请求频率限制，尝试使用下一个令牌`);
        this.getNextToken();
      }
    }
    
    // 处理400错误(Bad Request)
    if (error.status === 400) {
      const currentToken = this.getCurrentToken();
      if (currentToken) {
        logger.warn(`发生400错误(Bad Request)，可能是请求格式问题或Token权限不足，尝试使用下一个令牌`);
        this.getNextToken();
      }
      
      // 尝试获取并记录错误详情以便调试
      error.clone().text().then(errorText => {
        try {
          const errorJson = JSON.parse(errorText);
          logger.error(`GitHub API 400错误详情: ${JSON.stringify(errorJson)}`);
          
          // 检查是否有具体错误消息
          if (errorJson.message) {
            logger.error(`错误消息: ${errorJson.message}`);
          }
          
          // 检查是否是验证错误
          if (errorJson.errors && Array.isArray(errorJson.errors)) {
            errorJson.errors.forEach((err: any, index: number) => {
              logger.error(`详细错误 #${index + 1}: ${JSON.stringify(err)}`);
            });
          }
        } catch (e) {
          // 如果不是JSON格式，直接记录原始文本
          logger.error(`GitHub API 400错误详情 (非JSON格式): ${errorText}`);
        }
      }).catch(e => {
        logger.error('无法解析400错误响应内容:', e);
      });
    }
  }
}