import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useGitHubContent } from '../../hooks/useGitHubContent';
import { useStateActions } from './state';

type ContentManagerValue = ReturnType<typeof useGitHubContent>;

const ContentManagerContext = createContext<ContentManagerValue | null>(null);

export const ContentManagerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const contentManager = useGitHubContent();
  const actions = useStateActions();

  const {
    currentPath,
    contents,
    readmeContent,
    loading,
    loadingReadme,
    readmeLoaded,
    error,
    navigationDirection,
    repoOwner,
    repoName,
  } = contentManager;

  useEffect(() => {
    actions.setState((prevState) => ({
      content: {
        ...prevState.content,
        currentPath,
        contents,
        readmeContent,
        loading,
        loadingReadme,
        readmeLoaded,
        error,
        navigationDirection,
        repoOwner,
        repoName,
      },
    }));
  }, [
    actions,
    currentPath,
    contents,
    readmeContent,
    loading,
    loadingReadme,
    readmeLoaded,
    error,
    navigationDirection,
    repoOwner,
    repoName,
  ]);

  return (
    <ContentManagerContext.Provider value={contentManager}>
      {children}
    </ContentManagerContext.Provider>
  );
};

export const useContentManager = (): ContentManagerValue => {
  const context = useContext(ContentManagerContext);

  if (!context) {
    throw new Error('useContentManager must be used within ContentManagerProvider');
  }

  return context;
};
