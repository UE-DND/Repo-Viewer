import axios from 'axios';

import type { GitHubContent } from '@/types';
import { logger } from '@/utils';

import { RequestBatcher } from '../../RequestBatcher';
import { shouldUseServerAPI } from '../../config/ProxyForceManager';
import { safeValidateGitHubSearchResponse } from '../../schemas/apiSchemas';
import {
  filterAndNormalizeGitHubContents,
  transformGitHubSearchResponse
} from '../../schemas/dataTransformers';
import { getAuthHeaders } from '../Auth';
import {
  GITHUB_API_BASE,
  GITHUB_REPO_NAME,
  GITHUB_REPO_OWNER
} from '../Config';

const batcher = new RequestBatcher();

function buildSearchQuery(searchTerm: string, currentPath?: string, fileTypeFilter?: string): string {
  const trimmedTerm = searchTerm.trim();
  const safeTerm = trimmedTerm.replace(/"/g, '');
  const keyword = /\s/.test(safeTerm) ? `"${safeTerm}"` : safeTerm;

  let query = `repo:${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME} ${keyword} in:path`;

  if (currentPath !== undefined && currentPath !== '' && currentPath !== '/') {
    query += ` path:${currentPath}`;
  }

  if (fileTypeFilter !== undefined && fileTypeFilter !== '') {
    query += ` extension:${fileTypeFilter}`;
  }

  return query;
}

async function searchViaServerApi(query: string): Promise<unknown> {
  const response = await axios.get(`/api/github?action=search&q=${encodeURIComponent(query)}`);
  logger.debug(`通过服务端API搜索: ${query}`);
  return response.data;
}

async function searchViaDirectApi(query: string): Promise<unknown> {
  const apiUrl = `${GITHUB_API_BASE}/search/code`;
  const urlWithParams = new URL(apiUrl);
  urlWithParams.searchParams.append('q', query);
  urlWithParams.searchParams.append('per_page', '100');

  const fetchUrl = urlWithParams.toString();
  const result = await batcher.enqueue(fetchUrl, async () => {
    logger.debug(`搜索API请求: ${fetchUrl}`);
    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status.toString()}: ${response.statusText}`);
    }

    return response.json() as Promise<unknown>;
  }, {
    priority: 'medium',
    method: 'GET',
    headers: getAuthHeaders() as Record<string, string>
  });

  logger.debug(`直接请求GitHub API搜索: ${query}`);
  return result;
}

export async function searchWithGitHubApi(
  searchTerm: string,
  currentPath = '',
  fileTypeFilter?: string
): Promise<GitHubContent[]> {
  try {
    const query = buildSearchQuery(searchTerm, currentPath, fileTypeFilter);

    const rawResults = await (shouldUseServerAPI()
      ? searchViaServerApi(query)
      : searchViaDirectApi(query));

    const validation = safeValidateGitHubSearchResponse(rawResults);
    if (!validation.success) {
      logger.error(`搜索API响应验证失败: ${query}`, validation.error);
      throw new Error(`搜索响应格式错误: ${validation.error}`);
    }

    const searchContents = transformGitHubSearchResponse(validation.data);

    return filterAndNormalizeGitHubContents(searchContents, {
      excludeHidden: false,
      includeOnlyTypes: ['file']
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    logger.error(`搜索失败: ${searchTerm}`, error);
    throw new Error(`搜索失败: ${message}`);
  }
}

