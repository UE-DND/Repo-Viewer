import { useState, useEffect, useCallback, useRef } from 'react';
import type { GitHubContent } from '@/types';
import { GitHub } from '@/services/github';
import { GITHUB_REPO_OWNER, GITHUB_REPO_NAME } from '@/services/github/core/Config';
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
export function useReadmeContent(contents: GitHubContent[], currentPath: string, currentBranch: string): ReadmeContentState {
  const [readmeContent, setReadmeContent] = useState<string | null>(null);
  const [loadingReadme, setLoadingReadme] = useState<boolean>(false);
  const [readmeLoaded, setReadmeLoaded] = useState<boolean>(false);

  const currentPathRef = useRef<string>(currentPath);
  const lastReadmePathRef = useRef<string | null>(null);
  const lastReadmeKeyRef = useRef<string | null>(null);
  const loadingReadmeRef = useRef<boolean>(loadingReadme);
  const readmeLoadedRef = useRef<boolean>(readmeLoaded);
  const currentBranchRef = useRef<string>(currentBranch);

  useEffect(() => {
    currentPathRef.current = currentPath;
  }, [currentPath]);

  useEffect(() => {
    if (currentBranchRef.current !== currentBranch) {
      currentBranchRef.current = currentBranch;
      setLoadingReadme(true);
      setReadmeLoaded(false);
      setReadmeContent(null);
      lastReadmeKeyRef.current = null;
      lastReadmePathRef.current = null;
    }
  }, [currentBranch]);

  const loadReadmeContent = useCallback(async (readmeItem: GitHubContent, requestKey: string) => {
    if (typeof readmeItem.path !== 'string' || readmeItem.path.trim() === '') {
      return;
    }

    const readmeDir = readmeItem.path.includes('/')
      ? readmeItem.path.split('/').slice(0, -1).join('/')
      : '';

    setLoadingReadme(true);
    setReadmeContent(null);
    setReadmeLoaded(false);

    try {
      const encodedPath = readmeItem.path
        .split('/')
        .map(segment => encodeURIComponent(segment))
        .join('/');
      const fileUrl = `https://raw.githubusercontent.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/${encodeURIComponent(currentBranchRef.current)}/${encodedPath}`;
      const content = await GitHub.Content.getFileContent(fileUrl);

      // 检查路径是否已经变更
      if (currentPathRef.current !== readmeDir) {
        logger.debug(`README 路径已变更，忽略: ${readmeItem.path}`);
        return;
      }

      // 检查请求期间标识是否已变更（例如分支切换），避免旧响应覆盖新内容
      if (lastReadmeKeyRef.current !== requestKey) {
        logger.debug(`README 标识已变更，忽略响应: ${readmeItem.path}`);
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
      const nextReadmeKey = `${currentBranchRef.current}:${readmeItem.path}:${readmeItem.sha}:${readmeItem.download_url ?? ''}`;
      const isSameReadme = lastReadmeKeyRef.current === nextReadmeKey;

      if (isSameReadme && (loadingReadmeRef.current || readmeLoadedRef.current)) {
        return;
      }

      lastReadmePathRef.current = nextReadmePath;
      lastReadmeKeyRef.current = nextReadmeKey;
      void loadReadmeContent(readmeItem, nextReadmeKey);
    } else {
      lastReadmePathRef.current = null;
      lastReadmeKeyRef.current = null;
      setReadmeContent(null);
      setLoadingReadme(false);
      // README 不存在时也设置为已加载完成
      setReadmeLoaded(true);
    }
  }, [contents, currentBranch, loadReadmeContent]);

  // 同步加载状态到 ref，避免将其加入主 effect 依赖
  useEffect(() => {
    loadingReadmeRef.current = loadingReadme;
  }, [loadingReadme]);

  useEffect(() => {
    readmeLoadedRef.current = readmeLoaded;
  }, [readmeLoaded]);

  return {
    readmeContent,
    loadingReadme,
    readmeLoaded
  };
}
