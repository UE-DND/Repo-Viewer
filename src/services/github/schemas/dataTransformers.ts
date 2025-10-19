import type { GitHubContent } from '@/types';
import type {
  GitHubContentItem,
  GitHubContentsResponse,
  GitHubSearchCodeItem,
  GitHubSearchResponse
} from './apiSchemas';

/**
 * 转换GitHub API内容项
 * 
 * 将GitHub API响应的内容项转换为内部GitHubContent模型。
 * 
 * @param apiItem - GitHub API内容项
 * @returns 转换后的GitHubContent对象
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

  // 这些字段在API schema中是必需的
  result.url = apiItem.url;
  result.html_url = apiItem.html_url;
  result.git_url = apiItem.git_url;

  if (apiItem._links !== undefined) {
    result._links = {
      self: apiItem._links.self,
      git: apiItem._links.git,
      html: apiItem._links.html,
    };
  }

  return result;
}

/**
 * 转换GitHub API内容响应
 * 
 * 将GitHub API的目录内容响应转换为GitHubContent数组。
 * 
 * @param apiResponse - GitHub API内容响应（可能是单个对象或数组）
 * @returns GitHubContent数组
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
 * 转换GitHub搜索代码项
 * 
 * 将GitHub Code Search API的搜索结果项转换为GitHubContent模型。
 * 
 * @param searchItem - GitHub搜索代码项
 * @returns 转换后的GitHubContent对象
 */
export function transformGitHubSearchCodeItem(searchItem: GitHubSearchCodeItem): GitHubContent {
  const result: GitHubContent = {
    name: searchItem.name,
    path: searchItem.path,
    type: 'file',
    sha: searchItem.sha,
    download_url: null,
  };

  // 只有当值存在时才添加可选属性
  if (searchItem.file_size !== undefined) {
    result.size = searchItem.file_size;
  }

  result.url = searchItem.url;
  result.html_url = searchItem.html_url;
  result.git_url = searchItem.git_url;

  return result;
}

/**
 * 转换GitHub搜索响应
 * 
 * 将GitHub Code Search API的响应转换为GitHubContent数组。
 * 
 * @param searchResponse - GitHub搜索响应
 * @returns GitHubContent数组
 */
export function transformGitHubSearchResponse(searchResponse: GitHubSearchResponse): GitHubContent[] {
  return searchResponse.items.map(transformGitHubSearchCodeItem);
}

/**
 * 排序GitHub内容数组
 * 
 * 目录优先排序，同类型按名称排序（支持数字排序）。
 * 
 * @param contents - GitHub内容数组
 * @returns 排序后的GitHubContent数组
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
 * 
 * 根据选项过滤隐藏文件、特定文件和类型，并对结果进行排序。
 * 
 * @param contents - GitHub内容数组
 * @param options - 过滤选项
 * @param options.excludeHidden - 是否排除隐藏文件
 * @param options.excludeFiles - 要排除的文件名列表
 * @param options.includeOnlyTypes - 只包含的类型列表
 * @returns 过滤和排序后的GitHubContent数组
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
  if (includeOnlyTypes !== undefined && includeOnlyTypes.length > 0) {
    filtered = filtered.filter(item => includeOnlyTypes.includes(item.type));
  }

  return sortGitHubContents(filtered);
}

/**
 * 验证GitHub内容项的完整性
 * 
 * 检查必需字段是否存在且有效。
 * 
 * @param item - GitHub内容项
 * @returns 包含验证结果和错误列表的对象
 */
export function validateGitHubContentItem(item: GitHubContent): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (item.name === '' || typeof item.name !== 'string') {
    errors.push('缺少有效的name字段');
  }

  if (item.path === '' || typeof item.path !== 'string') {
    errors.push('缺少有效的path字段');
  }

  if (!['file', 'dir'].includes(item.type)) {
    errors.push('缺少有效的type字段');
  }

  if (item.sha === '' || typeof item.sha !== 'string') {
    errors.push('缺少有效的sha字段');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 批量验证GitHub内容数组
 * 
 * 验证数组中每个内容项的完整性。
 * 
 * @param contents - GitHub内容数组
 * @returns 包含验证结果和无效项列表的对象
 */
export function validateGitHubContentsArray(contents: GitHubContent[]): {
  isValid: boolean;
  invalidItems: { index: number; item: GitHubContent; errors: string[] }[];
} {
  const invalidItems: { index: number; item: GitHubContent; errors: string[] }[] = [];

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
