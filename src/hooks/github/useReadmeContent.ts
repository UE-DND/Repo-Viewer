import { useState, useEffect, useCallback, useRef } from 'react';
import type { GitHubContent } from '@/types';
import { GitHub } from '@/services/github';
import { logger } from '@/utils';
import { handleError } from '@/utils/error/errorHandler';
import type { ReadmeContentState } from './types';

/**
 * README 内容管理 Hook
 * 
 * 管理 README 文件的加载和状态
 * 
 * @param contents - 当前目录的内容列表
 * @param currentPath - 当前路径
 * @returns README 内容状态
 */
export function useReadmeContent(contents: GitHubContent[], currentPath: string): ReadmeContentState {
  const [readmeContent, setReadmeContent] = useState<string | null>(null);
  const [loadingReadme, setLoadingReadme] = useState<boolean>(false);
  const [readmeLoaded, setReadmeLoaded] = useState<boolean>(false);

  const currentPathRef = useRef<string>(currentPath);
  const lastReadmePathRef = useRef<string | null>(null);

  useEffect(() => {
    currentPathRef.current = currentPath;
  }, [currentPath]);

  const loadReadmeContent = useCallback(async (readmeItem: GitHubContent) => {
    if (readmeItem.download_url === null || readmeItem.download_url === '') {
      return;
    }

    const readmeDir = readmeItem.path.includes('/')
      ? readmeItem.path.split('/').slice(0, -1).join('/')
      : '';

    setLoadingReadme(true);
    setReadmeContent(null);
    setReadmeLoaded(false); // 重置加载状态

    try {
      const content = await GitHub.Content.getFileContent(readmeItem.download_url);

      // 检查路径是否已经变更
      if (currentPathRef.current !== readmeDir) {
        logger.debug(`README 路径已变更，忽略: ${readmeItem.path}`);
        return;
      }

      setReadmeContent(content);
      setReadmeLoaded(true); // 设置为已加载完成
    } catch (e: unknown) {
      handleError(e, 'useReadmeContent.loadReadmeContent', {
        silent: true,
        userMessage: `加载 README 失败: ${e instanceof Error ? e.message : '未知错误'}`
      });
      logger.error(`加载 README 失败: ${e instanceof Error ? e.message : '未知错误'}`);
      setReadmeContent(null);
      setReadmeLoaded(true); // 出错时也设置为已加载完成
    } finally {
      setLoadingReadme(false);
    }
  }, []);

  // 监听内容变化，自动加载 README
  useEffect(() => {
    // 查找 README 文件
    const readmeItem = contents.find(item =>
      item.type === 'file' &&
      item.name.toLowerCase().includes('readme') &&
      item.name.toLowerCase().endsWith('.md')
    );

    if (readmeItem !== undefined) {
      const nextReadmePath = readmeItem.path;
      const isSameReadme = lastReadmePathRef.current === nextReadmePath;

      if (isSameReadme && (loadingReadme || readmeLoaded)) {
        return;
      }

      lastReadmePathRef.current = nextReadmePath;
      void loadReadmeContent(readmeItem);
    } else {
      lastReadmePathRef.current = null;
      setReadmeContent(null);
      setLoadingReadme(false);
      // README 不存在时也设置为已加载完成
      setReadmeLoaded(true);
    }
  }, [contents, loadReadmeContent, loadingReadme, readmeLoaded]);

  return {
    readmeContent,
    loadingReadme,
    readmeLoaded
  };
}
