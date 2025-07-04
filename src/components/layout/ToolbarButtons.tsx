import React, { useContext, useState, useCallback, useEffect } from "react";
import { Box, IconButton, Tooltip, useTheme } from "@mui/material";

import {
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Refresh as RefreshIcon,
  GitHub as GitHubIcon,
} from "@mui/icons-material";
import { ColorModeContext } from "../../contexts/ColorModeContext";
import { useRefresh } from "../../hooks/useRefresh";
import { pulseAnimation, refreshAnimation } from "../../theme/animations";
import { GitHubService } from "../../services/github";
import { useSnackbar } from "notistack";
import axios from "axios";

// 工具栏按钮组件
const ToolbarButtons: React.FC = () => {
  const colorMode = useContext(ColorModeContext);
  const theme = useTheme();
  const handleRefresh = useRefresh();
  const { enqueueSnackbar } = useSnackbar();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [repoInfo, setRepoInfo] = useState({

  repoOwner: import.meta.env.VITE_GITHUB_REPO_OWNER || "UE-DND",
  repoName: import.meta.env.VITE_GITHUB_REPO_NAME || "Repo-Viewer",
});

  // 在组件加载时获取仓库信息
  useEffect(() => {
    const fetchRepoInfo = async () => {
      try {
        // 尝试从API获取仓库信息
        const response = await axios.get("/api/github?action=getConfig");
        if (response.data && response.data.status === "success") {
          const { repoOwner, repoName } = response.data.data;
          if (repoOwner && repoName) {
            setRepoInfo({ repoOwner, repoName });
          }
        }
      } catch (error) {
        // 如果API请求失败，保持使用默认值或环境变量值
        console.error("获取仓库信息失败:", error);
      }
    };

    fetchRepoInfo();
  }, []);
        
  // 处理刷新按钮点击
  const onRefreshClick = useCallback(() => {
    if (isRefreshing) return; // 防止重复点击

    setIsRefreshing(true);

    // 强制刷新时绕过缓存获取新数据
    GitHubService.clearCache();
    handleRefresh();

    // 动画完成后重置状态
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600); // 与动画持续时间保持一致
  }, [handleRefresh, isRefreshing]);

  // 处理主题切换按钮点击
  const onThemeToggleClick = useCallback(() => {
    // 设置标记，表明这是一个主题切换操作，防止触发README重新加载
    document.documentElement.setAttribute("data-theme-change-only", "true");
    // 执行主题切换
    colorMode.toggleColorMode();
  }, [colorMode]);

  // 处理GitHub按钮点击
  const onGitHubClick = useCallback(() => {
    const { repoOwner, repoName } = repoInfo;
    const repoUrl = `https://github.com/${repoOwner}/${repoName}`;
    window.open(repoUrl, "_blank");
  }, [repoInfo]);
  return (
    <Box sx={{ display: "flex", gap: 1 }} data-oid="7:zr_jb">
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

      <Tooltip title="刷新内容" data-oid=":xx54uq">
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
