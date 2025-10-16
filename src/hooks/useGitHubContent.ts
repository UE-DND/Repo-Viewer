import { useState, useEffect, useCallback, useRef } from 'react';
import type { GitHubContent } from '@/types';
import { GitHub } from '@/services/github';
import { logger } from '@/utils';
import { requestManager } from '@/utils/request/requestManager';
import { handleError } from '@/utils/error/errorHandler';
import { getBranchFromUrl, getPathFromUrl, updateUrlWithHistory, updateUrlWithoutHistory } from '@/utils/routing/urlManager';
import type { NavigationDirection } from '@/contexts/unified';
import { getFeaturesConfig, getGithubConfig } from '@/config';

// 配置
const featuresConfig = getFeaturesConfig();
const githubConfig = getGithubConfig();

const HOMEPAGE_FILTER_ENABLED = featuresConfig.homepageFilter.enabled;
const HOMEPAGE_ALLOWED_FILETYPES = featuresConfig.homepageFilter.allowedFileTypes;
const HOMEPAGE_ALLOWED_FOLDERS = featuresConfig.homepageFilter.allowedFolders;

// 获取仓库信息
const GITHUB_REPO_OWNER = githubConfig.repoOwner;
const GITHUB_REPO_NAME = githubConfig.repoName;
const DEFAULT_BRANCH = GitHub.Branch.getDefaultBranchName();

/**
 * GitHub内容管理Hook
 * 
 * 管理GitHub仓库内容的获取、缓存和状态，支持分支切换、路径导航和README预览。
 * 自动处理URL参数和浏览器历史导航。
 * 
 * @returns GitHub内容状态和操作函数
 */
export const useGitHubContent = (): {
  currentPath: string;
  contents: GitHubContent[];
  readmeContent: string | null;
  loading: boolean;
  loadingReadme: boolean;
  readmeLoaded: boolean;
  error: string | null;
  setCurrentPath: (path: string, direction?: NavigationDirection) => void;
  refreshContents: () => void;
  navigationDirection: NavigationDirection;
  repoOwner: string;
  repoName: string;
  currentBranch: string;
  defaultBranch: string;
  branches: string[];
  branchLoading: boolean;
  branchError: string | null;
  setCurrentBranch: (branch: string) => void;
  refreshBranches: () => Promise<void>;
} => {
  // 尝试从URL获取路径
  const getSavedPath = (): string => {
    try {
      // 从URL获取路径
      const urlPath = getPathFromUrl();
      if (urlPath !== '') {
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
  // 分支状态
  const [currentBranch, setCurrentBranchState] = useState<string>(() => {
    const branchFromUrl = getBranchFromUrl().trim();
    if (branchFromUrl.length > 0) {
      GitHub.Branch.setCurrentBranch(branchFromUrl);
      return branchFromUrl;
    }
    return GitHub.Branch.getCurrentBranch();
  });
  const [availableBranches, setAvailableBranches] = useState<string[]>(() => {
    const initial = GitHub.Branch.getCurrentBranch();
    return Array.from(new Set([DEFAULT_BRANCH, initial]));
  });
  const [branchLoading, setBranchLoading] = useState<boolean>(false);
  const [branchError, setBranchError] = useState<string | null>(null);
  // 初始加载标记
  const isInitialLoad = useRef<boolean>(true);
  const currentPathRef = useRef<string>(currentPath);
  const currentBranchRef = useRef<string>(currentBranch);
  const refreshTargetPathRef = useRef<string | null>(null);
  const isRefreshInProgressRef = useRef(false);

  useEffect(() => {
    currentPathRef.current = currentPath;
  }, [currentPath]);

  useEffect(() => {
    currentBranchRef.current = currentBranch;
  }, [currentBranch]);

  // 处理错误显示
  const displayError = useCallback((message: string) => {
    setError(message);
    logger.error(message);
  }, []);

  const mergeBranchList = useCallback((branches: string[]) => {
    setAvailableBranches(prev => {
      const branchSet = new Set(prev);
      branches.forEach(name => {
        const trimmed = name.trim();
        if (trimmed.length > 0) {
          branchSet.add(trimmed);
        }
      });
      branchSet.add(DEFAULT_BRANCH);
      branchSet.add(currentBranchRef.current);

      const branchArray = Array.from(branchSet);
      branchArray.sort((a, b) => a.localeCompare(b, 'zh-CN'));
      branchArray.sort((a, b) => {
        if (a === DEFAULT_BRANCH) {
          return -1;
        }
        if (b === DEFAULT_BRANCH) {
          return 1;
        }
        return 0;
      });
      return branchArray;
    });
  }, []);

  const loadBranches = useCallback(async () => {
    setBranchLoading(true);
    setBranchError(null);
    try {
      const branches = await GitHub.Branch.getBranches();
      mergeBranchList(branches);
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      setBranchError(`获取分支列表失败: ${message}`);
      logger.error('获取分支列表失败:', error);
    } finally {
      setBranchLoading(false);
    }
  }, [mergeBranchList]);

  useEffect(() => {
    void loadBranches();
  }, [loadBranches]);

  // 加载README内容
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

      if (currentPathRef.current !== readmeDir) {
        logger.debug(`README 路径已变更，忽略: ${readmeItem.path}`);
        return;
      }

      setReadmeContent(content);
      setReadmeLoaded(true); // 设置为已加载完成
    } catch (e: unknown) {
      handleError(e, 'useGitHubContent.loadReadmeContent', {
        silent: true, // 已经有 displayError，不需要额外通知
        userMessage: `加载 README 失败: ${e instanceof Error ? e.message : '未知错误'}`
      });
      displayError(`加载 README 失败: ${e instanceof Error ? e.message : '未知错误'}`);
      setReadmeContent(null);
      setReadmeLoaded(true); // 出错时也设置为已加载完成
    } finally {
      setLoadingReadme(false);
    }
  }, [displayError]);

  // 加载目录内容
  const loadContents = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    // 重置README加载状态
    setReadmeLoaded(false);

    try {
      // 使用 requestManager 自动处理请求取消和防抖
      const data = await requestManager.request(
        'github-contents',
        (signal) => GitHub.Content.getContents(path, signal),
        { debounce: 100 } // 100ms 防抖，减少快速切换时的请求
      );

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
          return extension !== undefined && extension !== '' && HOMEPAGE_ALLOWED_FILETYPES.includes(extension);
        });

        logger.debug(`过滤后剩余 ${filteredData.length.toString()} 个文件/目录（过滤前 ${sortedData.length.toString()} 个）`);
        logger.debug(`允许的文件夹: ${HOMEPAGE_ALLOWED_FOLDERS.join(', ')}`);
        logger.debug(`允许的文件类型: ${HOMEPAGE_ALLOWED_FILETYPES.join(', ')}`);
      }

      setContents(filteredData);
      logger.debug(`获取到 ${filteredData.length.toString()} 个文件/目录`);

      const readmeItem = sortedData.find(item =>
        item.type === 'file' &&
        item.name.toLowerCase().includes('readme') &&
        item.name.toLowerCase().endsWith('.md')
      );

      if (readmeItem !== undefined) {
        await loadReadmeContent(readmeItem);
      } else {
        setReadmeContent(null);
        // README不存在时也设置为已加载完成
        setReadmeLoaded(true);
      }
    } catch (e: unknown) {
      // 检查是否是取消错误
      if (e instanceof Error && e.name === 'AbortError') {
        // requestManager 已经处理了取消日志
        return;
      }

      // 使用统一的错误处理
      handleError(e, 'useGitHubContent.loadContents', {
        silent: true,
        userMessage: `获取目录内容失败: ${e instanceof Error ? e.message : '未知错误'}`
      });
      displayError(`获取目录内容失败: ${e instanceof Error ? e.message : '未知错误'}`);
      setContents([]);
      // 出错时也设置为已加载完成
      setReadmeLoaded(true);
    } finally {
      setLoading(false);
      if (isRefreshInProgressRef.current) {
        isRefreshInProgressRef.current = false;
        refreshTargetPathRef.current = null;
      }
    }
  }, [displayError, loadReadmeContent]);



  const applyCurrentPath = useCallback((path: string, direction: NavigationDirection = 'none') => {
    if (isRefreshInProgressRef.current && refreshTargetPathRef.current !== null) {
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

  // 刷新内容
  const refreshContents = useCallback(() => {
    refreshTargetPathRef.current = currentPathRef.current;
    isRefreshInProgressRef.current = true;
    setRefreshTrigger(prev => prev + 1);
    setNavigationDirection('none'); // 刷新时不应用动画
    logger.debug('触发内容刷新');
  }, []);

  const applyBranchState = useCallback((branchName: string): string => {
    const trimmed = branchName.trim();
    const target = trimmed.length > 0 ? trimmed : DEFAULT_BRANCH;

    if (currentBranchRef.current === target) {
      return target;
    }

    GitHub.Branch.setCurrentBranch(target);
    currentBranchRef.current = target;
    setCurrentBranchState(target);
    mergeBranchList([target]);
    setBranchError(null);

    return target;
  }, [mergeBranchList]);

  // 处理路径变化
  useEffect(() => {
    // 检查是否是仅主题切换的操作，如果是则不重新加载内容
    const isThemeChangeOnly = document.documentElement.getAttribute('data-theme-change-only') === 'true';

    if (!isThemeChangeOnly) {
      void loadContents(currentPath);

      // 只有在非初始加载时更新URL
      if (!isInitialLoad.current) {
        // 使用历史API更新URL，并添加历史记录
        updateUrlWithHistory(currentPath, undefined, currentBranchRef.current);
      } else {
        // 初始加载时，如果URL中已有path参数，则不需要更新URL
        const urlPath = getPathFromUrl();
        if (currentPath !== urlPath) {
          // 如果初始加载的路径与URL中的路径不同，更新URL（但不添加历史记录）
          updateUrlWithoutHistory(currentPath, undefined, currentBranchRef.current);
        }
        isInitialLoad.current = false;
      }
    } else {
      logger.debug('仅主题切换操作，跳过内容重新加载');
    }
  }, [currentPath, refreshTrigger, loadContents]);

  // 监听浏览器历史导航事件
  useEffect(() => {
    const handlePopState = (event: PopStateEvent): void => {
      if (isRefreshInProgressRef.current) {
        logger.debug('刷新进行中，忽略历史导航事件');
        return;
      }

      logger.debug('内容管理器: 检测到历史导航事件');

      // 从历史状态中获取路径
      const state = event.state as { path?: string; preview?: string; branch?: string } | null;
      logger.debug(`历史状态: ${JSON.stringify(state)}`);

      const stateBranch = typeof state?.branch === 'string' ? state.branch : '';
      const urlBranch = getBranchFromUrl().trim();
      const branchCandidate = stateBranch.trim().length > 0 ? stateBranch.trim() : urlBranch;

      if (branchCandidate.length > 0) {
        if (branchCandidate !== currentBranchRef.current) {
          logger.debug(`历史导航事件，应用分支: ${branchCandidate}`);
          applyBranchState(branchCandidate);
        }
      } else if (currentBranchRef.current !== DEFAULT_BRANCH) {
        logger.debug('历史导航事件，无分支信息，回退到默认分支');
        applyBranchState(DEFAULT_BRANCH);
      }

      if (state?.path !== undefined) {
        logger.debug(`历史导航事件，路径: ${state.path}`);
        // 更新当前路径，但不添加新的历史记录
        applyCurrentPath(state.path, 'backward');
      } else {
        // 如果没有state或path未定义，尝试从 URL 获取路径
        const urlPath = getPathFromUrl();
        if (urlPath !== '') {
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
    const handleNavigateToHome = (): void => {
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
  }, [applyCurrentPath, applyBranchState]);

  const changeBranch = useCallback((branchName: string): void => {
    const trimmed = branchName.trim();
    const targetBranch = trimmed.length > 0 ? trimmed : DEFAULT_BRANCH;

    if (targetBranch === currentBranchRef.current) {
      logger.debug(`分支未变更，忽略：${targetBranch}`);
      return;
    }

    logger.info(`切换分支: ${currentBranchRef.current} -> ${targetBranch}`);

    applyBranchState(targetBranch);

    setReadmeContent(null);
    setReadmeLoaded(false);
    setError(null);

    // 切换分支时导航到根目录，避免路径不存在的问题
    applyCurrentPath('', 'none');
  }, [applyBranchState, applyCurrentPath]);

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
    repoName: GITHUB_REPO_NAME,
    currentBranch,
    defaultBranch: DEFAULT_BRANCH,
    branches: availableBranches,
    branchLoading,
    branchError,
    setCurrentBranch: changeBranch,
    refreshBranches: loadBranches
  };
};
