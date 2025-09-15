import { logger } from '../../utils';

// 是否使用服务端API（非开发环境）
const USE_SERVER_API = !import.meta.env.DEV;

// 模式设置
const USE_TOKEN_MODE = import.meta.env.VITE_USE_TOKEN_MODE === 'true';

// 强制使用服务端API代理所有请求
const FORCE_SERVER_PROXY = !import.meta.env.DEV || USE_TOKEN_MODE;

// 定义多个代理服务URL
const PROXY_SERVICES = [
  import.meta.env.VITE_IMAGE_PROXY_URL || 'https://gh-proxy.com', // 默认代理
  import.meta.env.VITE_IMAGE_PROXY_URL_BACKUP1 || 'https://ghproxy.com', // 备用代理1
  import.meta.env.VITE_IMAGE_PROXY_URL_BACKUP2 || 'https://raw.staticdn.net', // 备用代理2
];

// 记录失败的代理服务
const failedProxyServices = new Set<string>();

export class ProxyService {
  // 获取处理过的URL，解决CORS问题
  public static getProxiedUrl(url: string): string {
    if (!url) return '';
    
    // 如果是开发环境且未配置代理，则直接返回原始URL
    if (import.meta.env.DEV && !USE_TOKEN_MODE && !import.meta.env.IMAGE_PROXY_URL) {
      return url;
    }
    
    // 修改：优先使用服务端API代理
    if (FORCE_SERVER_PROXY) {
      // 通过服务端API代理请求
      return `/api/github?action=getFileContent&url=${encodeURIComponent(url)}`;
    }
    
    // 使用多代理服务机制
    // 过滤掉已知失败的代理
    const availableProxies = PROXY_SERVICES.filter(proxy => !failedProxyServices.has(proxy));
    
    // 如果所有代理都失败了，重置失败记录并重新尝试所有代理
    if (availableProxies.length === 0) {
      logger.warn('所有图片代理服务均已失败，重置并重试');
      failedProxyServices.clear();
      // 使用默认代理
      return this.applyProxyToUrl(url, PROXY_SERVICES[0]);
    }
    
    // 使用第一个可用的代理
    return this.applyProxyToUrl(url, availableProxies[0]);
  }
  
  // 应用代理到URL
  private static applyProxyToUrl(url: string, proxyUrl: string): string {
    if (!proxyUrl) return url;
    
    try {
      // 确保URL格式正确 - 处理中文和特殊字符
      let processedUrl = url;
      
      // 检查URL是否已经编码
      if (url !== decodeURIComponent(url)) {
        // URL已经编码，使用原始URL
        processedUrl = url;
      } else {
        // 检查URL是否包含中文或特殊字符
        const needsEncoding = /[\u4e00-\u9fa5]|[^\w\-\.\/\:]/g.test(url);
        if (needsEncoding) {
          // 拆分URL，只编码路径部分
          const urlParts = url.split('/');
          // 保留协议和域名部分
          const protocol = urlParts[0];
          const domain = urlParts[2];
          // 编码路径部分
          const pathParts = urlParts.slice(3).map(part => {
            // 对包含中文或特殊字符的部分进行编码
            return /[\u4e00-\u9fa5]|[^\w\-\.]/g.test(part) ? encodeURIComponent(part) : part;
          });
          
          // 重新组合URL
          processedUrl = `${protocol}//${domain}/${pathParts.join('/')}`;
          logger.debug('编码后的URL:', processedUrl);
        }
      }
      
      // 处理不同的代理服务格式
      if (proxyUrl.includes('?url=')) {
        // 已包含参数格式的代理
        return `${proxyUrl}${encodeURIComponent(processedUrl)}`;
      } else if (proxyUrl.includes('staticdn')) {
        // staticdn格式的代理
        // 仅支持raw.githubusercontent.com的URL
        if (processedUrl.includes('raw.githubusercontent.com')) {
          const parts = processedUrl.split('raw.githubusercontent.com/');
          if (parts.length > 1) {
            return `${proxyUrl}/${parts[1]}`;
          }
        }
        return processedUrl;
      } else {
        // 路径格式的代理
        return `${proxyUrl}/${processedUrl.replace(/^https?:\/\//, '')}`;
      }
    } catch (error) {
      logger.error('应用代理到URL失败:', error);
      return url;
    }
  }
  
  // 标记代理服务失败
  public static markProxyServiceFailed(proxyUrl: string): void {
    if (proxyUrl && !failedProxyServices.has(proxyUrl)) {
      logger.warn(`标记代理服务失败: ${proxyUrl}`);
      failedProxyServices.add(proxyUrl);
    }
  }
  
  // 获取当前使用的代理服务
  public static getCurrentProxyService(): string {
    const availableProxies = PROXY_SERVICES.filter(proxy => !failedProxyServices.has(proxy));
    return availableProxies.length > 0 ? availableProxies[0] : PROXY_SERVICES[0];
  }
  
  // 重置失败的代理服务记录
  public static resetFailedProxyServices(): void {
    failedProxyServices.clear();
    logger.info('已重置所有失败的代理服务记录');
  }
  
  // 转换相对图片URL为绝对URL
  public static transformImageUrl(src: string | undefined, markdownFilePath: string, useTokenMode: boolean): string | undefined {
    if (!src) return undefined;
    
    try {
      // 添加调试日志
      logger.debug('转换前图片URL:', src);
      logger.debug('Markdown文件路径:', markdownFilePath);
      
      // 判断是否是非开发环境或启用了令牌模式
      if (FORCE_SERVER_PROXY && src.startsWith('http')) {
        // 通过服务端API代理
        const proxyUrl = `/api/github?action=getFileContent&url=${encodeURIComponent(src)}`;
        logger.debug('使用服务端API代理:', proxyUrl);
        return proxyUrl;
      }
      
      // --- 以下仅在开发环境或未强制使用代理时生效 ---
      
      // 判断URL类型
      if (src.startsWith('http')) {
        // 绝对URL - 可能需要代理
        if (useTokenMode || !import.meta.env.DEV) {
          const proxyUrl = this.getProxiedUrl(src);
          logger.debug('绝对URL使用代理:', proxyUrl);
          return proxyUrl;
        }
        logger.debug('直接使用绝对URL:', src);
        return src;
      }
      
      // 处理相对URL
      // 获取Markdown文件所在的目录路径
      const dirPath = this.getDirectoryPath(markdownFilePath);
      logger.debug('Markdown目录路径:', dirPath);
    
      // 构建完整路径
      let fullPath = '';
      
      if (src.startsWith('./')) {
        // 当前目录相对路径
        fullPath = `${dirPath}/${src.substring(2)}`;
        logger.debug('当前目录相对路径 (./):', fullPath);
      } else if (src.startsWith('../')) {
        // 上级目录相对路径
        // 拆分目录路径
        const pathSegments = dirPath.split('/');
        
        // 计算../的数量
        let parentDirCount = 0;
        let remainingSrc = src;
      
        while (remainingSrc.startsWith('../')) {
          parentDirCount++;
          remainingSrc = remainingSrc.substring(3);
        }
      
        // 移除相应数量的路径段
        const newPathLength = Math.max(0, pathSegments.length - parentDirCount);
        const newBasePath = pathSegments.slice(0, newPathLength).join('/');
        
        // 构建新路径
        fullPath = `${newBasePath}/${remainingSrc}`;
        logger.debug('上级目录相对路径 (../):', fullPath);
      } else if (src.startsWith('/')) {
        // 根目录绝对路径 (对于这种情况，不需要添加当前目录)
        fullPath = src.substring(1); // 移除开头的/
        logger.debug('根目录绝对路径 (/):', fullPath);
      } else {
        // 当前目录相对路径(无./前缀)
        fullPath = `${dirPath}/${src}`;
        logger.debug('当前目录相对路径(无前缀):', fullPath);
      }
      
      // 规范化路径(删除多余的/)
      fullPath = fullPath.replace(/\/+/g, '/');
      
      // 移除开头的/
      if (fullPath.startsWith('/')) {
        fullPath = fullPath.substring(1);
      }
      
      // 获取仓库信息 - 确保使用.env中配置的仓库信息
      // 尝试从markdownFilePath中提取仓库信息
      let repoOwner = import.meta.env.VITE_GITHUB_REPO_OWNER || 'UE-DND';
      let repoName = import.meta.env.VITE_GITHUB_REPO_NAME || 'Repo-Viewer';
      
      // 检查markdownFilePath是否包含完整的GitHub URL
      if (markdownFilePath.includes('github.com')) {
        try {
          // 尝试从URL中提取仓库信息
          const urlMatch = markdownFilePath.match(/github\.com\/([^\/]+)\/([^\/]+)/);
          if (urlMatch && urlMatch.length >= 3) {
            // 使用URL中的仓库信息
            repoOwner = urlMatch[1];
            repoName = urlMatch[2];
            logger.debug('从URL提取的仓库信息:', `${repoOwner}/${repoName}`);
          }
        } catch (e) {
          logger.warn('从URL提取仓库信息失败，使用默认值');
        }
      }
      
      // 构建GitHub原始URL
      const branch = import.meta.env.VITE_GITHUB_REPO_BRANCH || 'main';
      const rawUrl = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/${branch}/${fullPath}`;
      logger.debug('构建的原始URL:', rawUrl);
    
      // 是否使用代理
      if (useTokenMode || !import.meta.env.DEV) {
        const proxyUrl = this.getProxiedUrl(rawUrl);
        logger.debug('返回代理URL:', proxyUrl);
        return proxyUrl;
      }
      
      logger.debug('返回原始URL:', rawUrl);
      return rawUrl;
    } catch (e) {
      logger.error('转换图片URL失败:', e);
      return src; // 失败时返回原URL
    }
  }
  
  // 计算目录路径
  private static getDirectoryPath(filePath: string): string {
    const lastSlashIndex = filePath.lastIndexOf('/');
    if (lastSlashIndex === -1) return '';
    return filePath.substring(0, lastSlashIndex);
  }
}