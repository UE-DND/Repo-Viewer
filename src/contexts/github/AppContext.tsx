import React, { ReactNode } from "react";
import { ContentProvider } from "./ContentContext";
import { PreviewProvider } from "./PreviewContext";
import { DownloadProvider } from "./DownloadContext";
import { SearchProvider } from "./SearchContext";

// 组合所有Context的应用提供者
export const AppContextProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  return (
    <SearchProvider>
      <ContentProvider>
        <PreviewProvider>
          <DownloadProvider>
            {children}
          </DownloadProvider>
        </PreviewProvider>
      </ContentProvider>
    </SearchProvider>
  );
};

// 重新导出所有的Hook，便于使用
export { useContent } from "./ContentContext";
export type { NavigationDirection } from "./ContentContext";
export { usePreview } from "./PreviewContext";
export { useDownloadContext } from "./DownloadContext";
export { useSearch } from "./SearchContext";
