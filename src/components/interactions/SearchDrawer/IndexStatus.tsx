import { useMemo } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  IconButton,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme
} from "@mui/material";
import { Refresh as RefreshIcon } from "@mui/icons-material";
import { g3BorderRadius, G3_PRESETS } from "@/theme/g3Curves";

interface IndexStatusProps {
  enabled: boolean;
  loading: boolean;
  error: Error | null;
  ready: boolean;
  indexedBranches: string[];
  lastUpdatedAt: number | null;
  onRefresh: () => void;
}

export const IndexStatus: React.FC<IndexStatusProps> = ({
  enabled,
  loading,
  error,
  ready,
  indexedBranches,
  lastUpdatedAt,
  onRefresh
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const statusAlert = useMemo(() => {
    if (!enabled) {
      return (
        <Alert severity="info" variant="outlined">
          已禁用索引搜索。可以在 `.env` 中启用 `REPO_VIEWER_SEARCH_INDEX_ENABLED` 以使用预生成索引。
        </Alert>
      );
    }

    if (loading) {
      return (
        <Alert severity="info" icon={<CircularProgress size={16} />}>
          正在检测 `RV-Index` 分支和索引文件…
        </Alert>
      );
    }

    if (error !== null) {
      return (
        <Alert
          severity="warning"
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: isSmallScreen ? 0.75 : 1,
            pl: isSmallScreen ? 2 : 3,
            px: isSmallScreen ? 1.5 : 2
          }}
        >
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="flex-start"
            gap={1.5}
          >
            <Typography variant={isSmallScreen ? "caption" : "body2"} fontWeight={600} sx={{ flex: 1 }}>
              无法加载索引，将使用 API 模式搜索
            </Typography>
            <Tooltip title="刷新索引状态" placement="left">
              <span>
                <IconButton
                  onClick={onRefresh}
                  disabled={loading}
                  size={isSmallScreen ? "small" : "medium"}
                  sx={{
                    borderRadius: g3BorderRadius(G3_PRESETS.button)
                  }}
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
          <Typography variant={isSmallScreen ? "caption" : "body2"}>
            请确认仓库存在索引文件
          </Typography>
          <Typography variant={isSmallScreen ? "caption" : "body2"}>
            建议参考 Repo-Viewer 文档以重新创建索引，或尝试刷新索引状态
          </Typography>
        </Alert>
      );
    }

    if (!ready) {
      return (
        <Alert severity="info">
          未检测到可用索引。请在目标仓库配置 `Repo-Viewer-Search` Actions，生成 `RV-Index` 分支下的索引文件。
        </Alert>
      );
    }

    return (
      <Alert severity="success">
        索引最新更新时间：{new Date(lastUpdatedAt ?? Date.now()).toLocaleString()}。
        支持的分支数：{indexedBranches.length.toString()}。
      </Alert>
    );
  }, [enabled, loading, error, ready, indexedBranches.length, lastUpdatedAt, isSmallScreen, onRefresh]);

  return statusAlert;
};

