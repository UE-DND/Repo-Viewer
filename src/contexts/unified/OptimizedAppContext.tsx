import React, { ReactNode } from "react";
import { StateManagerProvider } from "./StateManagerProvider";

// 优化的应用Context提供者
export const OptimizedAppContextProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  return (
    <StateManagerProvider>
      {children}
    </StateManagerProvider>
  );
};

// 重新导出兼容性Hook
export {
  useContentContext as useContent,
  usePreviewContext as usePreview,
  useDownloadContext,
  useMetadataContext as useMetadata,
} from "./compatibilityHooks";

// 保持原有的类型导出
export type { NavigationDirection } from "./state";
