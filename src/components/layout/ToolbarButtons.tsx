import { useContext, useState, useCallback, useEffect } from "react";
import {
  Box,
  IconButton,
  Tooltip,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import {
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Refresh as RefreshIcon,
  GitHub as GitHubIcon,
} from "@mui/icons-material";
import { ColorModeContext } from "@/contexts/colorModeContext";
import { useRefresh } from "@/hooks/useRefresh";
import { pulseAnimation, refreshAnimation } from "@/theme/animations";
import { GitHubService } from "@/services/github";
import axios from "axios";
import { getGithubConfig } from "@/config";
import { logger } from "@/utils";
import { useContentContext } from "@/contexts/unified";

interface RepoInfo {
  repoOwner: string;
  repoName: string;
}

type GitHubConfigStatus = "success" | "error";

interface GitHubConfigResponse {
  status?: GitHubConfigStatus;
  data?: Partial<RepoInfo>;
}

// 工具栏按钮组件
const ToolbarButtons: React.FC = () => {
  const { toggleColorMode } = useContext(ColorModeContext);
  const theme = useTheme();
  const handleRefresh = useRefresh();
  const [isRefreshing, setIsRefreshing] = useState(false);
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
    branches,
    branchLoading,
    branchError,
    setCurrentBranch,
    refreshBranches,
  } = useContentContext();

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

  // 处理刷新按钮点击
  const onRefreshClick = useCallback(() => {
    if (isRefreshing) {
      return; // 防止重复点击
    }

    setIsRefreshing(true);

    const executeRefresh = async (): Promise<void> => {
      try {
        await GitHubService.clearCache();
      } catch (error) {
        logger.error("清除缓存失败:", error);
      } finally {
        handleRefresh();
        void refreshBranches();

        // 动画完成后重置状态
        window.setTimeout(() => {
          setIsRefreshing(false);
        }, 600); // 与动画持续时间保持一致
      }
    };

    void executeRefresh();
  }, [handleRefresh, isRefreshing, refreshBranches]);

  // 处理主题切换按钮点击
  const onThemeToggleClick = useCallback(() => {
    // 设置标记，表明这是一个主题切换操作，防止触发README重新加载
    document.documentElement.setAttribute("data-theme-change-only", "true");
    // 执行主题切换
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

  const branchLabelId = "toolbar-branch-select-label";

  const handleBranchChange = useCallback((event: SelectChangeEvent): void => {
    setCurrentBranch(event.target.value);
  }, [setCurrentBranch]);

  const handleBranchOpen = useCallback(() => {
    if (!branchLoading && (branchError !== null || branches.length <= 1)) {
      void refreshBranches();
    }
  }, [branchLoading, branchError, branches.length, refreshBranches]);

  const branchOptions = branches.map((branch) => (
    <MenuItem key={branch} value={branch}>
      {branch === defaultBranch ? `${branch} (默认)` : branch}
    </MenuItem>
  ));
  return (
    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }} data-oid="7:zr_jb">
      <Tooltip
        title={branchError ?? ""}
        placement="bottom"
        arrow
        disableHoverListener={branchError === null}
      >
        <FormControl
          size="small"
          variant="outlined"
          sx={{ minWidth: 168 }}
          error={branchError !== null}
          disabled={branchLoading && branches.length === 0}
        >
          <InputLabel id={branchLabelId}>分支</InputLabel>
          <Select
            labelId={branchLabelId}
            value={currentBranch}
            label="分支"
            onChange={handleBranchChange}
            onOpen={handleBranchOpen}
            MenuProps={{ PaperProps: { sx: { maxHeight: 280 } } }}
          >
            {branchOptions}
          </Select>
        </FormControl>
      </Tooltip>
      {branchLoading ? (
        <CircularProgress
          size={18}
          sx={{
            color: theme.palette.mode === "dark"
              ? theme.palette.grey[300]
              : theme.palette.grey[600],
          }}
        />
      ) : null}
      <Tooltip title="在GitHub中查看" data-oid="f.rvw_c">
        <IconButton
          color="inherit"
          onClick={onGitHubClick}
          sx={{
            "&:hover": {
              animation: `${pulseAnimation} 0.4s ease`,
              color: theme.palette.primary.light,
            },
          }}
          data-oid="jdbz_el"
        >
          <GitHubIcon data-oid="nw02ywc" />
        </IconButton>
      </Tooltip>

      <Tooltip title="刷新页面" data-oid=":xx54uq">
        <IconButton
          className="refresh-button"
          color="inherit"
          onClick={onRefreshClick}
          disabled={isRefreshing}
          sx={{
            position: "relative",
            overflow: "visible",
            "&:hover": {
              color: theme.palette.primary.light,
            },
            "& .MuiSvgIcon-root": {
              transition: "transform 0.2s ease-out",
              animation: isRefreshing
                ? `${refreshAnimation} 0.6s cubic-bezier(0.05, 0.01, 0.5, 1.0)`
                : "none",
              transformOrigin: "center center",
            },
          }}
          data-oid="ki-r8n0"
        >
          <RefreshIcon data-oid="4hwa9wu" />
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
              animation: `${pulseAnimation} 0.4s ease`,
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
  );
};

export default ToolbarButtons;
