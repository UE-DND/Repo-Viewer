import { useContext, useState, useCallback, useEffect, useRef } from "react";
import {
  Box,
  IconButton,
  Tooltip,
  useTheme,
} from "@mui/material";
import {
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  GitHub as GitHubIcon,
  SearchRounded as SearchIcon,
} from "@mui/icons-material";
import { ColorModeContext } from "@/contexts/colorModeContext";
import { useRefresh } from "@/hooks/useRefresh";
import { GitHub } from "@/services/github";
import axios from "axios";
import { getGithubConfig } from "@/config";
import { logger } from "@/utils";
import { useContentContext } from "@/contexts/unified";
import SearchDrawer from "@/components/interactions/SearchDrawer";

/**
 * 仓库信息接口
 */
interface RepoInfo {
  repoOwner: string;
  repoName: string;
}

/**
 * GitHub配置状态类型
 */
type GitHubConfigStatus = "success" | "error";

/**
 * GitHub配置响应接口
 */
interface GitHubConfigResponse {
  status?: GitHubConfigStatus;
  data?: Partial<RepoInfo>;
}

/**
 * 工具栏按钮组件属性接口
 */
interface ToolbarButtonsProps {
  showBreadcrumbInToolbar?: boolean;
  isSmallScreen?: boolean;
}

interface RefreshSessionState {
  version: number;
  branch?: string;
  path?: string;
  timestamp: number;
}

/**
 * 工具栏按钮组件
 *
 * 提供主题切换、刷新和跳转到GitHub等功能按钮。
 */
const ToolbarButtons: React.FC<ToolbarButtonsProps> = ({
  showBreadcrumbInToolbar = false,
  isSmallScreen = false,
}) => {
  const { toggleColorMode } = useContext(ColorModeContext);
  const theme = useTheme();
  const handleRefresh = useRefresh();
  const [searchDrawerOpen, setSearchDrawerOpen] = useState<boolean>(false);
  const [repoInfo, setRepoInfo] = useState<RepoInfo>(() => {
    const githubConfig = getGithubConfig();
    return {
      repoOwner: githubConfig.repoOwner,
      repoName: githubConfig.repoName,
    };
  });
  const {
    currentBranch,
    defaultBranch,
    currentPath,
    branches: _branches,
    branchLoading: _branchLoading,
    branchError: _branchError,
    setCurrentBranch,
    refreshBranches,
    setCurrentPath,
  } = useContentContext();

  const BROWSER_REFRESH_FLAG = "repo-viewer:pending-refresh";
  const refreshSyncHandledRef = useRef<boolean>(false);
  const storedRefreshStateRef = useRef<RefreshSessionState | null>(null);
  const branchValueRef = useRef(currentBranch);
  const pathValueRef = useRef(currentPath);

  useEffect(() => {
    branchValueRef.current = currentBranch;
  }, [currentBranch]);

  useEffect(() => {
    pathValueRef.current = currentPath;
  }, [currentPath]);

  const buildRefreshSessionState = useCallback((): RefreshSessionState => ({
    version: 1,
    branch: branchValueRef.current,
    path: pathValueRef.current,
    timestamp: Date.now(),
  }), []);

  useEffect(() => {
    const handleBeforeUnload = (): void => {
      try {
        const state = buildRefreshSessionState();
        sessionStorage.setItem(BROWSER_REFRESH_FLAG, JSON.stringify(state));
      } catch (error) {
        logger.debug("无法在刷新前缓存状态标记", error);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [buildRefreshSessionState]);

  useEffect(() => {
    if (refreshSyncHandledRef.current) {
      return;
    }

    let isActive = true;

    const readStoredRefreshState = (): RefreshSessionState | null => {
      try {
        const raw = sessionStorage.getItem(BROWSER_REFRESH_FLAG);
        if (raw === null) {
          return null;
        }

        if (raw === "1") {
          return {
            version: 0,
            timestamp: Date.now(),
          };
        }

        const parsed = JSON.parse(raw) as Partial<RefreshSessionState> | null;

        if (parsed === null || typeof parsed !== "object") {
          return null;
        }

        const state: RefreshSessionState = {
          version: typeof parsed.version === "number" ? parsed.version : 0,
          timestamp: typeof parsed.timestamp === "number" ? parsed.timestamp : Date.now(),
        };

        if (typeof parsed.branch === "string") {
          state.branch = parsed.branch;
        }

        if (typeof parsed.path === "string") {
          state.path = parsed.path;
        }

        return state;
      } catch (error) {
        logger.debug("解析刷新状态标记失败", error);
        return null;
      }
    };

    const isReloadNavigation = (): boolean => {
      try {
        const entries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
        const navigationEntry = entries[0];

        if (navigationEntry !== undefined) {
          return navigationEntry.type === "reload";
        }
      } catch (error) {
        logger.debug("检测浏览器刷新时发生错误", error);
      }

      return false;
    };

    const shouldTriggerRefresh = (): boolean => {
      storedRefreshStateRef.current = readStoredRefreshState();

      if (storedRefreshStateRef.current !== null) {
        return true;
      }

      try {
        if (sessionStorage.getItem(BROWSER_REFRESH_FLAG) === "1") {
          return true;
        }
      } catch (error) {
        logger.debug("读取刷新状态标记失败", error);
      }

      return isReloadNavigation();
    };

    if (!shouldTriggerRefresh()) {
      return () => {
        isActive = false;
      };
    }

    refreshSyncHandledRef.current = true;

    try {
      sessionStorage.removeItem(BROWSER_REFRESH_FLAG);
    } catch (error) {
      logger.debug("移除刷新状态标记失败", error);
    }

    const applyStoredState = (): void => {
      const storedState = storedRefreshStateRef.current;

      if (storedState === null) {
        return;
      }

      const targetBranch = typeof storedState.branch === "string" ? storedState.branch.trim() : "";
      const targetPath = typeof storedState.path === "string" ? storedState.path : null;
      let branchChanged = false;

      if (targetBranch.length > 0 && targetBranch !== branchValueRef.current) {
        setCurrentBranch(targetBranch);
        branchChanged = true;
      }

      if (targetPath !== null) {
        const restorePath = (): void => {
          setCurrentPath(targetPath, "none");
        };

        if (branchChanged) {
          window.setTimeout(restorePath, 0);
        } else if (targetPath !== pathValueRef.current) {
          restorePath();
        }
      }
    };

    applyStoredState();

    const runRefresh = async (): Promise<void> => {
      try {
        await GitHub.Cache.clearCache();
      } catch (error) {
        logger.error("清除缓存失败:", error);
      }

      if (!isActive) {
        return;
      }

      logger.info("检测到浏览器刷新，执行同步刷新逻辑");
      handleRefresh();
      void refreshBranches();
    };

    if (storedRefreshStateRef.current !== null) {
      const schedule = typeof window.requestAnimationFrame === "function"
        ? window.requestAnimationFrame.bind(window)
        : (callback: FrameRequestCallback): void => {
            window.setTimeout(() => {
              callback(performance.now());
            }, 0);
          };

      schedule(() => {
        void runRefresh();
      });
    } else {
      void runRefresh();
    }

    return () => {
      isActive = false;
    };
  }, [handleRefresh, refreshBranches, setCurrentBranch, setCurrentPath]);

  // 在组件加载时获取仓库信息
  useEffect(() => {
    const fetchRepoInfo = async (): Promise<void> => {
      try {
        // 尝试从API获取仓库信息
        const response = await axios.get<GitHubConfigResponse>(
          "/api/github?action=getConfig",
        );
        if (response.data.status === "success") {
          const { repoOwner, repoName } = response.data.data ?? {};
          if (
            typeof repoOwner === "string" &&
            repoOwner.length > 0 &&
            typeof repoName === "string" &&
            repoName.length > 0
          ) {
            setRepoInfo({ repoOwner, repoName });
          }
        }
      } catch (error) {
        // 如果API请求失败，保持使用默认值或环境变量值
        logger.error("获取仓库信息失败:", error);
      }
    };

    void fetchRepoInfo();
  }, []);

  // 处理主题切换按钮点击
  const onThemeToggleClick = useCallback(() => {
    // 执行主题切换（事件将在 useThemeMode 中自动发出）
    toggleColorMode();
  }, [toggleColorMode]);

  // 处理GitHub按钮点击
  const onGitHubClick = useCallback(() => {
    const { repoOwner, repoName } = repoInfo;

    const pathname = window.location.pathname.slice(1);
    const hash = window.location.hash;
    const activeBranch = currentBranch !== "" ? currentBranch : defaultBranch;
    const encodedBranch = encodeURIComponent(activeBranch);

    const encodeSegment = (segment: string): string => {
      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch (error) {
        logger.debug("路径片段解码失败，使用原始片段", error);
        return encodeURIComponent(segment);
      }
    };

    const safePath = pathname
      .split("/")
      .filter((segment) => segment.length > 0)
      .map(encodeSegment)
      .join("/");

    let githubUrl = `https://github.com/${repoOwner}/${repoName}`;

    const previewRegex = /#preview=([^&]+)/;
    const previewMatch = previewRegex.exec(hash);
    const previewTarget = previewMatch?.[1];
    const hasPathname = safePath.length > 0;

    if (
      typeof previewTarget === "string" &&
      previewTarget.length > 0 &&
      hasPathname
    ) {
      let decodedFileName = previewTarget;
      try {
        decodedFileName = decodeURIComponent(previewTarget);
      } catch (error) {
        logger.debug("预览文件名解码失败，使用原始值", error);
      }
      const safeFileName = encodeURIComponent(decodedFileName);
      githubUrl += `/blob/${encodedBranch}/${safePath}/${safeFileName}`;
    } else if (hasPathname) {
      githubUrl += `/tree/${encodedBranch}/${safePath}`;
    } else {
      githubUrl += `/tree/${encodedBranch}`;
    }

    window.open(githubUrl, "_blank");
  }, [repoInfo, currentBranch, defaultBranch]);

  const openSearchDrawer = useCallback(() => {
    setSearchDrawerOpen(true);
  }, []);

  const closeSearchDrawer = useCallback(() => {
    setSearchDrawerOpen(false);
  }, []);

  // 保留分支逻辑但不显示UI：这些代码确保分支功能的后台逻辑正常工作
  // branchLabelId, handleBranchChange, handleBranchOpen, branchOptions 等
  // 虽然不再渲染UI，但保留这些逻辑以备将来需要或其他组件调用

  const isHomePage = currentPath.trim().length === 0;
  const shouldHideButtons = isSmallScreen && showBreadcrumbInToolbar && !isHomePage;

  return (
    <>
      <Box
        sx={{
          display: "flex",
          gap: 1,
          alignItems: "center",
          transform: shouldHideButtons
            ? { xs: 'translateX(120px)', sm: 'translateX(0)' }
            : 'translateX(0)',
          opacity: shouldHideButtons ? 0 : 1,
          transition: shouldHideButtons
            ? 'none'
            : 'all 0.2s ease-out',
          pointerEvents: shouldHideButtons ? 'none' : 'auto',
          position: shouldHideButtons ? { xs: 'absolute', sm: 'relative' } : 'relative',
          right: shouldHideButtons ? { xs: 0, sm: 'auto' } : 'auto',
        }}
        data-oid="7:zr_jb"
      >
        <Tooltip title="搜索仓库文件" data-oid="toolbar-search">
          <span>
            <IconButton
              color="inherit"
              onClick={openSearchDrawer}
              data-oid="toolbar-search-button"
            >
              <SearchIcon />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="在GitHub中查看" data-oid="f.rvw_c">
          <IconButton
            color="inherit"
            onClick={onGitHubClick}
            sx={{
            "&:hover": {
              color: theme.palette.primary.light,
            },
          }}
          data-oid="jdbz_el"
        >
          <GitHubIcon data-oid="nw02ywc" />
        </IconButton>
      </Tooltip>

      {/* 主题切换按钮 - 点击时不会触发内容重新加载 */}
      <Tooltip
        title={theme.palette.mode === "dark" ? "浅色模式" : "深色模式"}
        data-oid="skn4izp"
      >
        <IconButton
          onClick={onThemeToggleClick}
          color="inherit"
          sx={{
            "&:hover": {
              color:
                theme.palette.mode === "dark"
                  ? theme.palette.warning.light
                  : theme.palette.primary.light,
            },
          }}
          data-oid="90u9cza"
        >
          {theme.palette.mode === "dark" ? (
            <LightModeIcon data-oid="-y49csw" />
          ) : (
            <DarkModeIcon data-oid="mo0ub3d" />
          )}
        </IconButton>
      </Tooltip>
      </Box>
      <SearchDrawer open={searchDrawerOpen} onClose={closeSearchDrawer} />
    </>
  );
};

export default ToolbarButtons;
