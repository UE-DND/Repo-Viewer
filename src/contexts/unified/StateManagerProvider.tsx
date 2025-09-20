import React, { ReactNode, useMemo } from 'react';
import { StateManager, StateManagerContext, GlobalState, NavigationDirection } from './state';
import { getSiteConfig } from '../../config';

// 获取默认配置
const siteConfig = getSiteConfig();

// 创建初始状态
function createInitialState(): GlobalState {
  return {
    content: {
      currentPath: '',
      contents: [],
      readmeContent: null,
      loading: false,
      loadingReadme: false,
      readmeLoaded: false,
      error: null,
      navigationDirection: 'none' as NavigationDirection,
      repoOwner: '',
      repoName: '',
    },
    preview: {
      previewingItem: null,
      previewingImageItem: null,
      previewingOfficeItem: null,
      imagePreviewUrl: null,
      officePreviewUrl: null,
      officeFileType: null,
      isOfficeFullscreen: false,
      currentPreviewItemRef: { current: null },
    },
    download: {
      downloadingPath: null,
      downloadingFolderPath: null,
      folderDownloadProgress: 0,
    },
    metadata: {
      title: siteConfig.title,
      description: siteConfig.description,
      keywords: siteConfig.keywords,
      ogImage: siteConfig.ogImage,
    },
  };
}

interface StateManagerProviderProps {
  children: ReactNode;
}

export const StateManagerProvider: React.FC<StateManagerProviderProps> = ({ children }) => {
  // 创建状态管理器实例
  const stateManager = useMemo(() => {
    return new StateManager(createInitialState());
  }, []);

  return (
    <StateManagerContext.Provider value={stateManager}>
      {children}
    </StateManagerContext.Provider>
  );
};
