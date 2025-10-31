import { useCallback, useMemo, useState, useEffect } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  type TextFieldProps
} from "@mui/material";
import {
  Close as CloseIcon,
  GitHub as GitHubIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  TravelExplore as ExploreIcon
} from "@mui/icons-material";
import { GitHub } from "@/services/github";
import { logger } from "@/utils";
import {
  useContentContext,
  usePreviewContext
} from "@/contexts/unified";
import type { RepoSearchItem, RepoSearchMode } from "@/hooks/github/useRepoSearch";

interface SearchDrawerProps {
  open: boolean;
  onClose: () => void;
}

const SEARCH_INPUT_ID = "repo-search-keyword";

function formatExtensions(extensions: string[]): string {
  return extensions.join(", ");
}

function parseExtensions(raw: string): string[] {
  if (raw.trim() === "") {
    return [];
  }
  return raw
    .split(/[\s,]+/)
    .map(value => value.trim().replace(/^\./, "").toLowerCase())
    .filter((value, index, array) => value.length > 0 && array.indexOf(value) === index);
}

export const SearchDrawer: React.FC<SearchDrawerProps> = ({ open, onClose }) => {
  const {
    currentBranch,
    defaultBranch,
    navigateTo,
    setCurrentBranch,
    findFileItemByPath,
    search
  } = useContentContext();
  const { selectFile } = usePreviewContext();

  const [extensionInput, setExtensionInput] = useState<string>(() => formatExtensions(search.extensionFilter));

  useEffect(() => {
    setExtensionInput(formatExtensions(search.extensionFilter));
  }, [search.extensionFilter]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const input = document.getElementById(SEARCH_INPUT_ID) as HTMLInputElement | null;
    input?.focus();
  }, [open]);

  const handleModeChange = useCallback((_event: React.MouseEvent<HTMLElement>, value: RepoSearchMode | null) => {
    if (value !== null) {
      search.setPreferredMode(value);
    }
  }, [search]);

  const handleExtensionBlur = useCallback(() => {
    search.setExtensionFilter(parseExtensions(extensionInput));
  }, [extensionInput, search]);

  const handleExtensionKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      search.setExtensionFilter(parseExtensions(extensionInput));
    }
  }, [extensionInput, search]);

  const renderIndexStatus = useMemo(() => {
    if (!search.indexStatus.enabled) {
      return (
        <Alert severity="info" variant="outlined">
          已禁用索引搜索。可以在 `.env` 中启用 `REPO_VIEWER_SEARCH_INDEX_ENABLED` 以使用预生成索引。
        </Alert>
      );
    }

    if (search.indexStatus.loading) {
      return (
        <Alert severity="info" icon={<CircularProgress size={16} />}>
          正在检测 `RV-Index` 分支和索引文件…
        </Alert>
      );
    }

    if (search.indexStatus.error !== null) {
      return (
        <Alert severity="warning">
          无法加载索引：{search.indexStatus.error.message}
          <Box mt={1}>
            请确认仓库存在 `RV-Index` 分支并已通过 GitHub Actions 生成 `manifest.json` 与索引文件。
          </Box>
          <Box mt={1}>
            建议参考 `Repo-Viewer-Search/docs/search-index-workflow.md` 创建 Workflow，再次点击“刷新索引状态”。
          </Box>
        </Alert>
      );
    }

    if (!search.indexStatus.ready) {
      return (
        <Alert severity="info">
          未检测到可用索引。请在目标仓库配置 `Repo-Viewer-Search` Actions，生成 `RV-Index` 分支下的索引文件。
        </Alert>
      );
    }

    return (
      <Alert severity="success">
        索引最新更新时间：{new Date(search.indexStatus.lastUpdatedAt ?? Date.now()).toLocaleString()}。
        支持的分支数：{search.indexStatus.indexedBranches.length.toString()}。
      </Alert>
    );
  }, [search.indexStatus]);

  const fallbackNotice = useMemo(() => {
    if (search.fallbackReason === null) {
      return null;
    }

    switch (search.fallbackReason) {
      case "index-disabled":
        return "已禁用索引功能，自动使用 GitHub API 搜索。";
      case "index-not-ready":
        return "索引尚未准备就绪，自动使用 GitHub API 搜索。";
      case "index-error":
        return "索引加载失败，已自动回退至 GitHub API 搜索。";
      case "branch-not-indexed":
        return "所选分支未生成索引，自动使用 GitHub API 搜索。";
      default:
        return null;
    }
  }, [search.fallbackReason]);

  const handleSearch = useCallback(async () => {
    try {
      await search.search();
    } catch (error: unknown) {
      logger.warn("搜索失败", error);
    }
  }, [search]);

  const handleResultClick = useCallback(async (item: RepoSearchItem) => {
    const fallbackBranch = currentBranch !== "" ? currentBranch : defaultBranch;
    const preferredBranch = search.branchFilter[0] ?? fallbackBranch;
    const targetBranch = item.branch.length > 0 ? item.branch : preferredBranch;
    if (targetBranch.length > 0 && targetBranch !== currentBranch) {
      setCurrentBranch(targetBranch);
    }

    const directoryPath = item.path.includes("/") ? item.path.slice(0, item.path.lastIndexOf("/")) : "";
    navigateTo(directoryPath, "forward");

    let fileItem = findFileItemByPath(item.path);

    if (fileItem === undefined) {
      try {
        const contents = await GitHub.Content.getContents(directoryPath);
        fileItem = contents.find(content => content.path === item.path);
      } catch (error: unknown) {
        logger.warn("加载文件用于预览失败", error);
      }
    }

    if (fileItem !== undefined) {
      await selectFile(fileItem);
    }

    onClose();
  }, [currentBranch, defaultBranch, findFileItemByPath, navigateTo, onClose, search.branchFilter, selectFile, setCurrentBranch]);

  const renderResultSecondary = useCallback((item: RepoSearchItem): string => {
    const segments: string[] = [item.path];
    const snippet = ("snippet" in item && typeof (item as { snippet?: unknown }).snippet === "string")
      ? (item as { snippet?: string }).snippet
      : undefined;
    if (typeof snippet === "string") {
      const trimmed = snippet.trim();
      if (trimmed.length > 0) {
        segments.push(trimmed);
      }
    }
    return segments.join("\n");
  }, []);

  const searchSummaries = useMemo(() => {
    if (search.searchResult === null) {
      return "尚未搜索";
    }
    const { items, took, mode } = search.searchResult;
    return `${items.length.toString()} 项结果 • ${(took).toFixed(1)} ms • ${mode === "search-index" ? "索引" : "GitHub API"}`;
  }, [search.searchResult]);

  const resolveItemHtmlUrl = useCallback((item: RepoSearchItem): string | undefined => {
    if (typeof (item as { htmlUrl?: unknown }).htmlUrl === "string") {
      return (item as { htmlUrl: string }).htmlUrl;
    }
    if ("html_url" in item && typeof item.html_url === "string") {
      return item.html_url;
    }
    return undefined;
  }, []);

  const handleOpenGithub = useCallback((item: RepoSearchItem) => {
    const candidateUrl = resolveItemHtmlUrl(item);
    if (typeof candidateUrl === "string" && candidateUrl.length > 0) {
      window.open(candidateUrl, "_blank", "noopener,noreferrer");
    }
  }, [resolveItemHtmlUrl]);

  const disableSearchButton = search.keyword.trim() === "";

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography component="span" variant="h6">仓库搜索</Typography>
        <IconButton onClick={onClose} aria-label="关闭搜索面板">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "flex-end" }}>
            <TextField
              id={SEARCH_INPUT_ID}
              label="关键词"
              variant="outlined"
              fullWidth
              value={search.keyword}
              onChange={(event) => {
                search.setKeyword(event.target.value);
              }}
              onKeyDown={event => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSearch();
                }
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  )
                }
              }}
            />
            <Box display="flex" gap={1} flexShrink={0}>
              <Button
                variant="contained"
                startIcon={search.searchLoading ? <CircularProgress size={16} /> : <SearchIcon />}
                disabled={disableSearchButton || search.searchLoading}
                onClick={() => {
                  void handleSearch();
                }}
              >
                搜索
              </Button>
              <Tooltip title="刷新索引状态">
                <span>
                  <IconButton
                    onClick={() => {
                      search.refreshIndexStatus();
                    }}
                    disabled={search.indexStatus.loading}
                  >
                    <RefreshIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }}>
            <ToggleButtonGroup
              exclusive
              value={search.preferredMode}
              onChange={handleModeChange}
              size="small"
            >
              <ToggleButton value="search-index">索引模式</ToggleButton>
              <ToggleButton value="github-api">GitHub API 模式</ToggleButton>
            </ToggleButtonGroup>
            <Autocomplete
              multiple
              options={search.availableBranches}
              value={search.branchFilter}
              onChange={(_event, value) => {
                search.setBranchFilter(value);
              }}
              renderInput={(params) => {
                const textFieldParams = params as unknown as TextFieldProps;
                return (
                  <TextField
                    {...textFieldParams}
                    size="small"
                    label="限定分支"
                    placeholder="默认使用当前分支"
                  />
                );
              }}
              fullWidth
            />
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }}>
            <TextField
              label="路径前缀"
              value={search.pathPrefix}
              onChange={(event) => {
                search.setPathPrefix(event.target.value);
              }}
              placeholder="例如 src/components"
              fullWidth
            />
            <TextField
              label="文件扩展名"
              value={extensionInput}
              onChange={(event) => {
                setExtensionInput(event.target.value);
              }}
              onBlur={handleExtensionBlur}
              onKeyDown={handleExtensionKeyDown}
              placeholder="例如 ts,tsx,md"
              helperText="使用逗号或空格分隔，自动忽略点号"
              fullWidth
            />
          </Stack>

          {renderIndexStatus}

            {fallbackNotice !== null && (
              <Alert
                severity="info"
                action={
                  <Button
                    color="inherit"
                    size="small"
                    startIcon={<ExploreIcon />}
                    onClick={() => {
                      search.setPreferredMode("github-api");
                    }}
                  >
                    使用 GitHub API
                  </Button>
                }
              >
              {fallbackNotice}
            </Alert>
          )}

          {search.searchError !== null && (
            <Alert severity="error">
              搜索失败：{search.searchError.message}
            </Alert>
          )}

          <Divider />

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2" color="text.secondary">{searchSummaries}</Typography>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                onClick={() => {
                  search.resetFilters();
                }}
              >
                重置筛选
              </Button>
              <Button
                size="small"
                onClick={() => {
                  search.clearResults();
                }}
              >
                清除结果
              </Button>
            </Stack>
          </Stack>

          <List sx={{ maxHeight: 400, overflowY: "auto" }}>
            {search.searchResult?.items.map(item => {
              const githubUrl = resolveItemHtmlUrl(item);

              return (
                <ListItem key={`${item.branch}:${item.path}`} disablePadding alignItems="flex-start">
                <ListItemButton
                  onClick={() => {
                    void handleResultClick(item);
                  }}
                >
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip size="small" label={item.branch} color={item.source === "search-index" ? "primary" : "default"} />
                        <Typography variant="body2" color="text.secondary">
                          {item.source === "search-index" ? "索引" : "API"}
                        </Typography>
                      </Stack>
                    }
                    secondary={renderResultSecondary(item)}
                    slotProps={{
                      secondary: {
                        component: "pre",
                        sx: { whiteSpace: "pre-wrap" }
                      }
                    }}
                  />
                </ListItemButton>
                {githubUrl !== undefined && (
                  <Tooltip title="在 GitHub 中打开">
                    <IconButton
                      edge="end"
                      onClick={() => {
                        handleOpenGithub(item);
                      }}
                    >
                      <GitHubIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                </ListItem>
              );
            })}
            {search.searchResult !== null && search.searchResult.items.length === 0 && (
              <ListItem>
                <ListItemText primary="暂无结果" secondary="尝试更换关键字或调整筛选条件" />
              </ListItem>
            )}
          </List>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default SearchDrawer;
