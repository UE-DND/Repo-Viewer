/**
 * 应用状态相关类型定义
 * 
 * 包含应用级别的状态类型定义。
 */

import type { GitHubContent } from './index';
import type { PreviewState } from './preview';
import type { DownloadState } from './download';

/**
 * 应用状态接口
 */
export interface AppState {
  preview: PreviewState;
  download: DownloadState;
  currentPath: string;
  contents: GitHubContent[];
  readmeContent: string | null;
  loading: boolean;
  loadingReadme: boolean;
  error: string | null;
  refreshTrigger: number;
}

