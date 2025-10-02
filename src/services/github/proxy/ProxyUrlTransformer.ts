import { logger } from '@/utils';
import { getGithubConfig, getRuntimeConfig } from '@/config';
import { getForceServerProxy } from '../config/ProxyForceManager';

const githubConfig = getGithubConfig();
const runtimeConfig = getRuntimeConfig();

/**
 * 代理URL转换工具类
 * 负责URL编码、代理应用和图片URL转换等功能
 */
export class ProxyUrlTransformer {
  /**
   * 应用代理到URL
   * @param url 原始URL
   * @param proxyUrl 代理服务URL
   * @returns 代理后的URL
   */
  public static applyProxyToUrl(url: string, proxyUrl: string): string {
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

  /**
   * 转换相对图片URL为绝对URL
   * @param src 图片源URL
   * @param markdownFilePath Markdown文件路径
   * @param useTokenMode 是否使用令牌模式
   * @returns 转换后的URL
   */
  public static transformImageUrl(
    src: string | undefined,
    markdownFilePath: string,
    useTokenMode: boolean,
    getProxiedUrlSync: (url: string) => string
  ): string | undefined {
    if (!src) return undefined;

    try {
      // 添加调试日志
      logger.debug('转换前图片URL:', src);
      logger.debug('Markdown文件路径:', markdownFilePath);

      // 判断是否是非开发环境或启用了令牌模式
      if (getForceServerProxy() && src.startsWith('http')) {
        // 生产/强制模式：仅对 GitHub 相关域名走服务端API；第三方域名直接使用原URL
        try {
          const host = new URL(src).hostname;
          const isGithubHost = /(^|\.)githubusercontent\.com$|(^|\.)github\.com$|^raw\.githubusercontent\.com$|(^|\.)user-images\.githubusercontent\.com$/.test(host);
          if (!isGithubHost) {
            logger.debug('强制模式下的非GitHub域名，直接返回原URL:', src);
            return src;
          }
        } catch (e) {
          logger.warn('强制模式解析URL失败，按GitHub域名处理:', e);
        }

        // 通过服务端API代理（仅GitHub域名）
        const proxyUrl = `/api/github?action=getFileContent&url=${encodeURIComponent(src)}`;
        logger.debug('使用服务端API代理:', proxyUrl);
        return proxyUrl;
      }

      // --- 以下仅在开发环境或未强制使用代理时生效 ---

      if (src.startsWith('http')) {
        // 绝对URL
        try {
          const host = new URL(src).hostname;
          const isGithubHost = /(^|\.)githubusercontent\.com$|(^|\.)github\.com$|^raw\.githubusercontent\.com$|(^|\.)user-images\.githubusercontent\.com$/.test(host);
          if (!isGithubHost) {
            return src;
          }
        } catch (e) {
          logger.warn('解析图片URL主机失败，按原逻辑处理:', e);
        }

        // 对 GitHub 相关域名在生产或启用令牌模式时走代理
        if (useTokenMode || !runtimeConfig.isDev) {
          const proxyUrl = getProxiedUrlSync(src);
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

      // 获取仓库信息 - 使用统一配置
      // 尝试从markdownFilePath中提取仓库信息
      let repoOwner = githubConfig.repoOwner;
      let repoName = githubConfig.repoName;

      // 检查markdownFilePath是否包含完整的GitHub URL
      if (markdownFilePath.includes('github.com')) {
        try {
          // 尝试从URL中提取仓库信息
          const urlMatch = markdownFilePath.match(/github\.com\/([^\/]+)\/([^\/]+)/);
          if (urlMatch && urlMatch.length >= 3) {
            // 使用URL中的仓库信息
            repoOwner = urlMatch[1]!;
            repoName = urlMatch[2]!;
            logger.debug('从URL提取的仓库信息:', `${repoOwner}/${repoName}`);
          }
        } catch (e) {
          logger.warn('从URL提取仓库信息失败，使用默认值');
        }
      }

      // 构建GitHub原始URL
      const branch = githubConfig.repoBranch;
      const rawUrl = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/${branch}/${fullPath}`;
      logger.debug('构建的原始URL:', rawUrl);

      // 是否使用代理
      if (useTokenMode || !runtimeConfig.isDev) {
        const proxyUrl = getProxiedUrlSync(rawUrl);
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

  /**
   * 计算目录路径
   * @param filePath 文件路径
   * @returns 目录路径
   */
  private static getDirectoryPath(filePath: string): string {
    const lastSlashIndex = filePath.lastIndexOf('/');
    if (lastSlashIndex === -1) return '';
    return filePath.substring(0, lastSlashIndex);
  }
}
