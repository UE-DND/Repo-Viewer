import React, { ReactNode } from "react";
import { StateManagerProvider } from "./StateManagerProvider";
import { ContentManagerProvider } from "./ContentManagerProvider";

export const AppContextProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  return (
    <StateManagerProvider>
      <ContentManagerProvider>
        {children}
      </ContentManagerProvider>
    </StateManagerProvider>
  );
};

export {
  useContentContext as useContent,
  usePreviewContext as usePreview,
  useDownloadContext,
  useMetadataContext as useMetadata,
} from "./compatibilityHooks";

export type { NavigationDirection } from "./state";
