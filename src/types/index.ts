/**
 * 类型定义统一导出
 * 
 * 将所有类型定义按功能域拆分到不同文件中，并在此统一导出。
 */

import type { OptionsObject as NotistackOptionsObject } from 'notistack';

// 导出错误相关类型
export * from './errors';

// 导出预览相关类型（包含 OfficeFileType 枚举）
export * from './preview';

// 导出下载相关类型
export type * from './download';

// 导出状态相关类型
export type * from './state';

/**
 * GitHub仓库内容项接口
 */
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

/**
 * 面包屑导航段接口
 */
export interface BreadcrumbSegment {
  /** 显示名称 */
  name: string;
  /** 路径 */
  path: string;
}

/**
 * 通知组件扩展选项接口
 */
export interface OptionsObject extends NotistackOptionsObject {
  /** 是否隐藏关闭按钮 */
  hideCloseButton?: boolean;
}

/**
 * 进度通知选项接口
 */
export interface ProgressSnackbarOptions extends OptionsObject {
  /** 进度百分比 */
  progress?: number;
}
