import type { MutableRefObject } from 'react';
import { GitHubContent } from '../../../types';

// 导航方向类型
export type NavigationDirection = "forward" | "backward" | "none";

// 定义全局状态接口
export interface GlobalState {
  // Content 相关状态
  content: {
    currentPath: string;
    contents: GitHubContent[];
    readmeContent: string | null;
    loading: boolean;
    loadingReadme: boolean;
    readmeLoaded: boolean;
    error: string | null;
    navigationDirection: NavigationDirection;
    repoOwner: string;
    repoName: string;
  };
  
  // Preview 相关状态
  preview: {
    previewingItem: GitHubContent | null;
    previewingImageItem: GitHubContent | null;
    previewingOfficeItem: GitHubContent | null;
    imagePreviewUrl: string | null;
    officePreviewUrl: string | null;
    officeFileType: string | null;
    isOfficeFullscreen: boolean;
    currentPreviewItemRef: MutableRefObject<GitHubContent | null>;
  };
  
  // Download 相关状态
  download: {
    downloadingPath: string | null;
    downloadingFolderPath: string | null;
    folderDownloadProgress: number;
  };
  
  // Metadata 相关状态
  metadata: {
    title: string;
    description: string;
    keywords: string;
    ogImage: string;
  };
}

// 状态订阅器类型
export type StateSelector<T> = (state: GlobalState) => T;
export type StateListener<T> = (newValue: T, prevValue: T) => void;

// 订阅键类型
export type SubscriptionKey = 'content' | 'preview' | 'download' | 'metadata' | 'global';

// 订阅信息
export interface Subscription<T = any> {
  selector: StateSelector<T>;
  listener: StateListener<T>;
  id: string;
}