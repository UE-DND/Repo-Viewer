import { useCallback, useMemo, useEffect, useState, useRef } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
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
  Tooltip,
  Typography,
  useTheme,
  useMediaQuery
} from "@mui/material";
import {
  Close as CloseIcon,
  Clear as ClearIcon,
  GitHub as GitHubIcon,
  Refresh as RefreshIcon,
  FilterList as FilterListIcon
} from "@mui/icons-material";
import { GitHub } from "@/services/github";
import { logger } from "@/utils";
import {
  useContentContext,
  usePreviewContext
} from "@/contexts/unified";
import type { RepoSearchItem } from "@/hooks/github/useRepoSearch";
import { g3BorderRadius, G3_PRESETS } from "@/theme/g3Curves";

interface SearchDrawerProps {
  open: boolean;
  onClose: () => void;
}

const SEARCH_INPUT_ID = "repo-search-keyword";

const formatExtensionInput = (extensions: string[]): string => extensions.join(", ");

const parseExtensionInput = (value: string): string[] => {
  if (value.trim().length === 0) {
    return [];
  }

  const segments = value
    .split(/[\s,]+/)
    .map((item) => item.trim().replace(/^\./, "").toLowerCase())
    .filter((item) => item.length > 0);

  return Array.from(new Set(segments));
};

export const SearchDrawer: React.FC<SearchDrawerProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  
  const {
    currentBranch,
    defaultBranch,
    currentPath,
    navigateTo,
    setCurrentBranch,
    findFileItemByPath,
    search
  } = useContentContext();
  const { selectFile } = usePreviewContext();

  const branchFilter = search.branchFilter;
  const availableBranches = search.availableBranches;
  const extensionFilter = search.extensionFilter;
  const indexStatus = search.indexStatus;
  const pathPrefixValue = search.pathPrefix;
  const { enabled, loading, error, ready, indexedBranches, lastUpdatedAt } = indexStatus;
  const refreshIndexStatus = search.refreshIndexStatus;
  const setPathPrefix = search.setPathPrefix;

  const [extensionInput, setExtensionInput] = useState(() => formatExtensionInput(extensionFilter));

  const [filtersExpanded, setFiltersExpanded] = useState(false);
  
  const previousOpenRef = useRef(false);

  useEffect(() => {
    setExtensionInput(formatExtensionInput(extensionFilter));
  }, [extensionFilter]);

  // 每次打开搜索抽屉时重置筛选条件并自动填充当前路径
  useEffect(() => {
    const wasOpen = previousOpenRef.current;
    
    if (open && !wasOpen) {
      // 只在从关闭到打开时执行一次重置
      search.setKeyword('');
      search.setBranchFilter([]);
      search.setExtensionFilter([]);
      setExtensionInput('');
      search.clearResults();
      setFiltersExpanded(false);
      
      // 自动填充当前路径（如果有）
      const trimmedCurrentPath = currentPath.trim();
      if (trimmedCurrentPath.length > 0) {
        setPathPrefix(trimmedCurrentPath);
      } else {
        setPathPrefix('');
      }
      
      // 聚焦主搜索框
      setTimeout(() => {
        const input = document.getElementById(SEARCH_INPUT_ID) as HTMLInputElement | null;
        input?.focus();
      }, 100);
    }
    
    previousOpenRef.current = open;
  }, [open, currentPath, setPathPrefix, search]);

  // 处理搜索输入变化
  const handleSearchInputChange = useCallback((value: string) => {
    search.setKeyword(value);
  }, [search]);

  const applyExtensionFilter = useCallback(() => {
    const parsed = parseExtensionInput(extensionInput);
    search.setExtensionFilter(parsed);
  }, [extensionInput, search]);

  const handleBranchToggle = (branch: string): void => {
    const normalized = branch.trim();
    if (normalized.length === 0) {
      return;
    }

    if (branchFilter.includes(normalized)) {
      search.setBranchFilter(branchFilter.filter(item => item !== normalized));
    } else {
      search.setBranchFilter([...branchFilter, normalized]);
    }
  };

  const clearBranchFilter = (): void => {
    search.setBranchFilter([]);
  };

  const searchFieldLabel = useMemo(() => {
    const pathPrefix = pathPrefixValue.trim();
    const pathSuffix = (!isSmallScreen && pathPrefix.length > 0) ? `: ${pathPrefix}` : "";

    if (branchFilter.length > 0) {
      const orderedBranches = availableBranches.filter(branch => branchFilter.includes(branch));
      
      if (isSmallScreen && orderedBranches.length > 1) {
        return `在 ${orderedBranches.length.toString()} 个分支中搜索`;
      }
      
      if (!isSmallScreen && orderedBranches.length > 3) {
        const displayBranches = orderedBranches.slice(0, 3).join("、");
        return `在 ${displayBranches} 等 ${orderedBranches.length.toString()} 个分支${pathSuffix} 中搜索`;
      }
      
      const displayBranches = orderedBranches.join("、");
      return `在 ${displayBranches}${pathSuffix} 中搜索`;
    }

    const fallbackBranch = currentBranch !== "" ? currentBranch : defaultBranch;
    return fallbackBranch === "" ? "在仓库中搜索" : `在 ${fallbackBranch}${pathSuffix} 中搜索`;
  }, [branchFilter, availableBranches, currentBranch, defaultBranch, pathPrefixValue, isSmallScreen]);

  const toggleFilters = useCallback(() => {
    setFiltersExpanded(prev => !prev);
  }, []);

  // 重置筛选时也清空搜索输入
  const handleResetFilters = useCallback(() => {
    search.resetFilters();
    setFiltersExpanded(false);
    search.setBranchFilter([]);
    search.setExtensionFilter([]);
    setExtensionInput("");
  }, [search]);

  const handleApiSearch = useCallback(() => {
    if (search.keyword.trim() === '') {
      return;
    }
    search.setPreferredMode('github-api');
    void search.search({ mode: 'github-api' }).catch((error: unknown) => {
      logger.warn('使用 API 模式搜索失败', error);
    });
  }, [search]);

  const renderIndexStatus = useMemo(() => {
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
                onClick={() => {
                  refreshIndexStatus();
                }}
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
  }, [enabled, loading, error, ready, indexedBranches.length, lastUpdatedAt, isSmallScreen, refreshIndexStatus]);

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

  // 高亮文本中的关键字
  const highlightKeyword = useCallback((text: string, keyword: string): Array<{ text: string; highlight: boolean }> => {
    if (keyword.trim().length === 0) {
      return [{ text, highlight: false }];
    }

    const parts: Array<{ text: string; highlight: boolean }> = [];
    const lowerText = text.toLowerCase();
    const lowerKeyword = keyword.toLowerCase();
    let lastIndex = 0;
    let index = lowerText.indexOf(lowerKeyword);

    while (index !== -1) {
      // 添加关键字前的文本
      if (index > lastIndex) {
        parts.push({ text: text.slice(lastIndex, index), highlight: false });
      }
      
      // 添加关键字（高亮）
      parts.push({ text: text.slice(index, index + lowerKeyword.length), highlight: true });
      
      lastIndex = index + lowerKeyword.length;
      index = lowerText.indexOf(lowerKeyword, lastIndex);
    }

    // 添加剩余文本
    if (lastIndex < text.length) {
      parts.push({ text: text.slice(lastIndex), highlight: false });
    }

    return parts;
  }, []);

  const renderResultSecondary = useCallback((item: RepoSearchItem) => {
    const keyword = search.keyword.trim();
    const pathParts = highlightKeyword(item.path, keyword);
    
    const snippet = ("snippet" in item && typeof (item as { snippet?: unknown }).snippet === "string")
      ? (item as { snippet?: string }).snippet
      : undefined;

    return (
      <Box component="span">
        <Box component="span">
          {pathParts.map((part: { text: string; highlight: boolean }, idx: number) => (
            part.highlight ? (
              <Box
                component="span"
                key={idx}
                sx={{
                  color: (theme) => theme.palette.primary.main,
                  fontWeight: 600
                }}
              >
                {part.text}
              </Box>
            ) : (
              <Box component="span" key={idx}>{part.text}</Box>
            )
          ))}
        </Box>
        {typeof snippet === "string" && snippet.trim().length > 0 && (
          <Box component="span" display="block" mt={0.5}>
            {snippet.trim()}
          </Box>
        )}
      </Box>
    );
  }, [highlightKeyword, search.keyword]);

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
  const showEmptyIndexResult =
    !search.searchLoading &&
    search.keyword.trim() !== "" &&
    search.searchResult !== null &&
    search.searchResult.mode === "search-index" &&
    search.searchResult.items.length === 0;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      fullWidth 
      maxWidth={isSmallScreen ? "sm" : "md"}
      slotProps={{
        paper: {
          sx: {
            borderRadius: isSmallScreen ? g3BorderRadius({ radius: 20, smoothness: 0.8 }) : g3BorderRadius(G3_PRESETS.dialog),
            m: isSmallScreen ? 2 : 3,
          }
        }
      }}
    >
      <DialogTitle sx={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between",
        px: isSmallScreen ? 2 : 3,
        py: isSmallScreen ? 1.5 : 2
      }}>
        <Typography component="span" variant={isSmallScreen ? "subtitle1" : "h6"}>文件搜索</Typography>
        <IconButton onClick={onClose} aria-label="关闭搜索面板" size={isSmallScreen ? "small" : "medium"}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent 
        dividers 
        sx={{ 
          px: isSmallScreen ? 2 : 3, 
          py: isSmallScreen ? 2 : 3,
          // 隐藏滚动条但保留滚动功能
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none', // IE/Edge
          '&::-webkit-scrollbar': {
            display: 'none' // Chrome/Safari
          }
        }}
      >
        <Stack spacing={isSmallScreen ? 1.5 : 2}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <TextField
              id={SEARCH_INPUT_ID}
              label={searchFieldLabel}
              placeholder="键入搜索内容"
              variant="outlined"
              fullWidth
              value={search.keyword}
              onChange={(event) => {
                handleSearchInputChange(event.target.value);
              }}
              onKeyDown={event => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSearch();
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: g3BorderRadius(G3_PRESETS.button),
                },
                '& .MuiOutlinedInput-input': {
                  paddingLeft: isSmallScreen ? '16px' : '25px',
                }
              }}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment 
                      position="end" 
                      sx={{ 
                        mr: -1, 
                        gap: 0.5,
                        display: 'flex',
                        alignItems: 'center',
                        height: '100%'
                      }}
                    >
                      {search.keyword.trim().length > 0 && (
                        <IconButton
                          size="small"
                          onClick={() => {
                            search.setKeyword('');
                          }}
                          sx={{ 
                            mr: 0.5,
                            borderRadius: g3BorderRadius(G3_PRESETS.button)
                          }}
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      )}
                      <Button
                        variant="contained"
                        size={isSmallScreen ? "small" : "medium"}
                        startIcon={search.searchLoading ? <CircularProgress size={16} /> : undefined}
                        disabled={disableSearchButton || search.searchLoading}
                        onClick={() => {
                          void handleSearch();
                        }}
                        sx={{ 
                          mr: 0,
                          borderRadius: g3BorderRadius(G3_PRESETS.button),
                          minWidth: isSmallScreen ? 'auto' : undefined,
                          px: isSmallScreen ? 2 : 3
                        }}
                      >
                        搜索
                      </Button>
                    </InputAdornment>
                  )
                }
              }}
            />
            <Tooltip title={filtersExpanded ? "收起筛选" : "筛选条件"}>
              <IconButton
                onClick={toggleFilters}
                sx={{
                  height: isSmallScreen ? 40 : 48,
                  width: isSmallScreen ? 40 : 48,
                  borderRadius: g3BorderRadius(G3_PRESETS.button)
                }}
                size={isSmallScreen ? "small" : "medium"}
                color={filtersExpanded ? "primary" : "default"}
                aria-pressed={filtersExpanded}
              >
                <FilterListIcon fontSize={isSmallScreen ? "small" : "medium"} />
              </IconButton>
            </Tooltip>
          </Stack>

          <Collapse in={filtersExpanded} unmountOnExit>
            <Box
              sx={{
                mt: 1,
                p: isSmallScreen ? 1.5 : 2,
                borderRadius: g3BorderRadius(G3_PRESETS.fileListContainer),
                border: theme => `1px solid ${theme.palette.divider}`,
                backgroundColor: theme => theme.palette.action.hover
              }}
            >
              <Stack spacing={isSmallScreen ? 1 : 1.5}>
                <Typography variant="subtitle2" color="text.secondary">
                  筛选选项
                </Typography>
                <Stack direction="row" spacing={isSmallScreen ? 0.75 : 1} flexWrap="wrap" useFlexGap>
                  {availableBranches.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      暂无可选分支
                    </Typography>
                  ) : (
                    availableBranches.map(branch => {
                      const isCurrentBranch = branch === currentBranch || (currentBranch === "" && branch === defaultBranch);
                      const selected = branchFilter.length === 0 
                        ? isCurrentBranch 
                        : branchFilter.includes(branch);
                      return (
                        <Chip
                          key={branch}
                          label={branch}
                          color={selected ? "primary" : "default"}
                          variant={selected ? "filled" : "outlined"}
                          size={isSmallScreen ? "small" : "medium"}
                          onClick={() => {
                            handleBranchToggle(branch);
                          }}
                          sx={{ borderRadius: g3BorderRadius({ radius: 14, smoothness: 0.8 }) }}
                        />
                      );
                    })
                  )}
                  {branchFilter.length > 0 && (
                    <Chip
                      label="清除"
                      onClick={clearBranchFilter}
                      onDelete={clearBranchFilter}
                      color="secondary"
                      variant="outlined"
                      size={isSmallScreen ? "small" : "medium"}
                      sx={{ borderRadius: g3BorderRadius({ radius: 14, smoothness: 0.8 }) }}
                    />
                  )}
                </Stack>
              <TextField
                label="限定文件扩展名"
                value={extensionInput}
                onChange={(event) => {
                  setExtensionInput(event.target.value);
                }}
                onBlur={applyExtensionFilter}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    applyExtensionFilter();
                  }
                }}
                placeholder="例如 pdf,docx,xlsx"
                size={isSmallScreen ? "small" : "medium"}
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: g3BorderRadius(G3_PRESETS.button),
                  },
                  '& .MuiOutlinedInput-input': {
                    paddingLeft: isSmallScreen ? '16px' : '25px',
                  }
                }}
                slotProps={{
                  input: {
                    endAdornment: extensionInput.trim().length > 0 ? (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setExtensionInput('');
                            search.setExtensionFilter([]);
                          }}
                          sx={{ borderRadius: g3BorderRadius(G3_PRESETS.button) }}
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ) : undefined
                  }
                }}
              />
                <TextField
                  label="限定搜索路径"
                  value={search.pathPrefix}
                  onChange={(event) => {
                    search.setPathPrefix(event.target.value);
                  }}
                  placeholder="例如 src/components"
                  size={isSmallScreen ? "small" : "medium"}
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: g3BorderRadius(G3_PRESETS.button),
                    },
                    '& .MuiOutlinedInput-input': {
                      paddingLeft: isSmallScreen ? '16px' : '25px',
                    }
                  }}
                  slotProps={{
                    input: {
                      endAdornment: search.pathPrefix.trim().length > 0 ? (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => {
                              search.setPathPrefix('');
                            }}
                            sx={{ borderRadius: g3BorderRadius(G3_PRESETS.button) }}
                          >
                            <ClearIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ) : undefined
                    }
                  }}
                />
              </Stack>
            </Box>
          </Collapse>

          {renderIndexStatus}

          {search.searchError !== null && (
            <Alert severity="error">
              搜索失败：{search.searchError.message}
            </Alert>
          )}

          <Divider />

          <Stack 
            direction={isSmallScreen ? "column" : "row"} 
            justifyContent="space-between" 
            alignItems={isSmallScreen ? "stretch" : "center"}
            spacing={isSmallScreen ? 1 : 0}
          >
            <Typography variant="subtitle2" color="text.secondary">{searchSummaries}</Typography>
            <Stack direction="row" spacing={1} justifyContent={isSmallScreen ? "flex-end" : "flex-start"}>
              <Button
                size="small"
                onClick={handleResetFilters}
                sx={{ borderRadius: g3BorderRadius(G3_PRESETS.button) }}
              >
                重置筛选
              </Button>
              <Button
                size="small"
                onClick={() => {
                  search.clearResults();
                }}
                sx={{ borderRadius: g3BorderRadius(G3_PRESETS.button) }}
              >
                清除结果
              </Button>
            </Stack>
          </Stack>

          {showEmptyIndexResult && (
            <Alert
              severity="info"
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 1,
                px: isSmallScreen ? 1.5 : 2
              }}
              action={
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleApiSearch}
                  disabled={disableSearchButton}
                  sx={{ 
                    borderRadius: g3BorderRadius(G3_PRESETS.button),
                    whiteSpace: 'nowrap'
                  }}
                >
                  {isSmallScreen ? "API搜索" : "使用 API 模式搜索"}
                </Button>
              }
            >
              <Typography variant={isSmallScreen ? "caption" : "body2"}>
                未检索到索引结果，可尝试使用 API 模式搜索。
              </Typography>
            </Alert>
          )}

          <List
            sx={{
              maxHeight: isSmallScreen ? 300 : 400,
              overflowY: "auto",
              overflowX: "hidden",
              width: "100%"
            }}
          >
            {search.searchResult?.items.map(item => {
              const githubUrl = resolveItemHtmlUrl(item);

              return (
                <ListItem key={`${item.branch}:${item.path}`} disablePadding alignItems="flex-start">
                  <Box
                    sx={{
                      display: "flex",
                      width: "100%",
                      gap: 1,
                      alignItems: "flex-start"
                    }}
                  >
                    <ListItemButton
                      onClick={() => {
                        void handleResultClick(item);
                      }}
                      sx={{
                        flex: 1,
                        alignItems: "flex-start",
                        borderRadius: g3BorderRadius(G3_PRESETS.fileListItem)
                      }}
                    >
                      <ListItemText
                        primary={
                          <Stack direction="row" spacing={isSmallScreen ? 0.5 : 1} alignItems="center">
                            <Chip 
                              size="small" 
                              label={item.branch} 
                              color={item.source === "search-index" ? "primary" : "default"}
                              sx={{ 
                                borderRadius: g3BorderRadius({ radius: 12, smoothness: 0.8 }),
                                fontSize: isSmallScreen ? '0.7rem' : undefined
                              }}
                            />
                            <Typography variant={isSmallScreen ? "caption" : "body2"} color="text.secondary">
                              {item.source === "search-index" ? "索引" : "API"}
                            </Typography>
                          </Stack>
                        }
                        secondary={renderResultSecondary(item)}
                        slotProps={{
                          secondary: {
                            component: "div",
                            sx: {
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                              overflowWrap: "anywhere"
                            }
                          }
                        }}
                      />
                    </ListItemButton>
                    {githubUrl !== undefined && (
                      <Tooltip title="在 GitHub 中打开">
                        <IconButton
                          onClick={() => {
                            handleOpenGithub(item);
                          }}
                          sx={{
                            mt: 1,
                            borderRadius: g3BorderRadius(G3_PRESETS.button)
                          }}
                        >
                          <GitHubIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </ListItem>
              );
            })}
            {search.searchResult !== null && search.searchResult.items.length === 0 && (
              <ListItem>
                <ListItemText 
                  primary="暂无结果" 
                  secondary="尝试更换关键字或调整筛选条件"
                  slotProps={{
                    primary: {
                      variant: isSmallScreen ? "body2" : "body1"
                    },
                    secondary: {
                      variant: isSmallScreen ? "caption" : "body2"
                    }
                  }}
                />
              </ListItem>
            )}
          </List>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default SearchDrawer;
