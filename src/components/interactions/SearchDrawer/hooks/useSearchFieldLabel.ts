import { useMemo } from "react";
import { useI18n } from "@/contexts/I18nContext";

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
  const { t } = useI18n();

  return useMemo(() => {
    const trimmedPath = pathPrefix.trim();
    const pathSuffix = (!isSmallScreen && trimmedPath.length > 0) ? trimmedPath : "";

    // 有分支筛选时
    if (branchFilter.length > 0) {
      const orderedBranches = availableBranches.filter(branch =>
        branchFilter.includes(branch)
      );

      // 小屏幕且多个分支
      if (isSmallScreen && orderedBranches.length > 1) {
        return t('search.label.inMultipleBranches', { count: orderedBranches.length });
      }

      // 大屏幕且超过3个分支
      if (!isSmallScreen && orderedBranches.length > 3) {
        const displayBranches = orderedBranches.slice(0, 3).join("、");
        if (pathSuffix !== "") {
          return t('search.label.inMultipleBranchesWithPath', {
            branches: displayBranches,
            count: orderedBranches.length,
            path: pathSuffix
          });
        }
        return t('search.label.inMultipleBranches', { count: orderedBranches.length });
      }

      // 正常显示所有分支
      const displayBranches = orderedBranches.join("、");
      if (pathSuffix !== "") {
        return t('search.label.inBranchesWithPath', { branches: displayBranches, path: pathSuffix });
      }
      return t('search.label.inBranches', { branches: displayBranches });
    }

    // 无分支筛选时，使用当前分支
    const fallbackBranch = currentBranch !== "" ? currentBranch : defaultBranch;
    if (fallbackBranch === "") {
      return t('search.label.default');
    }
    if (pathSuffix !== "") {
      return t('search.label.inBranchesWithPath', { branches: fallbackBranch, path: pathSuffix });
    }
    return t('search.label.inBranch', { branch: fallbackBranch });
  }, [branchFilter, availableBranches, currentBranch, defaultBranch, pathPrefix, isSmallScreen, t]);
};

