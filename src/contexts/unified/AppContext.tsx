import { useSnackbar } from "notistack";
import {
  createContext, ReactNode, useCallback, useContext, useMemo, type Context,
} from "react";
import { useDownload } from "../../hooks/useDownload";
import { useFilePreview } from "../../hooks/useFilePreview";
import { useGitHubContent } from "../../hooks/useGitHubContent";
import type { GitHubContent } from "../../types";

export type NavigationDirection = "forward" | "backward" | "none";

type ContentHookResult = ReturnType<typeof useGitHubContent>;
type PreviewHookResult = ReturnType<typeof useFilePreview>;
type DownloadHookResult = ReturnType<typeof useDownload>;

interface ContentContextValue {
  currentPath: ContentHookResult["currentPath"];
  contents: ContentHookResult["contents"];
  readmeContent: ContentHookResult["readmeContent"];
  loading: ContentHookResult["loading"];
  loadingReadme: ContentHookResult["loadingReadme"];
  readmeLoaded: ContentHookResult["readmeLoaded"];
  error: ContentHookResult["error"];
  navigationDirection: ContentHookResult["navigationDirection"];
  repoOwner: ContentHookResult["repoOwner"];
  repoName: ContentHookResult["repoName"];
  setCurrentPath: ContentHookResult["setCurrentPath"];
  navigateTo: (path: string, direction?: NavigationDirection) => void;
  refresh: () => void;
  handleRetry: () => void;
  findFileItemByPath: (pathOrFileName: string) => GitHubContent | undefined;
}

interface PreviewContextValue {
  previewState: PreviewHookResult["previewState"] & {
    previewingPdfItem: PreviewHookResult["previewState"]["previewingItem"] | null;
  };
  currentPreviewItemRef: PreviewHookResult["currentPreviewItemRef"];
  selectFile: PreviewHookResult["selectFile"];
  closePreview: PreviewHookResult["closePreview"];
  toggleImageFullscreen: PreviewHookResult["toggleImageFullscreen"];
  handleImageError: PreviewHookResult["handleImageError"];
}

interface DownloadContextValue {
  downloadState: DownloadHookResult["downloadState"];
  downloadFile: DownloadHookResult["downloadFile"];
  downloadFolder: DownloadHookResult["downloadFolder"];
  cancelDownload: DownloadHookResult["cancelDownload"];
}

const ContentContext = createContext<ContentContextValue | null>(null);
const PreviewContext = createContext<PreviewContextValue | null>(null);
const DownloadContext = createContext<DownloadContextValue | null>(null);

interface AppContextProviderProps {
  children: ReactNode;
}

export function AppContextProvider({ children }: AppContextProviderProps) {
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
    (path: string, direction: NavigationDirection = "forward") => {
      setCurrentPath(path, direction);
    },
    [setCurrentPath],
  );

  const refresh = useCallback(() => {
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

function useRequiredContext<T>(context: Context<T | null>, name: string): T {
  const value = useContext(context);
  if (!value) {
    throw new Error(`${name} 必须在 AppContextProvider 内部使用`);
  }
  return value;
}

export const useContentContext = (): ContentContextValue =>
  useRequiredContext(ContentContext, "useContentContext");

export const usePreviewContext = (): PreviewContextValue =>
  useRequiredContext(PreviewContext, "usePreviewContext");

export const useDownloadContext = (): DownloadContextValue =>
  useRequiredContext(DownloadContext, "useDownloadContext");
