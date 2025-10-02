import { GitHubContent } from "@/types";

export interface MarkdownPreviewProps {
  readmeContent: string | null;
  loadingReadme: boolean;
  isSmallScreen: boolean;
  onClose?: () => void;
  previewingItem?: GitHubContent | null;
  lazyLoad?: boolean;
}