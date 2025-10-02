import { useReducer, useCallback, useRef } from 'react';
import * as JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
  DownloadState,
  DownloadAction,
  GitHubContent
} from '@/types';
import { GitHubService } from '@/services/github';
import { logger } from '@/utils';
import { getForceServerProxy } from '@/services/github/config/ProxyForceManager';

// 下载状态初始值
const initialDownloadState: DownloadState = {
  downloadingPath: null,
  downloadingFolderPath: null,
  folderDownloadProgress: 0,
  processingFiles: 0,
  totalFiles: 0,
  isCancelled: false
};

// 下载状态reducer
function downloadReducer(state: DownloadState, action: DownloadAction): DownloadState {
  switch (action.type) {
    case 'SET_DOWNLOADING_FILE':
      return {
        ...state,
        downloadingPath: action.path,
        isCancelled: false
      };
    case 'SET_DOWNLOADING_FOLDER':
      return {
        ...state,
        downloadingFolderPath: action.path,
        isCancelled: false
      };
    case 'SET_FOLDER_PROGRESS':
      return {
        ...state,
        folderDownloadProgress: action.progress
      };
    case 'SET_PROCESSING_FILES':
      return {
        ...state,
        processingFiles: action.count
      };
    case 'SET_TOTAL_FILES':
      return {
        ...state,
        totalFiles: action.count
      };
    case 'CANCEL_DOWNLOAD':
      return {
        ...state,
        isCancelled: true
      };
    case 'RESET_DOWNLOAD_STATE':
      return initialDownloadState;
    default:
      return state;
  }
}

// 自定义Hook，管理下载功能
export const useDownload = (onError: (message: string) => void) => {
  const [downloadState, dispatch] = useReducer(downloadReducer, initialDownloadState);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 检查是否有正在进行的下载
  const isDownloading = downloadState.downloadingPath !== null || downloadState.downloadingFolderPath !== null;

  // 取消下载
  const cancelDownload = useCallback(() => {
    if (!isDownloading) return;

    // 设置取消标志
    dispatch({ type: 'CANCEL_DOWNLOAD' });

    // 中止所有网络请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    logger.info('下载已取消');

    // 重置下载状态
    setTimeout(() => {
      dispatch({ type: 'RESET_DOWNLOAD_STATE' });
    }, 500); // 短暂延迟以便UI可以响应
  }, [isDownloading]);

  // 下载文件
  const downloadFile = useCallback(async (item: GitHubContent) => {
    // 防止同时触发多个下载
    if (downloadState.downloadingPath !== null || downloadState.downloadingFolderPath !== null) {
      onError('已有下载任务正在进行中，请等待当前下载完成');
      return;
    }

    if (!item.download_url) {
      onError('无法获取文件下载链接');
      return;
    }

    dispatch({ type: 'SET_DOWNLOADING_FILE', path: item.path });

    // 创建新的AbortController
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      // 使用代理URL获取文件
      let downloadUrl = item.download_url;

      // 如果是非开发环境或启用了令牌模式，使用服务端API代理
      if (getForceServerProxy()) {
        downloadUrl = `/api/github?action=getFileContent&url=${encodeURIComponent(item.download_url)}`;
      }

      const response = await fetch(downloadUrl, { signal });

      // 检查是否已取消
      if (downloadState.isCancelled) {
        throw new Error('下载已取消');
      }

      if (!response.ok) {
        throw new Error(`下载失败: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();

      // 再次检查是否已取消
      if (downloadState.isCancelled) {
        throw new Error('下载已取消');
      }

      saveAs(blob, item.name);

      logger.info(`文件下载成功: ${item.path}`);
    } catch (e: any) {
      if (e.name === 'AbortError' || downloadState.isCancelled) {
        logger.info('文件下载已取消');
      } else {
      logger.error('下载文件失败:', e);
      onError(`下载文件失败: ${e.message}`);
      }
    } finally {
      abortControllerRef.current = null;
      dispatch({ type: 'SET_DOWNLOADING_FILE', path: null });
    }
  }, [downloadState.downloadingPath, downloadState.downloadingFolderPath, downloadState.isCancelled, onError]);

  // 递归收集文件
  const collectFiles = useCallback(async (
    folderPath: string,
    fileList: { path: string; url: string }[],
    basePath: string,
    signal: AbortSignal
  ) => {
    try {
      // 获取文件夹内容
      const contents = await GitHubService.getContents(folderPath, signal);

      // 检查是否已取消
      if (downloadState.isCancelled) {
        throw new Error('Download cancelled');
      }

      // 处理每个文件/文件夹
      for (const item of contents) {
        // 更新相对路径，去除基本路径前缀
        const relativePath = item.path.startsWith(basePath)
          ? item.path.substring(basePath.length > 0 ? basePath.length + 1 : 0)
          : item.path;

        if (item.type === 'file') {
          // 确保我们有下载链接
          if (!item.download_url) continue;

          // 如果是非开发环境或启用了令牌模式，使用服务端API代理
          let downloadUrl = item.download_url;
          if (getForceServerProxy()) {
            downloadUrl = `/api/github?action=getFileContent&url=${encodeURIComponent(item.download_url)}`;
          }

          fileList.push({
            path: relativePath,
            url: downloadUrl
          });
        } else if (item.type === 'dir') {
          // 递归处理子文件夹
          await collectFiles(item.path, fileList, basePath, signal);
        }
      }
    } catch (e) {
      // 如果是取消导致的错误，抛出
      if (e instanceof Error && (e.name === 'AbortError' || downloadState.isCancelled)) {
        throw e;
      }
      // 其他错误记录但继续处理
      logger.error(`获取文件夹内容失败: ${folderPath}`, e);
    }
  }, [downloadState.isCancelled]);

  // 下载文件夹
  const downloadFolder = useCallback(async (path: string, folderName: string) => {
    // 防止同时触发多个下载
    if (downloadState.downloadingPath !== null || downloadState.downloadingFolderPath !== null) {
      onError('已有下载任务正在进行中，请等待当前下载完成');
      return;
    }

    dispatch({ type: 'SET_DOWNLOADING_FOLDER', path });
    dispatch({ type: 'SET_FOLDER_PROGRESS', progress: 0 });
    dispatch({ type: 'SET_PROCESSING_FILES', count: 0 });
    dispatch({ type: 'SET_TOTAL_FILES', count: 0 });

    // 创建新的AbortController
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      const zip = new JSZip.default();

      // 递归获取文件夹内容
      const allFiles: { path: string; url: string }[] = [];
      await collectFiles(path, allFiles, path, signal);

      // 检查是否已取消
      if (downloadState.isCancelled) {
        throw new Error('下载已取消');
      }

      dispatch({ type: 'SET_TOTAL_FILES', count: allFiles.length });
      logger.info(`需要下载的文件总数: ${allFiles.length}`);

      // 下载并添加到zip
      let processedCount = 0;
      for (const file of allFiles) {
        try {
          // 检查是否已取消
          if (downloadState.isCancelled) {
            throw new Error('下载已取消');
          }

          const response = await fetch(file.url, { signal });

          if (!response.ok) {
            throw new Error(`下载失败: ${response.status}`);
          }

          const blob = await response.blob();
          zip.file(file.path, blob);

          processedCount++;
          dispatch({ type: 'SET_PROCESSING_FILES', count: processedCount });
          dispatch({
            type: 'SET_FOLDER_PROGRESS',
            progress: Math.round((processedCount / allFiles.length) * 100)
          });
        } catch (e) {
          // 检查是否是取消导致的错误
          if (e instanceof Error && (e.name === 'AbortError' || downloadState.isCancelled)) {
            throw e; // 重新抛出以中断循环
          }
          logger.error(`文件 ${file.path} 下载失败:`, e);
        }

        // 检查是否已取消
        if (downloadState.isCancelled) {
          throw new Error('下载已取消');
        }
      }

      // 生成zip文件
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      }, (metadata: any) => {
        // 检查是否已取消
        if (downloadState.isCancelled) return;
        dispatch({ type: 'SET_FOLDER_PROGRESS', progress: Math.round(metadata.percent) });
      });

      // 最后一次检查是否已取消
      if (downloadState.isCancelled) {
        throw new Error('下载已取消');
      }

      saveAs(zipBlob, `${folderName}.zip`);
      logger.info(`文件夹下载完成: ${path}`);
    } catch (e: any) {
      if (e.name === 'AbortError' || downloadState.isCancelled) {
        logger.info('文件夹下载已取消');
      } else {
      logger.error('下载文件夹失败:', e);
      onError(`下载文件夹失败: ${e.message}`);
      }
    } finally {
      abortControllerRef.current = null;
      dispatch({ type: 'RESET_DOWNLOAD_STATE' });
    }
  }, [downloadState.downloadingPath, downloadState.downloadingFolderPath, downloadState.isCancelled, onError, collectFiles]);

  return {
    downloadState,
    downloadFile,
    downloadFolder,
    cancelDownload,
    isDownloading
  };
};
