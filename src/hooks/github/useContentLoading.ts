import { useState, useEffect, useCallback, useRef } from 'react';
import type { GitHubContent } from '@/types';
import { GitHub } from '@/services/github';
import { logger } from '@/utils';
import { requestManager } from '@/utils/request/requestManager';
import { handleError } from '@/utils/error/errorHandler';
import { processContents } from '@/utils/content';
import { getFeaturesConfig } from '@/config';
import { useThemeTransitionFlag } from '@/hooks/useThemeTransition';
import type { ContentLoadingState } from './types';

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
  const isThemeChangingRef = useThemeTransitionFlag();

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
    const featuresConfig = getFeaturesConfig();
    const isHomepage = path === '';
    
    return processContents(data, isHomepage, {
      enabled: featuresConfig.homepageFilter.enabled,
      allowedFolders: featuresConfig.homepageFilter.allowedFolders,
      allowedFileTypes: featuresConfig.homepageFilter.allowedFileTypes
    });
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
    // 主题切换期间跳过内容重新加载
    if (isThemeChangingRef.current) {
      logger.debug('主题切换中，跳过内容重新加载');
      return;
    }
    
    void loadContents();
  }, [path, branch, refreshTrigger, loadContents, isThemeChangingRef]);

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
