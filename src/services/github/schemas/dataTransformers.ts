import { GitHubContent } from '@/types';
import type { 
  GitHubContentItem, 
  GitHubContentsResponse, 
  GitHubSearchCodeItem, 
  GitHubSearchResponse 
} from './apiSchemas';

/**
 * 将GitHub API的内容项转换为内部GitHubContent模型
 */
export function transformGitHubContentItem(apiItem: GitHubContentItem): GitHubContent {
  const result: GitHubContent = {
    name: apiItem.name,
    path: apiItem.path,
    type: apiItem.type,
    sha: apiItem.sha,
    download_url: apiItem.download_url,
  };

  // 只有当值存在时才添加可选属性
  if (apiItem.size !== undefined) {
    result.size = apiItem.size;
  }
  
  if (apiItem.url) {
    result.url = apiItem.url;
  }
  
  if (apiItem.html_url) {
    result.html_url = apiItem.html_url;
  }
  
  if (apiItem.git_url) {
    result.git_url = apiItem.git_url;
  }
  
  if (apiItem._links) {
    result._links = {
      self: apiItem._links.self,
      git: apiItem._links.git,
      html: apiItem._links.html,
    };
  }

  return result;
}

/**
 * 将GitHub API的内容响应转换为内部GitHubContent数组
 */
export function transformGitHubContentsResponse(apiResponse: GitHubContentsResponse): GitHubContent[] {
  // 如果是单个文件，包装成数组
  if (!Array.isArray(apiResponse)) {
    return [transformGitHubContentItem(apiResponse)];
  }
  
  // 如果是数组，逐个转换
  return apiResponse.map(transformGitHubContentItem);
}

/**
 * 将GitHub搜索结果的代码项转换为内部GitHubContent模型
 */
export function transformGitHubSearchCodeItem(searchItem: GitHubSearchCodeItem): GitHubContent {
  const result: GitHubContent = {
    name: searchItem.name,
    path: searchItem.path,
    type: 'file', // 搜索结果通常都是文件
    sha: searchItem.sha,
    download_url: null, // 搜索结果不直接提供下载链接
  };

  // 只有当值存在时才添加可选属性
  if (searchItem.file_size !== undefined) {
    result.size = searchItem.file_size;
  }
  
  if (searchItem.url) {
    result.url = searchItem.url;
  }
  
  if (searchItem.html_url) {
    result.html_url = searchItem.html_url;
  }
  
  if (searchItem.git_url) {
    result.git_url = searchItem.git_url;
  }

  return result;
}

/**
 * 将GitHub搜索响应转换为内部GitHubContent数组
 */
export function transformGitHubSearchResponse(searchResponse: GitHubSearchResponse): GitHubContent[] {
  return searchResponse.items.map(transformGitHubSearchCodeItem);
}

/**
 * 确保GitHubContent数组的排序（目录优先，然后按名称排序）
 */
export function sortGitHubContents(contents: GitHubContent[]): GitHubContent[] {
  return [...contents].sort((a, b) => {
    // 目录优先
    if (a.type !== b.type) {
      return a.type === 'dir' ? -1 : 1;
    }
    // 同类型按名称排序
    return a.name.localeCompare(b.name, undefined, { 
      numeric: true, 
      sensitivity: 'base' 
    });
  });
}

/**
 * 过滤和标准化GitHub内容
 */
export function filterAndNormalizeGitHubContents(
  contents: GitHubContent[],
  options: {
    excludeHidden?: boolean;
    excludeFiles?: string[];
    includeOnlyTypes?: ('file' | 'dir')[];
  } = {}
): GitHubContent[] {
  const {
    excludeHidden = true,
    excludeFiles = [],
    includeOnlyTypes
  } = options;

  let filtered = contents;

  // 排除隐藏文件
  if (excludeHidden) {
    filtered = filtered.filter(item => !item.name.startsWith('.'));
  }

  // 排除指定文件
  if (excludeFiles.length > 0) {
    filtered = filtered.filter(item => !excludeFiles.includes(item.name));
  }

  // 只包含指定类型
  if (includeOnlyTypes && includeOnlyTypes.length > 0) {
    filtered = filtered.filter(item => includeOnlyTypes.includes(item.type));
  }

  return sortGitHubContents(filtered);
}

/**
 * 验证GitHub内容项的完整性
 */
export function validateGitHubContentItem(item: GitHubContent): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!item.name || typeof item.name !== 'string') {
    errors.push('缺少有效的name字段');
  }

  if (!item.path || typeof item.path !== 'string') {
    errors.push('缺少有效的path字段');
  }

  if (!item.type || !['file', 'dir'].includes(item.type)) {
    errors.push('缺少有效的type字段');
  }

  if (!item.sha || typeof item.sha !== 'string') {
    errors.push('缺少有效的sha字段');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 批量验证GitHub内容数组
 */
export function validateGitHubContentsArray(contents: GitHubContent[]): {
  isValid: boolean;
  invalidItems: Array<{ index: number; item: GitHubContent; errors: string[] }>;
} {
  const invalidItems: Array<{ index: number; item: GitHubContent; errors: string[] }> = [];

  contents.forEach((item, index) => {
    const validation = validateGitHubContentItem(item);
    if (!validation.isValid) {
      invalidItems.push({
        index,
        item,
        errors: validation.errors
      });
    }
  });

  return {
    isValid: invalidItems.length === 0,
    invalidItems
  };
}