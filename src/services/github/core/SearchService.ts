import axios from 'axios';
import type { GitHubContent } from '@/types';
import { logger } from '@/utils';
import { RequestBatcher } from '../RequestBatcher';
import { getAuthHeaders } from './Auth';
import {
  GITHUB_API_BASE,
  GITHUB_REPO_OWNER,
  GITHUB_REPO_NAME
} from './Config';
import { shouldUseServerAPI } from '../config/ProxyForceManager';
import { safeValidateGitHubSearchResponse } from '../schemas/apiSchemas';
import {
  transformGitHubSearchResponse,
  filterAndNormalizeGitHubContents
} from '../schemas/dataTransformers';

// GitHub搜索服务，使用模块导出
const batcher = new RequestBatcher();

/**
 * 使用GitHub API进行代码搜索
 * 
 * 通过GitHub Code Search API搜索仓库中的文件，支持路径和文件类型过滤。
 * 
 * @param searchTerm - 搜索关键词
 * @param currentPath - 限制搜索的路径范围，默认为空（搜索整个仓库）
 * @param fileTypeFilter - 文件扩展名过滤器，例如'ts'、'md'
 * @returns Promise，解析为匹配的GitHub内容数组
 * @throws 当API请求失败或响应格式错误时抛出错误
 */
export async function searchWithGitHubApi(
  searchTerm: string,
  currentPath = '',
  fileTypeFilter?: string
): Promise<GitHubContent[]> {
    try {
      const trimmedTerm = searchTerm.trim();
      const safeTerm = trimmedTerm.replace(/"/g, '');
      const keyword = /\s/.test(safeTerm) ? `"${safeTerm}"` : safeTerm;

      // 构建搜索查询，仅匹配文件路径/文件名，避免搜索文件内容
      let query = `repo:${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME} ${keyword} in:path`;
      
      // 注意：GitHub Code Search API 会搜索所有分支，分支过滤需在结果中处理

      // 如果提供了当前路径，则限制搜索范围
      if (currentPath !== '' && currentPath !== '/') {
        query += ` path:${currentPath}`;
      }

      // 如果提供了文件类型过滤器，则限制文件类型
      if (fileTypeFilter !== undefined && fileTypeFilter !== '') {
        query += ` extension:${fileTypeFilter}`;
      }

    let rawSearchResults: unknown;

    if (shouldUseServerAPI()) {
        // 使用服务端API执行搜索
        const response = await axios.get(`/api/github?action=search&q=${encodeURIComponent(query)}`);
        rawSearchResults = response.data;
        logger.debug(`通过服务端API搜索: ${query}`);
      } else {
        // 原始搜索代码
        const apiUrl = `${GITHUB_API_BASE}/search/code`;
        const urlWithParams = new URL(apiUrl);
        urlWithParams.searchParams.append('q', query);
        urlWithParams.searchParams.append('per_page', '100'); // 最大结果数

        // 使用增强批处理器处理请求
        const fetchUrl = urlWithParams.toString();
        rawSearchResults = await batcher.enqueue(fetchUrl, async () => {
          logger.debug(`搜索API请求: ${fetchUrl}`);
          const result = await fetch(fetchUrl, {
            method: 'GET',
            headers: getAuthHeaders()
          });

          if (!result.ok) {
            const error = new Error(`HTTP ${result.status.toString()}: ${result.statusText}`);
            throw error;
          }

          return result.json() as Promise<unknown>;
        }, {
          priority: 'medium', // 搜索请求中等优先级
          method: 'GET',
          headers: getAuthHeaders() as Record<string, string>
        });
        logger.debug(`直接请求GitHub API搜索: ${query}`);
      }

      // 验证搜索结果
      const validation = safeValidateGitHubSearchResponse(rawSearchResults);
      if (!validation.success) {
        logger.error(`搜索API响应验证失败: ${query}`, validation.error);
        throw new Error(`搜索响应格式错误: ${validation.error}`);
      }

      // 转换搜索结果为内部模型
      const searchContents = transformGitHubSearchResponse(validation.data);

      // 过滤和标准化搜索结果
      return filterAndNormalizeGitHubContents(searchContents, {
        excludeHidden: false, // 搜索结果可能包含隐藏文件
        includeOnlyTypes: ['file'] // 搜索结果通常只包含文件
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      logger.error(`搜索失败: ${searchTerm}`, error);
      throw new Error(`搜索失败: ${errorMessage}`);
    }
}

/**
 * 在本地内容中搜索文件
 * 
 * 递归搜索指定路径下的文件，支持文件名模糊匹配和文件类型过滤。
 * 使用并行搜索策略提升性能。
 * 
 * @param searchTerm - 搜索关键词（匹配文件名）
 * @param currentPath - 起始搜索路径，默认为空（从根目录开始）
 * @param recursive - 是否递归搜索子目录，默认为false
 * @param fileTypeFilter - 文件扩展名过滤器
 * @returns Promise，解析为匹配的文件数组
 * @throws 当获取目录内容失败时抛出错误
 */
export async function searchFiles(
  searchTerm: string,
  currentPath = '',
  recursive = false,
  fileTypeFilter?: string
): Promise<GitHubContent[]> {
    if (searchTerm.trim() === '') {
      return [];
    }

    try {
      // 动态导入避免循环依赖
      const { getContents } = await import('./ContentService');

      // 首先获取当前目录的内容
      const contents = await getContents(currentPath);

      // 过滤匹配的文件 - 严格只匹配文件名
      const normalizedSearchTerm = searchTerm.trim().toLowerCase();
      let results: GitHubContent[] = [];

      // 处理当前目录中的匹配项
      results = contents.filter((item: GitHubContent) => {
        // 如果指定了文件类型过滤，则只匹配特定类型的文件
        if (fileTypeFilter !== undefined && fileTypeFilter !== '' && item.type === 'file') {
          const extension = item.name.split('.').pop()?.toLowerCase();
          if (extension === undefined || extension === '' || extension !== fileTypeFilter.toLowerCase()) {
            return false;
          }
        }

        // 仅匹配文件名本身，不匹配路径
        const fileName = item.name.toLowerCase();
        return fileName.includes(normalizedSearchTerm);
      });

      // 如果需要递归搜索子目录（无深度限制）
      if (recursive) {
        const directories = contents.filter((item: GitHubContent) => item.type === 'dir');

        // 并行搜索子目录，而不是串行处理
        if (directories.length > 0) {
          logger.debug(`并行搜索 ${directories.length.toString()} 个子目录（无深度限制）`);

          // 创建所有子目录搜索的Promise数组
          const searchPromises = directories.map((dir: GitHubContent) =>
            searchFiles(
              searchTerm,
              dir.path,
              true,
              fileTypeFilter
            ).catch((error: unknown) => {
              // 捕获单个目录搜索失败，但不影响其他目录
              const errorMessage = error instanceof Error ? error.message : '未知错误';
              logger.warn(`搜索目录 ${dir.path} 失败: ${errorMessage}`);
              return [] as GitHubContent[];
            })
          );

          // 并行执行所有搜索请求
          const subResults = await Promise.all(searchPromises);

          // 合并所有子目录结果
          for (const items of subResults) {
            results = [...results, ...items];
          }
        }
      }

      logger.debug(`搜索结果: 找到 ${results.length.toString()} 个匹配项（仅匹配文件名）`);
      return results;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      logger.error(`搜索文件失败: ${errorMessage}`);
      throw new Error(`搜索文件失败: ${errorMessage}`);
    }
}

/**
 * 使用 Git Trees API 搜索指定分支的文件
 * 
 * @param searchTerm - 搜索关键词
 * @param branch - 分支名称
 * @param pathPrefix - 路径前缀
 * @param fileTypeFilter - 文件扩展名过滤器
 * @returns Promise，解析为匹配的GitHub内容数组
 */
async function searchBranchWithTreesApi(
  searchTerm: string,
  branch: string,
  pathPrefix = '',
  fileTypeFilter?: string
): Promise<GitHubContent[]> {
  try {
    const apiUrl = `${GITHUB_API_BASE}/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/git/trees/${encodeURIComponent(branch)}?recursive=1`;
    
    let rawData: unknown;
    
    if (shouldUseServerAPI()) {
      const query = new URLSearchParams({
        action: 'getTree',
        branch,
        recursive: '1'
      });
      const response = await axios.get(`/api/github?${query.toString()}`);
      rawData = response.data;
    } else {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status.toString()}: ${response.statusText}`);
      }
      
      rawData = await response.json();
    }

    const tree = rawData as { tree?: Array<{ path?: string; type?: string; size?: number; url?: string; sha?: string }> };
    
    if (!Array.isArray(tree.tree)) {
      return [];
    }

    const normalizedSearchTerm = searchTerm.trim().toLowerCase();
    const normalizedPrefix = pathPrefix.trim().toLowerCase();
    
    const matchedFiles: GitHubContent[] = tree.tree
      .filter(item => {
        if (item.type !== 'blob') {
          return false;
        }
        
        const itemPath = item.path ?? '';
        const fileName = itemPath.includes('/') ? itemPath.slice(itemPath.lastIndexOf('/') + 1) : itemPath;
        
        // 文件名匹配
        if (!fileName.toLowerCase().includes(normalizedSearchTerm)) {
          return false;
        }
        
        // 路径前缀过滤
        if (normalizedPrefix.length > 0 && !itemPath.toLowerCase().startsWith(normalizedPrefix)) {
          return false;
        }
        
        // 扩展名过滤
        if (fileTypeFilter !== undefined && fileTypeFilter !== '') {
          const ext = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase() : '';
          if (ext !== fileTypeFilter.toLowerCase()) {
            return false;
          }
        }
        
        return true;
      })
      .map(item => {
        const itemPath = item.path ?? '';
        const fileName = itemPath.includes('/') ? itemPath.slice(itemPath.lastIndexOf('/') + 1) : itemPath;
        
        const result: GitHubContent = {
          name: fileName,
          path: itemPath,
          type: 'file' as const,
          sha: (item as { sha?: string }).sha ?? '',
          url: item.url ?? '',
          html_url: `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/blob/${branch}/${itemPath}`,
          download_url: `https://raw.githubusercontent.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/${branch}/${itemPath}`
        };
        
        if (item.size !== undefined) {
          result.size = item.size;
        }
        
        return result;
      });

    return matchedFiles;
  } catch (error: unknown) {
    logger.warn(`使用 Trees API 搜索分支 ${branch} 失败`, error);
    return [];
  }
}

/**
 * 使用 Trees API 进行多分支搜索
 * 
 * @param searchTerm - 搜索关键词
 * @param branches - 要搜索的分支列表
 * @param pathPrefix - 路径前缀
 * @param fileTypeFilter - 文件扩展名过滤器
 * @returns Promise，解析为所有分支的匹配结果
 */
export async function searchMultipleBranchesWithTreesApi(
  searchTerm: string,
  branches: string[],
  pathPrefix = '',
  fileTypeFilter?: string
): Promise<Array<{ branch: string; results: GitHubContent[] }>> {
  const searchPromises = branches.map(async (branch) => ({
    branch,
    results: await searchBranchWithTreesApi(searchTerm, branch, pathPrefix, fileTypeFilter)
  }));

  return Promise.all(searchPromises);
}

/**
 * GitHub搜索服务对象
 * 
 * 为了向后兼容性，导出包含所有搜索相关函数的常量对象。
 * 
 * @deprecated 推荐直接使用独立的导出函数
 */
export const GitHubSearchService = {
  searchWithGitHubApi,
  searchFiles,
  searchMultipleBranchesWithTreesApi
} as const;
