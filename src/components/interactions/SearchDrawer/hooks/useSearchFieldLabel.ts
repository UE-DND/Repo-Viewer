import { useMemo } from "react";

interface UseSearchFieldLabelProps {
  branchFilter: string[];
  availableBranches: string[];
  currentBranch: string;
  defaultBranch: string;
  pathPrefix: string;
  isSmallScreen: boolean;
}

/**
 * 搜索框标签 Hook
 * 根据筛选条件动态生成搜索框的标签文本
 */
export const useSearchFieldLabel = ({
  branchFilter,
  availableBranches,
  currentBranch,
  defaultBranch,
  pathPrefix,
  isSmallScreen
}: UseSearchFieldLabelProps): string => {
  return useMemo(() => {
    const trimmedPath = pathPrefix.trim();
    const pathSuffix = (!isSmallScreen && trimmedPath.length > 0) ? `: ${trimmedPath}` : "";

    // 有分支筛选时
    if (branchFilter.length > 0) {
      const orderedBranches = availableBranches.filter(branch => 
        branchFilter.includes(branch)
      );

      // 小屏幕且多个分支
      if (isSmallScreen && orderedBranches.length > 1) {
        return `在 ${orderedBranches.length.toString()} 个分支中搜索`;
      }

      // 大屏幕且超过3个分支
      if (!isSmallScreen && orderedBranches.length > 3) {
        const displayBranches = orderedBranches.slice(0, 3).join("、");
        return `在 ${displayBranches} 等 ${orderedBranches.length.toString()} 个分支${pathSuffix} 中搜索`;
      }

      // 正常显示所有分支
      const displayBranches = orderedBranches.join("、");
      return `在 ${displayBranches}${pathSuffix} 中搜索`;
    }

    // 无分支筛选时，使用当前分支
    const fallbackBranch = currentBranch !== "" ? currentBranch : defaultBranch;
    return fallbackBranch === "" 
      ? "在仓库中搜索" 
      : `在 ${fallbackBranch}${pathSuffix} 中搜索`;
  }, [branchFilter, availableBranches, currentBranch, defaultBranch, pathPrefix, isSmallScreen]);
};

