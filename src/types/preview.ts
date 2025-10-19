/**
 * 预览相关类型定义
 * 
 * 包含文件预览状态和操作的类型定义。
 */

import type { GitHubContent } from './index';

/**
 * Office文件类型枚举
 */
export enum OfficeFileType {
  /** Word文档 */
  WORD = "word",
  /** Excel表格 */
  EXCEL = "excel",
  /** PowerPoint演示文稿 */
  PPT = "ppt",
}

/**
 * 文件预览状态接口
 */
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

/**
 * 预览操作联合类型
 */
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

