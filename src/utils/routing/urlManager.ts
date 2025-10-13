import { getCurrentBranch } from '@/services/github';
import { logger } from '../index';

/**
 * URL 参数键名 - 仅用于向后兼容
 */
export const URL_PARAMS = {
  PATH: 'path',
  PREVIEW: 'preview',
  BRANCH: 'branch',
} as const;

/**
 * 从 URL 解析路径参数
 * @returns 文件路径
 */
export function getPathFromUrl(): string {
  try {
    // 首先尝试从路径段获取
    let pathname = window.location.pathname;

    // 移除开头的斜杠
    if (pathname.startsWith('/')) {
      pathname = pathname.substring(1);
    }

    // 如果路径段不为空，直接返回解码后的路径
    if (pathname.length > 0 && pathname !== '/') {
      return decodeURIComponent(pathname);
    }

    // 向后兼容：如果路径段为空，尝试从查询参数获取
    const urlParams = new URLSearchParams(window.location.search);
    const path = urlParams.get(URL_PARAMS.PATH) ?? '';
    return decodeURIComponent(path);
  } catch (error) {
    logger.error('解析 URL 路径参数失败:', error);
    return '';
  }
}

/**
 * 从 URL 解析分支参数
 * @returns 分支名称
 */
export function getBranchFromUrl(): string {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const branchParam = urlParams.get(URL_PARAMS.BRANCH);

    if (branchParam !== null && branchParam.trim().length > 0) {
      return decodeURIComponent(branchParam);
    }

    const state = window.history.state as { branch?: string } | null;
    const stateBranch = state?.branch;

    if (typeof stateBranch === 'string' && stateBranch.trim().length > 0) {
      return stateBranch.trim();
    }

    return '';
  } catch (error) {
    logger.error('解析 URL 分支参数失败:', error);
    return '';
  }
}

/**
 * 从 URL 解析预览文件参数
 * @returns 预览文件名
 */
export function getPreviewFromUrl(): string {
  try {
    // 检查是否使用了查询参数格式的预览
    const urlParams = new URLSearchParams(window.location.search);
    const previewParam = urlParams.get(URL_PARAMS.PREVIEW);

    if (previewParam !== null) {
      return decodeURIComponent(previewParam);
    }

    // 如果没有查询参数，检查是否有 #preview 哈希标记
    const hash = window.location.hash;
    if (hash.length > 0 && hash.startsWith('#preview=')) {
      return decodeURIComponent(hash.substring('#preview='.length));
    }

    return '';
  } catch (error) {
    logger.error('解析 URL 预览参数失败:', error);
    return '';
  }
}

/**
 * 构建包含路径的 URL
 * @param path 文件路径
 * @param preview 预览文件路径（可选）
 * @returns 构建的 URL 字符串（不包含域名）
 */
export function buildUrlWithParams(path: string, preview?: string, branch?: string): string {
  // 将路径编码为 URL 路径段
  const encodedPath = path.length > 0 ? encodeURI(path) : '';

  // 基础 URL 是路径
  let url = `/${encodedPath}`;

  const queryParams = new URLSearchParams();

  const activeBranch = (branch ?? getCurrentBranch() ?? '').trim();

  if (activeBranch.length > 0) {
    queryParams.set(URL_PARAMS.BRANCH, activeBranch);
  }

  const queryString = queryParams.toString();

  if (queryString.length > 0) {
    url += `?${queryString}`;
  }

  // 如果有预览参数，添加为哈希部分，但仅使用文件名
  if (preview !== undefined && preview.length > 0) {
    // 从路径中提取文件名
    const fileName = preview.split('/').pop();
    url += `#preview=${encodeURI(fileName ?? '')}`;
  }

  return url;
}

/**
 * 更新浏览器 URL，不添加历史记录
 * @param path 文件路径
 * @param preview 预览文件路径（可选）
 */
export function updateUrlWithoutHistory(path: string, preview?: string, branch?: string): void {
  try {
    const newUrl = buildUrlWithParams(path, preview, branch);
    const activeBranch = (branch ?? getCurrentBranch() ?? '').trim();
    window.history.replaceState({ path, preview, branch: activeBranch }, '', newUrl);
    logger.debug(`URL 已更新（不添加历史记录）: ${newUrl}`);
  } catch (error) {
    logger.error('更新 URL 失败:', error);
  }
}

/**
 * 更新浏览器 URL，添加历史记录
 * @param path 文件路径
 * @param preview 预览文件路径（可选）
 */
export function updateUrlWithHistory(path: string, preview?: string, branch?: string): void {
  try {
    const newUrl = buildUrlWithParams(path, preview, branch);
    const activeBranch = (branch ?? getCurrentBranch() ?? '').trim();
    window.history.pushState({ path, preview, branch: activeBranch }, '', newUrl);
    logger.debug(`URL 已更新（添加历史记录）: ${newUrl}`);
  } catch (error) {
    logger.error('更新 URL 失败:', error);
  }
}

/**
 * 检查 URL 中是否有预览参数
 * @returns 是否有预览参数
 */
export function hasPreviewParam(): boolean {
  try {
    // 检查查询参数
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has(URL_PARAMS.PREVIEW)) {
      return true;
    }

    // 检查哈希部分
    const hash = window.location.hash;
    return hash.startsWith('#preview=');
  } catch (error) {
    logger.error('检查 URL 预览参数失败:', error);
    return false;
  }
}

/**
 * 检查 URL 是否为有效的应用 URL
 * @returns 是否为有效的应用 URL
 */
export function isValidAppUrl(): boolean {
  return true; // 所有路径现在都是有效的应用 URL
}
