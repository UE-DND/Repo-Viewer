import { logger } from '@/utils';
import { getGithubConfig, getRuntimeConfig } from '@/config';
import { getCurrentBranch } from '../core/Config';
import { getForceServerProxy } from '../config/ProxyForceManager';

const githubConfig = getGithubConfig();
const runtimeConfig = getRuntimeConfig();

function shouldEncodePart(part: string): boolean {
  return /[\u4e00-\u9fa5]|[^\w\-\.]/g.test(part);
}

function isGithubHost(hostname: string): boolean {
  return /(^|\.)githubusercontent\.com$|(^|\.)github\.com$|^raw\.githubusercontent\.com$|(^|\.)user-images\.githubusercontent\.com$/u.test(hostname);
}

function applyProxyToUrl(url: string, proxyUrl: string): string {
  const trimmedProxyUrl = proxyUrl.trim();
  if (trimmedProxyUrl === '') {
    return url;
  }

  try {
    let processedUrl = url;

    try {
      const decodedUrl = decodeURIComponent(url);
      if (decodedUrl === url) {
        const needsEncoding = /[\u4e00-\u9fa5]|[^\w\-\.\/:]/g.test(url);
        if (needsEncoding) {
          const urlParts = url.split('/');
          if (urlParts.length >= 3) {
            const protocol = urlParts[0] ?? '';
            const domain = urlParts[2] ?? '';
            if (protocol !== '' && domain !== '') {
              const pathParts = urlParts.slice(3).map(part => (shouldEncodePart(part) ? encodeURIComponent(part) : part));
              processedUrl = `${protocol}//${domain}/${pathParts.join('/')}`;
              logger.debug('编码后的URL:', processedUrl);
            }
          }
        }
      }
    } catch (error) {
      logger.debug('URL 解码失败，保持原始URL:', url, error);
    }

    if (trimmedProxyUrl.includes('?url=')) {
      return `${trimmedProxyUrl}${encodeURIComponent(processedUrl)}`;
    }

    if (trimmedProxyUrl.includes('staticdn')) {
      if (processedUrl.includes('raw.githubusercontent.com')) {
        const [, rawPath] = processedUrl.split('raw.githubusercontent.com/');
        if (typeof rawPath === 'string' && rawPath !== '') {
          return `${trimmedProxyUrl}/${rawPath}`;
        }
      }
      return processedUrl;
    }

    return `${trimmedProxyUrl}/${processedUrl.replace(/^https?:\/\//u, '')}`;
  } catch (error) {
    logger.error('应用代理到URL失败:', error);
    return url;
  }
}

function transformImageUrl(
  src: string | undefined,
  markdownFilePath: string,
  useTokenMode: boolean,
  getProxiedUrlSync: (url: string) => string
): string | undefined {
  if (src === undefined || src === '') {
    return undefined;
  }

  try {
    logger.debug('转换前图片URL:', src);
    logger.debug('Markdown文件路径:', markdownFilePath);

    if (getForceServerProxy() && src.startsWith('http')) {
      try {
        const host = new URL(src).hostname;
        if (!isGithubHost(host)) {
          logger.debug('强制模式下的非GitHub域名，直接返回原URL:', src);
          return src;
        }
      } catch (_error) {
        logger.warn('强制模式解析URL失败，按GitHub域名处理');
      }

      const proxyUrl = `/api/github?action=getFileContent&url=${encodeURIComponent(src)}`;
      logger.debug('使用服务端API代理:', proxyUrl);
      return proxyUrl;
    }

    if (src.startsWith('http')) {
      try {
        const host = new URL(src).hostname;
        if (!isGithubHost(host)) {
          return src;
        }
      } catch (_error) {
        logger.warn('解析图片URL主机失败，按原逻辑处理');
      }

      if (useTokenMode || !runtimeConfig.isDev) {
        const proxyUrl = getProxiedUrlSync(src);
        logger.debug('绝对URL使用代理:', proxyUrl);
        return proxyUrl;
      }
      logger.debug('直接使用绝对URL:', src);
      return src;
    }

    const dirPath = getDirectoryPath(markdownFilePath);
    logger.debug('Markdown目录路径:', dirPath);

    let fullPath: string;

    if (src.startsWith('./')) {
      fullPath = `${dirPath}/${src.substring(2)}`;
      logger.debug('当前目录相对路径 (./):', fullPath);
    } else if (src.startsWith('../')) {
      const pathSegments = dirPath === '' ? [] : dirPath.split('/');
      let parentDirCount = 0;
      let remainingSrc = src;

      while (remainingSrc.startsWith('../')) {
        parentDirCount += 1;
        remainingSrc = remainingSrc.substring(3);
      }

      const newPathLength = Math.max(0, pathSegments.length - parentDirCount);
      const newBasePath = pathSegments.slice(0, newPathLength).join('/');
      fullPath = newBasePath === '' ? remainingSrc : `${newBasePath}/${remainingSrc}`;
      logger.debug('上级目录相对路径 (../):', fullPath);
    } else if (src.startsWith('/')) {
      fullPath = src.substring(1);
      logger.debug('根目录绝对路径 (/):', fullPath);
    } else {
      fullPath = dirPath === '' ? src : `${dirPath}/${src}`;
      logger.debug('当前目录相对路径(无前缀):', fullPath);
    }

    fullPath = fullPath.replace(/\/+/gu, '/').replace(/^\/+/u, '');

    let repoOwner = githubConfig.repoOwner;
    let repoName = githubConfig.repoName;

    if (markdownFilePath.includes('github.com')) {
      const urlMatch = /github\.com\/([^\/]+)\/([^\/]+)/u.exec(markdownFilePath);
      if (urlMatch !== null) {
        const ownerMatch = urlMatch[1];
        const repoMatch = urlMatch[2];
        if (ownerMatch !== undefined && ownerMatch !== '' && repoMatch !== undefined && repoMatch !== '') {
          repoOwner = ownerMatch;
          repoName = repoMatch;
          logger.debug('从URL提取的仓库信息:', `${repoOwner}/${repoName}`);
        } else {
          logger.warn('从URL提取仓库信息失败，缺少仓库信息，使用默认值');
        }
      } else {
        logger.warn('从URL提取仓库信息失败，使用默认值');
      }
    }

    const branch = getCurrentBranch();
    const rawUrl = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/${branch}/${fullPath}`;
    logger.debug('构建的原始URL:', rawUrl);

    if (useTokenMode || !runtimeConfig.isDev) {
      const proxyUrl = getProxiedUrlSync(rawUrl);
      logger.debug('返回代理URL:', proxyUrl);
      return proxyUrl;
    }

    logger.debug('返回原始URL:', rawUrl);
    return rawUrl;
  } catch (error) {
    logger.error('转换图片URL失败:', error);
    return src;
  }
}

function getDirectoryPath(filePath: string): string {
  const lastSlashIndex = filePath.lastIndexOf('/');
  if (lastSlashIndex === -1) {
    return '';
  }
  return filePath.substring(0, lastSlashIndex);
}

export const ProxyUrlTransformer = {
  applyProxyToUrl,
  transformImageUrl
};
