import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

// 配置常量
const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com';
// 添加代理服务配置
const OFFICE_PROXY_URL = process.env.OFFICE_PROXY_URL || '';

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
      const patKeys = envKeys.filter(key => 
        key.startsWith('GITHUB_PAT') && 
        process.env[key] && 
        process.env[key]!.length > 0
      );
      
      // 收集所有有效的PAT
      this.tokens = patKeys
        .map(key => process.env[key] as string)
        .filter(token => token && token.trim().length > 0);
      
      console.log(`已加载 ${this.tokens.length} 个GitHub令牌`);
    } catch (error) {
      console.error('加载GitHub token失败:', error);
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
      console.log(`令牌认证失败或达到限制，尝试轮换令牌...`);
      const currentToken = tokenManager.getCurrentToken();
      if (currentToken) {
        tokenManager.markTokenFailed(currentToken);
      }
      
      // 获取新令牌并重试
      const newToken = tokenManager.getNextToken();
      if (newToken && newToken !== currentToken) {
        console.log(`已轮换到新令牌`);
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
    
    if (!action) {
      return res.status(400).json({ error: '缺少action参数' });
    }
    
    // 获取配置信息 - 新增API
    if (action === 'getConfig') {
      return res.status(200).json({
        status: 'success',
        data: {
          officeProxyUrl: OFFICE_PROXY_URL || '',
          repoOwner: process.env.GITHUB_REPO_OWNER || '',
          repoName: process.env.GITHUB_REPO_NAME || '',
          repoBranch: process.env.GITHUB_REPO_BRANCH || 'main'
        }
      });
    }
    
    // 获取令牌状态 - 新增API
    if (action === 'getTokenStatus') {
      return res.status(200).json({
        status: 'success',
        data: tokenManager.getTokenStatus()
      });
    }
    
    // 获取仓库内容
    if (action === 'getContents') {
      if (path === undefined) {
        return res.status(400).json({ error: '缺少path参数' });
      }
      
      const repoOwner = process.env.GITHUB_REPO_OWNER;
      const repoName = process.env.GITHUB_REPO_NAME;
      const branch = process.env.GITHUB_REPO_BRANCH || 'main';
      
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
        console.error('GitHub API请求失败:', error.message);
        
        return res.status(error.response?.status || 500).json({ 
          error: '获取内容失败',
          message: error.message
        });
      }
    }
    
    // 获取文件内容
    if (action === 'getFileContent') {
      if (!url) {
        return res.status(400).json({ error: '缺少url参数' });
      }
      
      try {
        // 确保url是字符串类型
        const urlString = Array.isArray(url) ? url[0] : url;
        
        // 判断是否是二进制文件
        const isBinaryFile = urlString.match(/\.(png|jpg|jpeg|gif|pdf|docx|xlsx|pptx|zip|rar|7z|exe|dll|so|dylib|bin)$/i);
        
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
            axios.get(urlString as string, { 
              headers: getAuthHeaders(),
              responseType: 'arraybuffer'
            })
          );
          
          return res.status(200).send(response.data);
        } else {
          // 文本文件，使用默认响应类型
      const response = await handleRequestWithRetry(() => 
        axios.get(urlString as string, { 
          headers: getAuthHeaders() 
        })
      );
      
      return res.status(200).send(response.data);
        }
      } catch (error: any) {
        console.error('获取文件内容失败:', error.message);
        return res.status(error.response?.status || 500).json({ 
          error: '获取文件内容失败',
          message: error.message
        });
      }
    }
    
    // 获取最新提交信息
    if (action === 'getCommits') {
      try {
        // 使用固定的仓库路径，而不是环境变量
        const fixedRepoOwner = "UE-DND";
        const fixedRepoName = "Repo-Viewer";
        
        // 从请求参数中获取分支名称，如果没有则使用默认分支
        const branch = req.query.branch ? 
          (Array.isArray(req.query.branch) ? req.query.branch[0] : req.query.branch) : 
          "main";
        
        const apiUrl = `${GITHUB_API_BASE}/repos/${fixedRepoOwner}/${fixedRepoName}/commits/${branch}`;
        
        const response = await handleRequestWithRetry(() => 
          axios.get(apiUrl, { 
            headers: getAuthHeaders() 
          })
        );
        
        return res.status(200).json(response.data);
      } catch (error: any) {
        console.error('获取提交信息失败:', error.message);
        
        return res.status(error.response?.status || 500).json({ 
          error: '获取提交信息失败',
          message: error.message
        });
      }
    }
    
    // 搜索仓库
    if (action === 'search') {
      const { q, sort, order } = req.query;
      
      if (!q) {
        return res.status(400).json({ error: '缺少搜索参数' });
      }
      
      const repoOwner = process.env.GITHUB_REPO_OWNER;
      const repoName = process.env.GITHUB_REPO_NAME;
      const searchQuery = `repo:${repoOwner}/${repoName} ${q}`;
      
      const response = await handleRequestWithRetry(() => 
        axios.get(`${GITHUB_API_BASE}/search/code`, { 
          headers: getAuthHeaders(),
          params: {
            q: searchQuery,
            sort: sort || 'best-match',
            order: order || 'desc'
          }
        })
      );
      
      return res.status(200).json(response.data);
    }
    
    // 未知操作
    return res.status(400).json({ error: '不支持的操作' });
  } catch (error: any) {
    console.error('API请求处理错误:', error);
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