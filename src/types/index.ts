import { RefObject } from 'react';
import { OptionsObject as NotistackOptionsObject } from 'notistack';

// 定义GitHub仓库内容项的接口
export interface GitHubContent {
  name: string;
  path: string;
  type: 'file' | 'dir';
  sha: string;
  size?: number;
  download_url: string | null;
  url?: string;
  html_url?: string;
  git_url?: string;
  _links?: {
    self: string;
    git: string;
    html: string;
  };
}

// 定义面包屑段接口
export interface BreadcrumbSegment {
  name: string;
  path: string;
}

// 定义通知组件扩展接口
export interface OptionsObject extends NotistackOptionsObject {
  hideCloseButton?: boolean;
}

// 定义进度通知接口
export interface ProgressSnackbarOptions extends OptionsObject {
  progress?: number;
}

// 定义Office文件类型枚举
export enum OfficeFileType {
  WORD = 'word',
  EXCEL = 'excel',
  PPT = 'ppt'
}

// 定义预览状态接口
export interface PreviewState {
  // Markdown预览 (仅用于README文件)
  previewContent: string | null;
  previewingItem: GitHubContent | null;
  loadingPreview: boolean;
  
  
  // 图像预览
  imagePreviewUrl: string | null;
  previewingImageItem: GitHubContent | null;
  isImageFullscreen: boolean;
  loadingImagePreview: boolean;
  imageError: string | null;
  
  // 统一的Office预览
  officePreviewUrl: string | null;
  previewingOfficeItem: GitHubContent | null;
  loadingOfficePreview: boolean;
  isOfficeFullscreen: boolean;
  officeError: string | null;
  officeFileType: OfficeFileType | null;
}

// 定义预览操作类型
export type PreviewAction =
  | { type: 'RESET_PREVIEW' }
  // Markdown预览操作 (仅用于README文件)
  | { type: 'SET_MD_PREVIEW', content: string | null, item: GitHubContent | null }
  | { type: 'SET_MD_LOADING', loading: boolean }
  
  
  // 图像预览操作
  | { type: 'SET_IMAGE_PREVIEW', url: string | null, item: GitHubContent | null }
  | { type: 'SET_IMAGE_LOADING', loading: boolean }
  | { type: 'SET_IMAGE_ERROR', error: string | null }
  | { type: 'SET_IMAGE_FULLSCREEN', fullscreen: boolean }
  
  // Office预览操作
  | { type: 'SET_OFFICE_PREVIEW', url: string | null, item: GitHubContent | null, fileType: OfficeFileType | null }
  | { type: 'SET_OFFICE_LOADING', loading: boolean }
  | { type: 'SET_OFFICE_ERROR', error: string | null }
  | { type: 'SET_OFFICE_FULLSCREEN', fullscreen: boolean };

// 定义下载状态接口
export interface DownloadState {
  downloadingPath: string | null;
  downloadingFolderPath: string | null;
  folderDownloadProgress: number;
  processingFiles: number;
  totalFiles: number;
  isCancelled: boolean;
}

// 定义下载操作类型
export type DownloadAction =
  | { type: 'SET_DOWNLOADING_FILE', path: string | null }
  | { type: 'SET_DOWNLOADING_FOLDER', path: string | null }
  | { type: 'SET_FOLDER_PROGRESS', progress: number }
  | { type: 'SET_PROCESSING_FILES', count: number }
  | { type: 'SET_TOTAL_FILES', count: number }
  | { type: 'CANCEL_DOWNLOAD' }
  | { type: 'RESET_DOWNLOAD_STATE' };

// 定义应用状态接口
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