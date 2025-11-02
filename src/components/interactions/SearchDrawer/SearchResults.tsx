import {
  Alert,
  Button,
  List,
  ListItem,
  ListItemText,
  Typography,
  useMediaQuery,
  useTheme
} from "@mui/material";
import { g3BorderRadius, G3_PRESETS } from "@/theme/g3Curves";
import { SearchResultItem } from "./SearchResultItem";
import type { RepoSearchItem } from "@/hooks/github/useRepoSearch";

interface SearchResultsProps {
  items: RepoSearchItem[];
  keyword: string;
  loading: boolean;
  searchResult: {
    mode: string;
    items: RepoSearchItem[];
  } | null;
  onResultClick: (item: RepoSearchItem) => void;
  onOpenGithub: (item: RepoSearchItem) => void;
  onFallbackPrompt: () => void;
  disableSearchButton: boolean;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  items,
  keyword,
  loading,
  searchResult,
  onResultClick,
  onOpenGithub,
  onFallbackPrompt,
  disableSearchButton
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const showEmptyIndexResult =
    !loading &&
    keyword.trim() !== "" &&
    searchResult !== null &&
    searchResult.mode === "search-index" &&
    searchResult.items.length === 0;

  return (
    <>
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
              onClick={onFallbackPrompt}
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
        {items.map(item => (
          <SearchResultItem
            key={`${item.branch}:${item.path}`}
            item={item}
            keyword={keyword}
            onClick={onResultClick}
            onOpenGithub={onOpenGithub}
          />
        ))}
        {searchResult !== null && searchResult.items.length === 0 && (
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
    </>
  );
};

