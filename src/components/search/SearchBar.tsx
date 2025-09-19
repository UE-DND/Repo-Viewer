import React, { useEffect, useState } from "react";
import {
  Box,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
  useTheme,
  CircularProgress,
} from "@mui/material";
import {
  Clear as ClearIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { useSearch } from "../../contexts/github";

const AUTO_SEARCH_DELAY = 400;

const SearchBar: React.FC = () => {
  const theme = useTheme();
  const { searchTerm, search, clear, refreshIndex, loading, enabled } = useSearch();
  const [value, setValue] = useState(searchTerm);

  useEffect(() => {
    setValue(searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handler = window.setTimeout(() => {
      if (value === searchTerm) {
        return;
      }
      search(value);
    }, AUTO_SEARCH_DELAY);

    return () => window.clearTimeout(handler);
  }, [enabled, value, searchTerm, search]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!enabled) {
      return;
    }
    search(value);
  };

  const handleClear = () => {
    setValue("");
    clear();
  };

  const handleRefresh = async () => {
    await refreshIndex();
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mb: 3 }}>
      <TextField
        fullWidth
        value={value}
        disabled={!enabled}
        onChange={(event) => setValue(event.target.value)}
        placeholder={enabled ? "输入文件名或关键字搜索…" : "搜索功能已禁用"}
        size="small"
        variant="outlined"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color={enabled ? "action" : "disabled"} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                {loading && (
                  <CircularProgress size={18} thickness={5} />
                )}
                {value && (
                  <Tooltip title="清空">
                    <span>
                      <IconButton
                        size="small"
                        onClick={handleClear}
                        disabled={!enabled}
                        edge="end"
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
                <Tooltip title="刷新索引">
                  <span>
                    <IconButton
                      size="small"
                      onClick={handleRefresh}
                      disabled={!enabled || loading}
                      edge="end"
                      sx={{
                        color: loading ? theme.palette.primary.main : undefined,
                      }}
                    >
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </InputAdornment>
          ),
        }}
        inputProps={{
          "aria-label": "搜索文件",
        }}
      />
    </Box>
  );
};

export default SearchBar;
