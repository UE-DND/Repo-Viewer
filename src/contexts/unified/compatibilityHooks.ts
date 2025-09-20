import { useCallback, useEffect } from 'react';
import { useStateSelector, useStateActions, NavigationDirection } from './state';
import { useSnackbar } from 'notistack';
import { useGitHubContent } from '../../hooks/useGitHubContent';
import { useFilePreview } from '../../hooks/useFilePreview';
import { useDownload } from '../../hooks/useDownload';

// Content Context 兼容Hook
export function useContentContext() {
  const actions = useStateActions();
  
  // 选择性订阅content相关状态
  const contentState = useStateSelector(state => state.content);
  
  // 使用原有的Hook逻辑，但状态由统一管理器管理
  const contentManager = useGitHubContent();
  
  // 同步状态到统一管理器
  useEffect(() => {
    actions.setState(prevState => ({
      content: {
        ...prevState.content,
        currentPath: contentManager.currentPath,
        contents: contentManager.contents,
        readmeContent: contentManager.readmeContent,
        loading: contentManager.loading,
        loadingReadme: contentManager.loadingReadme,
        readmeLoaded: contentManager.readmeLoaded,
        error: contentManager.error,
        navigationDirection: contentManager.navigationDirection,
        repoOwner: contentManager.repoOwner,
        repoName: contentManager.repoName,
      }
    }));
  }, [
    contentManager.currentPath,
    contentManager.contents,
    contentManager.readmeContent,
    contentManager.loading,
    contentManager.loadingReadme,
    contentManager.readmeLoaded,
    contentManager.error,
    contentManager.navigationDirection,
    contentManager.repoOwner,
    contentManager.repoName,
    actions
  ]);

  // 查找文件的回调
  const findFileItemByPath = useCallback(
    (pathOrFileName: string) => {
      return contentState.contents.find(
        (item) => item.path === pathOrFileName || 
                 item.name === pathOrFileName ||
                 item.path.endsWith(`/${pathOrFileName}`)
      );
    },
    [contentState.contents]
  );

  // 导航和操作方法
  const navigateTo = useCallback(
    (path: string, direction: NavigationDirection = "forward") => {
      contentManager.setCurrentPath(path, direction);
    },
    [contentManager.setCurrentPath]
  );

  const refresh = useCallback(() => {
    contentManager.refreshContents();
  }, [contentManager.refreshContents]);

  const handleRetry = useCallback(() => {
    contentManager.refreshContents();
  }, [contentManager.refreshContents]);

  return {
    // 状态
    currentPath: contentState.currentPath,
    contents: contentState.contents,
    readmeContent: contentState.readmeContent,
    loading: contentState.loading,
    loadingReadme: contentState.loadingReadme,
    readmeLoaded: contentState.readmeLoaded,
    error: contentState.error,
    navigationDirection: contentState.navigationDirection,
    repoOwner: contentState.repoOwner,
    repoName: contentState.repoName,
    
    // 方法
    navigateTo,
    setCurrentPath: contentManager.setCurrentPath,
    refresh,
    handleRetry,
    findFileItemByPath,
  };
}

// Preview Context 兼容Hook
export function usePreviewContext() {
  const actions = useStateActions();
  const { enqueueSnackbar } = useSnackbar();
  
  // 选择性订阅preview相关状态
  const previewState = useStateSelector(state => state.preview);
  // 选择性订阅content状态以避免循环依赖
  const contentState = useStateSelector(state => state.content);
  
  // 查找文件的回调 - 避免循环依赖
  const findFileItemByPath = useCallback(
    (pathOrFileName: string) => {
      return contentState.contents.find(
        (item) => item.path === pathOrFileName || 
                 item.name === pathOrFileName ||
                 item.path.endsWith(`/${pathOrFileName}`)
      );
    },
    [contentState.contents]
  );
  
  // 错误处理函数
  const handleError = useCallback((message: string) => {
    enqueueSnackbar(message, { variant: "error" });
  }, [enqueueSnackbar]);

  // 使用原有的Hook逻辑
  const previewManager = useFilePreview(handleError, findFileItemByPath);
  
  // 同步状态到统一管理器
  useEffect(() => {
    actions.setState(prevState => ({
      preview: {
        ...prevState.preview,
        previewingItem: previewManager.previewState.previewingItem,
        previewingImageItem: previewManager.previewState.previewingImageItem,
        previewingOfficeItem: previewManager.previewState.previewingOfficeItem,
        imagePreviewUrl: previewManager.previewState.imagePreviewUrl,
        officePreviewUrl: previewManager.previewState.officePreviewUrl,
        officeFileType: previewManager.previewState.officeFileType,
        isOfficeFullscreen: previewManager.previewState.isOfficeFullscreen,
        currentPreviewItemRef: previewManager.currentPreviewItemRef,
      }
    }));
  }, [
    previewManager.previewState,
    previewManager.currentPreviewItemRef,
    actions
  ]);

  return {
    previewState: {
      previewingItem: previewState.previewingItem,
      previewingImageItem: previewState.previewingImageItem,
      previewingOfficeItem: previewState.previewingOfficeItem,
      imagePreviewUrl: previewState.imagePreviewUrl,
      officePreviewUrl: previewState.officePreviewUrl,
      officeFileType: previewState.officeFileType,
      isOfficeFullscreen: previewState.isOfficeFullscreen,
      // 向后兼容 - 为了处理旧代码中的previewingPdfItem引用
      previewingPdfItem: null as any
    },
    currentPreviewItemRef: previewState.currentPreviewItemRef,
    selectFile: previewManager.selectFile,
    closePreview: previewManager.closePreview,
    toggleImageFullscreen: previewManager.toggleImageFullscreen,
    handleImageError: previewManager.handleImageError,
  };
}

// Download Context 兼容Hook
export function useDownloadContext() {
  const actions = useStateActions();
  const { enqueueSnackbar } = useSnackbar();
  
  // 选择性订阅download相关状态
  const downloadState = useStateSelector(state => state.download);
  
  // 错误处理函数
  const handleError = useCallback((message: string) => {
    enqueueSnackbar(message, { variant: "error" });
  }, [enqueueSnackbar]);

  // 使用原有的Hook逻辑
  const downloadManager = useDownload(handleError);
  
  // 同步状态到统一管理器
  useEffect(() => {
    actions.setState(prevState => ({
      download: {
        ...prevState.download,
        downloadingPath: downloadManager.downloadState.downloadingPath,
        downloadingFolderPath: downloadManager.downloadState.downloadingFolderPath,
        folderDownloadProgress: downloadManager.downloadState.folderDownloadProgress,
      }
    }));
  }, [
    downloadManager.downloadState,
    actions
  ]);

  return {
    downloadState: {
      downloadingPath: downloadState.downloadingPath,
      downloadingFolderPath: downloadState.downloadingFolderPath,
      folderDownloadProgress: downloadState.folderDownloadProgress,
    },
    downloadFile: downloadManager.downloadFile,
    downloadFolder: downloadManager.downloadFolder,
    cancelDownload: downloadManager.cancelDownload,
  };
}

// Metadata Context 兼容Hook
export function useMetadataContext() {
  const actions = useStateActions();
  
  // 选择性订阅metadata相关状态
  const metadataState = useStateSelector(state => state.metadata);
  
  // 更新方法
  const setTitle = useCallback((title: string) => {
    actions.setState(prevState => ({
      metadata: { ...prevState.metadata, title }
    }));
  }, [actions]);
  
  const setDescription = useCallback((description: string) => {
    actions.setState(prevState => ({
      metadata: { ...prevState.metadata, description }
    }));
  }, [actions]);
  
  const setKeywords = useCallback((keywords: string) => {
    actions.setState(prevState => ({
      metadata: { ...prevState.metadata, keywords }
    }));
  }, [actions]);
  
  const setOgImage = useCallback((ogImage: string) => {
    actions.setState(prevState => ({
      metadata: { ...prevState.metadata, ogImage }
    }));
  }, [actions]);
  
  const resetMetadata = useCallback(() => {
    const siteConfig = require('../../config').getSiteConfig();
    actions.setState(() => ({
      metadata: {
        title: siteConfig.title,
        description: siteConfig.description,
        keywords: siteConfig.keywords,
        ogImage: siteConfig.ogImage,
      }
    }));
  }, [actions]);
  
  const updateMetadata = useCallback((data: Partial<typeof metadataState>) => {
    actions.setState(prevState => ({
      metadata: { ...prevState.metadata, ...data }
    }));
  }, [actions]);

  return {
    title: metadataState.title,
    description: metadataState.description,
    keywords: metadataState.keywords,
    ogImage: metadataState.ogImage,
    setTitle,
    setDescription,
    setKeywords,
    setOgImage,
    resetMetadata,
    updateMetadata,
  };
}

