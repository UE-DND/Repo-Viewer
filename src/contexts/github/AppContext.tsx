import React, { ReactNode } from "react";
import { AppContextProvider as UnifiedAppContextProvider } from "../unified";
import { SearchProvider } from "./SearchContext";

/**
 * GitHub 应用上下文提供者
 * 负责组合搜索上下文与统一的状态管理上下文
 */
export const AppContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => (
  <SearchProvider>
    <UnifiedAppContextProvider>{children}</UnifiedAppContextProvider>
  </SearchProvider>
);

export { AppContextProvider as GitHubProvider };
