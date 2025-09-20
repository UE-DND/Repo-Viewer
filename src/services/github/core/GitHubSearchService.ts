import axios from 'axios';
import { GitHubContent } from '../../../types';
import { logger } from '../../../utils';
import { RequestBatcher } from '../RequestBatcher';
import { GitHubAuth } from './GitHubAuth';
import { 
  GITHUB_API_BASE,
  GITHUB_REPO_OWNER,
  GITHUB_REPO_NAME
} from './GitHubConfig';
import { shouldUseServerAPI } from '../config/ProxyForceManager';
import { safeValidateGitHubSearchResponse } from '../schemas/apiSchemas';
import { 
  transformGitHubSearchResponse,
  filterAndNormalizeGitHubContents
} from '../schemas/dataTransformers';

export class GitHubSearchService {
  private static readonly batcher = new RequestBatcher();

  // 使用GitHub API进行搜索
  public static async searchWithGitHubApi(
    searchTerm: string,
    currentPath: string = '',
    fileTypeFilter?: string
  ): Promise<GitHubContent[]> {
    try {
      // 构建搜索查询
      let query = `repo:${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME} ${searchTerm}`;

      // 如果提供了当前路径，则限制搜索范围
      if (currentPath && currentPath !== '/') {
        query += ` path:${currentPath}`;
      }

      // 如果提供了文件类型过滤器，则限制文件类型
      if (fileTypeFilter) {
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
        const response = await this.batcher.enqueue(fetchUrl, async () => {
          logger.debug(`搜索API请求: ${fetchUrl}`);
          const result = await fetch(fetchUrl, {
            method: 'GET',
            headers: GitHubAuth.getAuthHeaders()
          });

          if (!result.ok) {
            throw GitHubAuth.handleApiError(result, fetchUrl, 'GET');
          }

          return result.json();
        }, {
          priority: 'medium', // 搜索请求中等优先级
          method: 'GET',
          headers: GitHubAuth.getAuthHeaders() as Record<string, string>
        });

        rawSearchResults = response;
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
      const results = filterAndNormalizeGitHubContents(searchContents, {
        excludeHidden: false, // 搜索结果可能包含隐藏文件
        includeOnlyTypes: ['file'] // 搜索结果通常只包含文件
      });

      return results;
    } catch (error: any) {
      logger.error(`搜索失败: ${searchTerm}`, error);
      throw new Error(`搜索失败: ${error.message}`);
    }
  }

  // 搜索文件
  public static async searchFiles(
    searchTerm: string,
    currentPath: string = '',
    recursive: boolean = false,
    fileTypeFilter?: string
  ): Promise<GitHubContent[]> {
    if (!searchTerm.trim()) {
      return [];
    }

    try {
      // 动态导入避免循环依赖
      const { GitHubContentService } = await import('./GitHubContentService');
      
      // 首先获取当前目录的内容
      const contents = await GitHubContentService.getContents(currentPath);

      // 过滤匹配的文件 - 严格只匹配文件名
      const normalizedSearchTerm = searchTerm.trim().toLowerCase();
      let results: GitHubContent[] = [];

      // 处理当前目录中的匹配项
      results = contents.filter((item: GitHubContent) => {
        // 如果指定了文件类型过滤，则只匹配特定类型的文件
        if (fileTypeFilter && item.type === 'file') {
          const extension = item.name.split('.').pop()?.toLowerCase();
          if (!extension || extension !== fileTypeFilter.toLowerCase()) {
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
          logger.debug(`并行搜索 ${directories.length} 个子目录（无深度限制）`);

          // 创建所有子目录搜索的Promise数组
          const searchPromises = directories.map((dir: GitHubContent) =>
            this.searchFiles(
              searchTerm,
              dir.path,
              true,
              fileTypeFilter
            ).catch(error => {
              // 捕获单个目录搜索失败，但不影响其他目录
              logger.warn(`搜索目录 ${dir.path} 失败: ${error.message}`);
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

      logger.debug(`搜索结果: 找到 ${results.length} 个匹配项（仅匹配文件名）`);
      return results;
    } catch (error: any) {
      logger.error(`搜索文件失败: ${error.message}`);
      throw new Error(`搜索文件失败: ${error.message}`);
    }
  }
}