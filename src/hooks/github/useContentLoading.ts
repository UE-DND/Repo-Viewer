import { useState, useEffect, useCallback, useRef } from 'react';
import type { GitHubContent } from '@/types';
import { GitHub } from '@/services/github';
import { logger } from '@/utils';
import { requestManager } from '@/utils/request/requestManager';
import { handleError } from '@/utils/error/errorHandler';
import { getFeaturesConfig } from '@/config';
import type { ContentLoadingState } from './types';

const featuresConfig = getFeaturesConfig();
const HOMEPAGE_FILTER_ENABLED = featuresConfig.homepageFilter.enabled;
const HOMEPAGE_ALLOWED_FILETYPES = featuresConfig.homepageFilter.allowedFileTypes;
const HOMEPAGE_ALLOWED_FOLDERS = featuresConfig.homepageFilter.allowedFolders;

/**
 * 内容加载 Hook
 * 
 * 管理 GitHub 仓库内容的加载和过滤
 * 
 * @param path - 当前路径
 * @param branch - 当前分支
 * @returns 内容加载状态和操作函数
 */
export function useContentLoading(path: string, branch: string): ContentLoadingState {
  const [contents, setContents] = useState<GitHubContent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const currentPathRef = useRef<string>(path);
  const currentBranchRef = useRef<string>(branch);

  useEffect(() => {
    currentPathRef.current = path;
  }, [path]);

  useEffect(() => {
    currentBranchRef.current = branch;
  }, [branch]);

  const displayError = useCallback((message: string) => {
    setError(message);
    logger.error(message);
  }, []);

  const filterContents = useCallback((data: GitHubContent[]): GitHubContent[] => {
    // 按类型和名称排序
    const sortedData = [...data].sort((a, b) => {
      // 目录优先
      if (a.type !== b.type) {
        return a.type === 'dir' ? -1 : 1;
      }
      // 按名称字母顺序
      return a.name.localeCompare(b.name, 'zh-CN');
    });

    // 在首页根据文件类型进行过滤
    if (path === '' && HOMEPAGE_FILTER_ENABLED) {
      const filteredData = sortedData.filter(item => {
        // 过滤文件夹
        if (item.type === 'dir') {
          return HOMEPAGE_ALLOWED_FOLDERS.length === 0 || HOMEPAGE_ALLOWED_FOLDERS.includes(item.name);
        }

        // 过滤文件
        if (HOMEPAGE_ALLOWED_FILETYPES.length === 0) {
          return true; // 如果没有指定允许的文件类型，则显示所有文件
        }

        const extension = item.name.split('.').pop()?.toLowerCase();
        return extension !== undefined && extension !== '' && HOMEPAGE_ALLOWED_FILETYPES.includes(extension);
      });

      logger.debug(`过滤后剩余 ${filteredData.length.toString()} 个文件/目录（过滤前 ${sortedData.length.toString()} 个）`);
      logger.debug(`允许的文件夹: ${HOMEPAGE_ALLOWED_FOLDERS.join(', ')}`);
      logger.debug(`允许的文件类型: ${HOMEPAGE_ALLOWED_FILETYPES.join(', ')}`);
      
      return filteredData;
    }

    return sortedData;
  }, [path]);

  const loadContents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 使用 requestManager 自动处理请求取消和防抖
      const data = await requestManager.request(
        'github-contents',
        (signal) => GitHub.Content.getContents(currentPathRef.current, signal),
        { debounce: 100 } // 100ms 防抖，减少快速切换时的请求
      );

      const filteredData = filterContents(data);
      setContents(filteredData);
      logger.debug(`获取到 ${filteredData.length.toString()} 个文件/目录`);
    } catch (e: unknown) {
      // 检查是否是取消错误
      if (e instanceof Error && e.name === 'AbortError') {
        // requestManager 已经处理了取消日志
        return;
      }

      // 使用统一的错误处理
      handleError(e, 'useContentLoading.loadContents', {
        silent: true,
        userMessage: `获取目录内容失败: ${e instanceof Error ? e.message : '未知错误'}`
      });
      displayError(`获取目录内容失败: ${e instanceof Error ? e.message : '未知错误'}`);
      setContents([]);
    } finally {
      setLoading(false);
    }
  }, [filterContents, displayError]);

  // 监听路径、分支或刷新触发器的变化
  useEffect(() => {
    // 检查是否是仅主题切换的操作
    const isThemeChangeOnly = document.documentElement.getAttribute('data-theme-change-only') === 'true';
    
    if (!isThemeChangeOnly) {
      void loadContents();
    } else {
      logger.debug('仅主题切换操作，跳过内容重新加载');
    }
  }, [path, branch, refreshTrigger, loadContents]);

  const refresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    logger.debug('触发内容刷新');
  }, []);

  return {
    contents,
    loading,
    error,
    refresh
  };
}
