import { useState, useEffect, useCallback, useRef } from 'react';
import { GitHubContent } from '../types';
import { GitHubService } from '../services/github';
import { logger } from '../utils';
import { getPathFromUrl, updateUrlWithHistory, updateUrlWithoutHistory } from '../utils/routing/urlManager';
import { NavigationDirection } from '../contexts/unified';
import { getFeaturesConfig, getGithubConfig } from '../config';

// 配置
const featuresConfig = getFeaturesConfig();
const githubConfig = getGithubConfig();

const HOMEPAGE_FILTER_ENABLED = featuresConfig.homepageFilter.enabled;
const HOMEPAGE_ALLOWED_FILETYPES = featuresConfig.homepageFilter.allowedFileTypes;
const HOMEPAGE_ALLOWED_FOLDERS = featuresConfig.homepageFilter.allowedFolders;

// 获取仓库信息
const GITHUB_REPO_OWNER = githubConfig.repoOwner;
const GITHUB_REPO_NAME = githubConfig.repoName;

// 自定义Hook，管理GitHub内容获取
export const useGitHubContent = () => {
  // 尝试从URL获取路径
  const getSavedPath = (): string => {
    try {
      // 从URL获取路径
      const urlPath = getPathFromUrl();
      if (urlPath) {
        logger.debug(`从URL获取路径: ${urlPath}`);
        return urlPath;
      }

      // 如果URL中没有路径，返回空字符串（根路径）
      return '';
    } catch (e) {
      logger.error('获取路径失败', e);
      return '';
    }
  };

  // 获取当前路径
  const [currentPath, setCurrentPathState] = useState<string>(getSavedPath());
  // 存储目录内容
  const [contents, setContents] = useState<GitHubContent[]>([]);
  // 存储README内容
  const [readmeContent, setReadmeContent] = useState<string | null>(null);
  // 加载状态
  const [loading, setLoading] = useState<boolean>(true);
  // README加载状态
  const [loadingReadme, setLoadingReadme] = useState<boolean>(false);
  // README加载完成状态
  const [readmeLoaded, setReadmeLoaded] = useState<boolean>(false);
  // 错误信息
  const [error, setError] = useState<string | null>(null);
  // 刷新触发器
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  // 导航方向
  const [navigationDirection, setNavigationDirection] = useState<NavigationDirection>('none');
  // 初始加载标记
  const isInitialLoad = useRef<boolean>(true);
  const currentPathRef = useRef<string>(currentPath);
  const requestIdCounterRef = useRef(0);
  const activeRequestIdRef = useRef(0);
  const refreshTargetPathRef = useRef<string | null>(null);
  const isRefreshInProgressRef = useRef(false);

  useEffect(() => {
    currentPathRef.current = currentPath;
  }, [currentPath]);

  // 处理错误显示
  const displayError = useCallback((message: string) => {
    setError(message);
    logger.error(message);
  }, []);

  // 加载README内容
  const loadReadmeContent = useCallback(async (readmeItem: GitHubContent, requestId?: number) => {
    if (!readmeItem || !readmeItem.download_url) return;

    const readmeDir = readmeItem.path.includes('/')
      ? readmeItem.path.split('/').slice(0, -1).join('/')
      : '';

    setLoadingReadme(true);
    setReadmeContent(null);
    setReadmeLoaded(false); // 重置加载状态

    try {
      const content = await GitHubService.getFileContent(readmeItem.download_url);

      if (requestId && activeRequestIdRef.current !== requestId) {
        logger.debug(`忽略过期的 README 响应: ${readmeItem.path}`);
        return;
      }

      if (currentPathRef.current !== readmeDir) {
        logger.debug(`README 路径已变更，忽略: ${readmeItem.path}`);
        return;
      }

      setReadmeContent(content);
      setReadmeLoaded(true); // 设置为已加载完成
    } catch (e: any) {
      if (requestId && activeRequestIdRef.current !== requestId) {
        logger.debug(`忽略过期的 README 错误: ${readmeItem.path}`);
        return;
      }

      logger.error(`加载README失败:`, e);
      displayError(`加载 README 失败: ${e.message}`);
      setReadmeContent(null);
      setReadmeLoaded(true); // 出错时也设置为已加载完成
    } finally {
      if (!requestId || activeRequestIdRef.current === requestId) {
        setLoadingReadme(false);
      }
    }
  }, [displayError]);

  // 加载目录内容
  const loadContents = useCallback(async (path: string) => {
    const requestId = ++requestIdCounterRef.current;
    activeRequestIdRef.current = requestId;

    setLoading(true);
    setError(null);
    // 重置README加载状态
    setReadmeLoaded(false);

    try {
      const data = await GitHubService.getContents(path);

      if (activeRequestIdRef.current !== requestId) {
        logger.debug(`忽略过期的目录响应: ${path}`);
        return;
      }

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
      let filteredData = [...sortedData];
      if (path === '' && HOMEPAGE_FILTER_ENABLED) {
        filteredData = sortedData.filter(item => {
          // 过滤文件夹
          if (item.type === 'dir') {
            return HOMEPAGE_ALLOWED_FOLDERS.length === 0 || HOMEPAGE_ALLOWED_FOLDERS.includes(item.name);
          }

          // 过滤文件
          if (HOMEPAGE_ALLOWED_FILETYPES.length === 0) {
            return true; // 如果没有指定允许的文件类型，则显示所有文件
          }

          const extension = item.name.split('.').pop()?.toLowerCase();
          return extension && HOMEPAGE_ALLOWED_FILETYPES.includes(extension);
        });

        logger.debug(`过滤后剩余 ${filteredData.length} 个文件/目录（过滤前 ${sortedData.length} 个）`);
        logger.debug(`允许的文件夹: ${HOMEPAGE_ALLOWED_FOLDERS.join(', ')}`);
        logger.debug(`允许的文件类型: ${HOMEPAGE_ALLOWED_FILETYPES.join(', ')}`);
      }

      if (activeRequestIdRef.current !== requestId) {
        logger.debug(`目录响应已过期，忽略状态更新: ${path}`);
        return;
      }

      setContents(filteredData);
      logger.debug(`获取到 ${filteredData.length} 个文件/目录`);

      const readmeItem = sortedData.find(item =>
        item.type === 'file' &&
        item.name.toLowerCase().includes('readme') &&
        item.name.toLowerCase().endsWith('.md')
      );

      if (readmeItem) {
        await loadReadmeContent(readmeItem, requestId);
      } else {
        if (activeRequestIdRef.current !== requestId) {
          return;
        }
        setReadmeContent(null);
        // README不存在时也设置为已加载完成
        setReadmeLoaded(true);
      }
    } catch (e: any) {
      if (activeRequestIdRef.current !== requestId) {
        logger.debug(`忽略过期的目录错误: ${path}`);
        return;
      }

      logger.error('获取内容失败:', e);
      displayError(`获取目录内容失败: ${e.message}`);
      setContents([]);
      // 出错时也设置为已加载完成
      setReadmeLoaded(true);
    } finally {
      if (activeRequestIdRef.current === requestId) {
        setLoading(false);
        if (isRefreshInProgressRef.current) {
          isRefreshInProgressRef.current = false;
          refreshTargetPathRef.current = null;
        }
      }
    }
  }, [displayError, loadReadmeContent]);



  const applyCurrentPath = useCallback((path: string, direction: NavigationDirection = 'none') => {
    if (isRefreshInProgressRef.current && refreshTargetPathRef.current) {
      if (path !== refreshTargetPathRef.current) {
        if (direction === 'none') {
          logger.debug(`刷新期间忽略路径更新: ${path}`);
          return;
        }
        logger.debug(`刷新期间检测到用户导航，取消路径锁定: ${path}`);
        isRefreshInProgressRef.current = false;
        refreshTargetPathRef.current = null;
      }
    }

    setNavigationDirection(direction);
    setCurrentPathState(path);
  }, [setNavigationDirection, setCurrentPathState]);

  // 处理路径变化
  useEffect(() => {
    if (currentPath !== null) {
      // 检查是否是仅主题切换的操作，如果是则不重新加载内容
      const isThemeChangeOnly = document.documentElement.getAttribute('data-theme-change-only') === 'true';

      if (!isThemeChangeOnly) {
        loadContents(currentPath);

        // 只有在非初始加载时更新URL
        if (!isInitialLoad.current) {
          // 使用历史API更新URL，并添加历史记录
          updateUrlWithHistory(currentPath);
        } else {
          // 初始加载时，如果URL中已有path参数，则不需要更新URL
          const urlPath = getPathFromUrl();
          if (currentPath !== urlPath) {
            // 如果初始加载的路径与URL中的路径不同，更新URL（但不添加历史记录）
            updateUrlWithoutHistory(currentPath);
          }
          isInitialLoad.current = false;
        }
      } else {
        logger.debug('仅主题切换操作，跳过内容重新加载');
      }
    }
  }, [currentPath, refreshTrigger, loadContents]);

  // 监听浏览器历史导航事件
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (isRefreshInProgressRef.current) {
        logger.debug('刷新进行中，忽略历史导航事件');
        return;
      }

      logger.debug('内容管理器: 检测到历史导航事件');

      // 从历史状态中获取路径
      const state = event.state as { path?: string; preview?: string } | null;
      logger.debug(`历史状态: ${JSON.stringify(state)}`);

      if (state && state.path !== undefined) {
        logger.debug(`历史导航事件，路径: ${state.path}`);
        // 更新当前路径，但不添加新的历史记录
        applyCurrentPath(state.path, 'backward');
      } else {
        // 如果没有state或path未定义，尝试从 URL 获取路径
        const urlPath = getPathFromUrl();
        if (urlPath) {
          logger.debug(`历史导航事件，从URL获取路径: ${urlPath}`);
          applyCurrentPath(urlPath, 'backward');
        } else {
          // 如果URL中也没有路径，重置为根路径
          logger.debug('历史导航事件，无路径状态，重置为根路径');
          applyCurrentPath('', 'backward');
        }
      }
    };

    // 处理标题点击导航到首页事件
    const handleNavigateToHome = () => {
      if (isRefreshInProgressRef.current) {
        logger.debug('刷新进行中，忽略返回首页事件');
        return;
      }

      logger.debug('接收到返回首页事件，正在导航到首页');
      applyCurrentPath('', 'backward');
    };

    // 添加历史导航事件监听器
    window.addEventListener('popstate', handlePopState);

    // 添加导航到首页事件监听器
    window.addEventListener('navigate-to-home', handleNavigateToHome as EventListener);

    // 组件卸载时清理
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('navigate-to-home', handleNavigateToHome as EventListener);
    };
  }, [applyCurrentPath]);

  // 刷新内容
  const refreshContents = useCallback(() => {
    refreshTargetPathRef.current = currentPathRef.current;
    isRefreshInProgressRef.current = true;
    setRefreshTrigger(prev => prev + 1);
    setNavigationDirection('none'); // 刷新时不应用动画
    logger.debug('触发内容刷新');
  }, []);



  return {
    currentPath,
    contents,
    readmeContent,
    loading,
    loadingReadme,
    readmeLoaded,
    error,
    setCurrentPath: (path: string, direction: NavigationDirection = 'none') => {
      applyCurrentPath(path, direction);
    },
    refreshContents,
    navigationDirection,
    repoOwner: GITHUB_REPO_OWNER,
    repoName: GITHUB_REPO_NAME
  };
};
