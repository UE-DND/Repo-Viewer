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
  error: { message: string; code?: string } | null;
  ready: boolean;
  indexedBranches: string[];
  lastUpdatedAt: number | undefined;
  indexBranchName: string;
  onRefresh: () => void;
}

interface ErrorScenario {
  title: string;
  description: string[];
}

const getErrorScenario = (error: { message: string; code?: string } | null, ready: boolean, indexBranchName: string): ErrorScenario | null => {
  if (error?.code !== undefined) {
    switch (error.code) {
      case 'SEARCH_INDEX_BRANCH_MISSING':
        return {
          title: '索引分支不存在，将使用 API 模式搜索',
          description: [
            `未找到 ${indexBranchName} 分支`,
            '在目标仓库配置 Actions 以生成索引分支'
          ]
        };
      case 'SEARCH_INDEX_MANIFEST_NOT_FOUND':
        return {
          title: '索引文件缺失，将使用 API 模式搜索',
          description: [
            `${indexBranchName} 中未找到索引文件`,
            '检查 Actions 是否正确生成索引文件'
          ]
        };
      case 'SEARCH_INDEX_MANIFEST_INVALID':
        return {
          title: '索引格式错误，将使用 API 模式搜索',
          description: [
            '尝试重新运行 Actions 生成索引文件'
          ]
        };
      case 'SEARCH_INDEX_FILE_NOT_FOUND':
        return {
          title: '索引内容缺失，将使用 API 模式搜索',
          description: [
            '被索引的文件不存在',
            '尝试重新运行 Actions 生成索引文件'
          ]
        };
      case 'SEARCH_INDEX_DOCUMENT_INVALID':
        return {
          title: '索引文件格式错误，将使用 API 模式搜索',
          description: [
            '索引内容损坏或格式不正确',
            '尝试重新运行 Actions 生成索引文件'
          ]
        };
      case 'SEARCH_INDEX_UNSUPPORTED_COMPRESSION':
        return {
          title: '不支持的压缩格式，将使用 API 模式搜索',
          description: [
            '索引文件使用了不支持的压缩格式',
            '使用标准的 gzip 压缩格式重新生成索引文件'
          ]
        };
      default:
        return {
          title: '无法加载索引，将使用 API 模式搜索',
          description: [
            error.message,
            '检查索引文件是否存在且格式正确'
          ]
        };
    }
  }

  if (!ready) {
    return {
      title: '未检测到可用索引',
      description: [
        '在目标仓库配置 Repo-Viewer-Search Actions',
        `生成 ${indexBranchName} 分支下的索引文件`
      ]
    };
  }

  return null;
};

export const IndexStatus: React.FC<IndexStatusProps> = ({
  enabled,
  loading,
  error,
  ready,
  indexedBranches,
  lastUpdatedAt,
  indexBranchName,
  onRefresh
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const statusAlert = useMemo(() => {
    if (!enabled) {
      return (
        <Alert severity="info" variant="outlined">
          已禁用索引模式，将使用 API 模式搜索。配置 ENABLED_SEARCH_INDEX 以启用索引模式。
        </Alert>
      );
    }

    // 正在加载
    if (loading) {
      return (
        <Alert severity="info" icon={<CircularProgress size={16} />}>
          正在检测索引文件…
        </Alert>
      );
    }

    // 检查是否有错误场景
    const scenario = getErrorScenario(error, ready, indexBranchName);

    if (scenario !== null) {
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
              {scenario.title}
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
          {scenario.description.map((line, index) => (
            <Typography key={index} variant={isSmallScreen ? "caption" : "body2"}>
              {line}
            </Typography>
          ))}
        </Alert>
      );
    }

    // 索引就绪
    return (
      <Alert severity="success">
        索引最新更新时间：{new Date(lastUpdatedAt ?? Date.now()).toLocaleString()}。
        支持的分支数：{indexedBranches.length.toString()}。
      </Alert>
    );
  }, [enabled, loading, error, ready, indexedBranches.length, lastUpdatedAt, indexBranchName, isSmallScreen, onRefresh]);

  return statusAlert;
};

