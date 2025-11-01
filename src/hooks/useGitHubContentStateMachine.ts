import { useReducer, useCallback, useEffect, useRef } from 'react';
import type { GitHubContent } from '@/types';
import { GitHub } from '@/services/github';
import { logger } from '@/utils';
import { sortContentsByPinyin } from '@/utils/sorting/contentSorting';
import { 
  getBranchFromUrl, 
  getPathFromUrl, 
  updateUrlWithHistory, 
  updateUrlWithoutHistory 
} from '@/utils/routing/urlManager';
import type { NavigationDirection } from '@/contexts/unified';

/**
 * 内容状态类型
 */
type ContentState =
  | { type: 'idle' }
  | { type: 'loading'; path: string; branch: string }
  | { 
      type: 'loaded'; 
      path: string; 
      branch: string;
      contents: GitHubContent[]; 
      readme: {
        content: string | null;
        loading: boolean;
      };
    }
  | { type: 'error'; error: string; path: string; branch: string };

/**
 * 分支状态类型
 */
type BranchState =
  | { type: 'idle'; current: string; available: string[] }
  | { type: 'loading'; current: string; available: string[] }
  | { type: 'loaded'; current: string; available: string[]; }
  | { type: 'error'; error: string; current: string; available: string[] };

/**
 * 组合状态
 */
interface State {
  content: ContentState;
  branch: BranchState;
  navigationDirection: NavigationDirection;
  requestId: number;
}

/**
 * 动作类型
 */
type Action =
  | { type: 'START_LOADING'; path: string; branch: string; requestId: number }
  | { type: 'LOAD_SUCCESS'; contents: GitHubContent[]; requestId: number }
  | { type: 'LOAD_README'; content: string; requestId: number }
  | { type: 'README_LOADING'; loading: boolean }
  | { type: 'LOAD_ERROR'; error: string; requestId: number }
  | { type: 'SET_NAVIGATION_DIRECTION'; direction: NavigationDirection }
  | { type: 'START_BRANCH_LOADING' }
  | { type: 'BRANCH_LOAD_SUCCESS'; branches: string[] }
  | { type: 'BRANCH_LOAD_ERROR'; error: string }
  | { type: 'CHANGE_BRANCH'; branch: string };

/**
 * Reducer 函数
 */
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'START_LOADING':
      // 只处理最新的请求
      if (action.requestId < state.requestId) {
        return state;
      }
      
      return {
        ...state,
        content: {
          type: 'loading',
          path: action.path,
          branch: action.branch
        },
        requestId: action.requestId
      };

    case 'LOAD_SUCCESS':
      // 只处理最新的请求
      if (action.requestId !== state.requestId) {
        return state;
      }
      
      if (state.content.type === 'loading') {
        return {
          ...state,
          content: {
            type: 'loaded',
            path: state.content.path,
            branch: state.content.branch,
            contents: action.contents,
            readme: {
              content: null,
              loading: false
            }
          }
        };
      }
      return state;

    case 'LOAD_README':
      if (action.requestId !== state.requestId) {
        return state;
      }
      
      if (state.content.type === 'loaded') {
        return {
          ...state,
          content: {
            ...state.content,
            readme: {
              content: action.content,
              loading: false
            }
          }
        };
      }
      return state;

    case 'README_LOADING':
      if (state.content.type === 'loaded') {
        return {
          ...state,
          content: {
            ...state.content,
            readme: {
              ...state.content.readme,
              loading: action.loading
            }
          }
        };
      }
      return state;

    case 'LOAD_ERROR':
      if (action.requestId !== state.requestId) {
        return state;
      }
      
      if (state.content.type === 'loading') {
        return {
          ...state,
          content: {
            type: 'error',
            error: action.error,
            path: state.content.path,
            branch: state.content.branch
          }
        };
      }
      return state;

    case 'SET_NAVIGATION_DIRECTION':
      return {
        ...state,
        navigationDirection: action.direction
      };

    case 'START_BRANCH_LOADING':
      if (state.branch.type === 'idle' || state.branch.type === 'loaded') {
        return {
          ...state,
          branch: {
            type: 'loading',
            current: state.branch.current,
            available: state.branch.available
          }
        };
      }
      return state;

    case 'BRANCH_LOAD_SUCCESS':
      if (state.branch.type === 'loading') {
        const branchSet = new Set([...state.branch.available, ...action.branches]);
        return {
          ...state,
          branch: {
            type: 'loaded',
            current: state.branch.current,
            available: Array.from(branchSet).sort()
          }
        };
      }
      return state;

    case 'BRANCH_LOAD_ERROR':
      if (state.branch.type === 'loading') {
        return {
          ...state,
          branch: {
            type: 'error',
            error: action.error,
            current: state.branch.current,
            available: state.branch.available
          }
        };
      }
      return state;

    case 'CHANGE_BRANCH':
      return {
        ...state,
        branch: {
          ...state.branch,
          current: action.branch
        },
        content: { type: 'idle' }
      };

    default:
      return state;
  }
}

/**
 * GitHub 内容状态机 Hook
 * 
 * 使用状态机模式管理复杂的内容加载状态，简化状态同步。
 */
export function useGitHubContentStateMachine(): {
  currentPath: string;
  currentBranch: string;
  contents: GitHubContent[];
  readmeContent: string | null;
  loading: boolean;
  loadingReadme: boolean;
  readmeLoaded: boolean;
  error: string | null;
  navigationDirection: NavigationDirection;
  branches: string[];
  branchLoading: boolean;
  branchError: string | null;
  defaultBranch: string;
  setCurrentPath: (path: string, direction?: NavigationDirection) => void;
  setCurrentBranch: (branch: string) => void;
  refreshContents: () => void;
  refreshBranches: () => Promise<void>;
} {
  const defaultBranch = GitHub.Branch.getDefaultBranchName();
  const initialPath = getPathFromUrl();
  const branchFromUrl = getBranchFromUrl();
  const initialBranch = branchFromUrl.length > 0 ? branchFromUrl : defaultBranch;

  const [state, dispatch] = useReducer(reducer, {
    content: { type: 'idle' },
    branch: {
      type: 'idle',
      current: initialBranch,
      available: [defaultBranch]
    },
    navigationDirection: 'none',
    requestId: 0
  });

  const requestIdCounter = useRef(0);
  const isInitialLoad = useRef(true);

  /**
   * 加载内容
   */
  const loadContent = useCallback(async (path: string, branch: string) => {
    const requestId = ++requestIdCounter.current;
    
    dispatch({ 
      type: 'START_LOADING', 
      path, 
      branch, 
      requestId 
    });

    try {
      const data = await GitHub.Content.getContents(path);
      const sortedData = sortContentsByPinyin(data);

      dispatch({ 
        type: 'LOAD_SUCCESS', 
        contents: sortedData, 
        requestId 
      });

      // 查找 README
      const readmeItem = sortedData.find(item =>
        item.type === 'file' &&
        item.name.toLowerCase().includes('readme') &&
        item.name.toLowerCase().endsWith('.md')
      );

      const downloadUrl = readmeItem?.download_url;
      if (downloadUrl !== null && downloadUrl !== undefined && downloadUrl.length > 0) {
        dispatch({ type: 'README_LOADING', loading: true });
        try {
          const content = await GitHub.Content.getFileContent(downloadUrl);
          dispatch({ type: 'LOAD_README', content, requestId });
        } catch (error) {
          logger.error('加载 README 失败', error);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      dispatch({ type: 'LOAD_ERROR', error: message, requestId });
    }
  }, []);

  /**
   * 加载分支列表
   */
  const loadBranches = useCallback(async () => {
    dispatch({ type: 'START_BRANCH_LOADING' });
    
    try {
      const branches = await GitHub.Branch.getBranches();
      dispatch({ type: 'BRANCH_LOAD_SUCCESS', branches });
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      dispatch({ type: 'BRANCH_LOAD_ERROR', error: message });
    }
  }, []);

  /**
   * 切换路径
   */
  const setCurrentPath = useCallback((path: string, direction: NavigationDirection = 'none') => {
    dispatch({ type: 'SET_NAVIGATION_DIRECTION', direction });
    
    if (state.branch.type !== 'idle') {
      void loadContent(path, state.branch.current);
    }
  }, [state.branch, loadContent]);

  /**
   * 切换分支
   */
  const changeBranch = useCallback((branch: string) => {
    dispatch({ type: 'CHANGE_BRANCH', branch });
    GitHub.Branch.setCurrentBranch(branch);
  }, []);

  /**
   * 刷新内容
   */
  const refreshContents = useCallback(() => {
    if (state.content.type === 'loaded') {
      void loadContent(state.content.path, state.content.branch);
    }
  }, [state.content, loadContent]);

  // 初始加载
  useEffect(() => {
    if (isInitialLoad.current) {
      void loadContent(initialPath, initialBranch);
      void loadBranches();
      isInitialLoad.current = false;
    }
  }, [initialPath, initialBranch, loadContent, loadBranches]);

  // URL 同步
  useEffect(() => {
    if (state.content.type === 'loaded') {
      if (!isInitialLoad.current) {
        updateUrlWithHistory(state.content.path, undefined, state.content.branch);
      } else {
        updateUrlWithoutHistory(state.content.path, undefined, state.content.branch);
      }
    }
  }, [state.content]);

  return {
    // 状态
    currentPath: state.content.type !== 'idle' ? state.content.path : initialPath,
    currentBranch: state.branch.current,
    contents: state.content.type === 'loaded' ? state.content.contents : [],
    readmeContent: state.content.type === 'loaded' ? state.content.readme.content : null,
    loading: state.content.type === 'loading',
    loadingReadme: state.content.type === 'loaded' ? state.content.readme.loading : false,
    readmeLoaded: state.content.type === 'loaded',
    error: state.content.type === 'error' ? state.content.error : null,
    navigationDirection: state.navigationDirection,
    
    // 分支状态
    branches: state.branch.available,
    branchLoading: state.branch.type === 'loading',
    branchError: state.branch.type === 'error' ? state.branch.error : null,
    defaultBranch,
    
    // 操作
    setCurrentPath,
    setCurrentBranch: changeBranch,
    refreshContents,
    refreshBranches: loadBranches
  };
}
