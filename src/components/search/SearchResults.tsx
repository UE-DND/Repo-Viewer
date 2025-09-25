import React from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { formatDate, formatFileSize } from "../../utils";
import { SearchIndexMetadata, SearchResult } from "../../types";

interface SearchResultsProps {
  query: string;
  results: SearchResult[];
  loading: boolean;
  error: string | null;
  metadata: SearchIndexMetadata | null;
  onSelect: (result: SearchResult) => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  query,
  results,
  loading,
  error,
  metadata,
  onSelect,
}) => {
  const hasQuery = query.trim().length > 0;

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="subtitle1" fontWeight={600}>
            搜索结果
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {hasQuery ? `关键字：${query.trim()}` : "请输入关键字以搜索文件"}
          </Typography>
        </Box>
        {metadata && (
          <Typography variant="caption" color="text.secondary">
            索引生成于：{formatDate(metadata.generatedAt)}
          </Typography>
        )}
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      )}

      {!loading && hasQuery && results.length === 0 && !error && (
        <Alert severity="info" sx={{ mb: 2 }}>
          未找到匹配的文件，请尝试调整关键字。
        </Alert>
      )}

      {!loading && results.length > 0 && (
        <List disablePadding>
          {results.map((item, index) => (
            <React.Fragment key={item.path}>
              <ListItemButton alignItems="flex-start" onClick={() => onSelect(item)}>
                <ListItemText
                  primary={
                    <Box display="flex" justifyContent="space-between" alignItems="center" gap={1}>
                      <Typography variant="subtitle1" fontWeight={600} sx={{ flexGrow: 1 }}>
                        {item.name}
                      </Typography>
                      <Chip label={`得分 ${item.score}`} size="small" color="primary" variant="outlined" />
                    </Box>
                  }
                  secondary={
                    <Stack spacing={0.5} mt={1}>
                      <Typography variant="body2" color="text.secondary">
                        {item.path}
                      </Typography>
                      {item.matchedTokens.length > 0 && (
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {item.matchedTokens.map((token) => (
                            <Chip key={`${item.path}-${token}`} label={token} size="small" variant="outlined" />
                          ))}
                        </Stack>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        {formatFileSize(item.size)} · {formatDate(item.lastModified)}
                      </Typography>
                    </Stack>
                  }
                />
              </ListItemButton>
              {index < results.length - 1 && <Divider component="li" />}
            </React.Fragment>
          ))}
        </List>
      )}
    </Paper>
  );
};

export default SearchResults;
