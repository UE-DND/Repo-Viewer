import { useSnackbar } from "notistack";
import type { ReactNode, ReactElement } from "react";
import { useCallback, useMemo } from "react";
import { useDownload } from "@/hooks/useDownload";
import { useFilePreview } from "@/hooks/useFilePreview";
import { useGitHubContent } from "@/hooks/useGitHubContent";
import {
  ContentContext,
  PreviewContext,
  DownloadContext,
  type ContentContextValue,
  type PreviewContextValue,
  type DownloadContextValue,
  type NavigationDirection,
} from "./context";

interface AppContextProviderProps {
  children: ReactNode;
}

export function AppContextProvider({ children }: AppContextProviderProps): ReactElement {
  const content = useGitHubContent();
  const { enqueueSnackbar } = useSnackbar();

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
    setCurrentPath,
    refreshContents,
  } = content;

  const handleError = useCallback(
    (message: string) => {
      enqueueSnackbar(message, { variant: "error" });
    },
    [enqueueSnackbar],
  );

  const findFileItemByPath = useCallback(
    (pathOrFileName: string) =>
      contents.find(
        (item) =>
          item.path === pathOrFileName ||
          item.name === pathOrFileName ||
          item.path.endsWith(`/${pathOrFileName}`),
      ),
    [contents],
  );

  const preview = useFilePreview(handleError, findFileItemByPath);
  const download = useDownload(handleError);

  const navigateTo = useCallback(
    (path: string, direction: NavigationDirection = "forward"): void => {
      setCurrentPath(path, direction);
    },
    [setCurrentPath],
  );

  const refresh = useCallback((): void => {
    refreshContents();
  }, [refreshContents]);

  const contentValue = useMemo<ContentContextValue>(
    () => ({
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
      setCurrentPath,
      navigateTo,
      refresh,
      handleRetry: refresh,
      findFileItemByPath,
    }),
    [
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
      setCurrentPath,
      navigateTo,
      refresh,
      findFileItemByPath,
    ],
  );

  const previewValue = useMemo<PreviewContextValue>(
    () => ({
      previewState: {
        ...preview.previewState,
        previewingPdfItem: null,
      },
      currentPreviewItemRef: preview.currentPreviewItemRef,
      selectFile: preview.selectFile,
      closePreview: preview.closePreview,
      toggleImageFullscreen: preview.toggleImageFullscreen,
      handleImageError: preview.handleImageError,
    }),
    [
      preview.previewState,
      preview.currentPreviewItemRef,
      preview.selectFile,
      preview.closePreview,
      preview.toggleImageFullscreen,
      preview.handleImageError,
    ],
  );

  const downloadValue = useMemo<DownloadContextValue>(
    () => ({
      downloadState: download.downloadState,
      downloadFile: download.downloadFile,
      downloadFolder: download.downloadFolder,
      cancelDownload: download.cancelDownload,
    }),
    [
      download.downloadState,
      download.downloadFile,
      download.downloadFolder,
      download.cancelDownload,
    ],
  );



  return (
    <ContentContext.Provider value={contentValue}>
      <PreviewContext.Provider value={previewValue}>
        <DownloadContext.Provider value={downloadValue}>
          {children}
        </DownloadContext.Provider>
      </PreviewContext.Provider>
    </ContentContext.Provider>
  );
}
