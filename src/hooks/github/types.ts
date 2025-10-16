import type { NavigationDirection } from '@/contexts/unified';
import type { GitHubContent } from '@/types';

/**
 * 路径管理 Hook 的返回类型
 */
export interface PathManagementState {
  currentPath: string;
  navigationDirection: NavigationDirection;
  setCurrentPath: (path: string, direction?: NavigationDirection) => void;
  setRefreshState: (isRefreshing: boolean, targetPath?: string) => void;
  setNavigationDirection: (direction: NavigationDirection) => void;
}

/**
 * 分支管理 Hook 的返回类型
 */
export interface BranchManagementState {
  currentBranch: string;
  branches: string[];
  branchLoading: boolean;
  branchError: string | null;
  setCurrentBranch: (branch: string) => void;
  refreshBranches: () => Promise<void>;
}

/**
 * 内容加载 Hook 的返回类型
 */
export interface ContentLoadingState {
  contents: GitHubContent[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * README 内容 Hook 的返回类型
 */
export interface ReadmeContentState {
  readmeContent: string | null;
  loadingReadme: boolean;
  readmeLoaded: boolean;
}
