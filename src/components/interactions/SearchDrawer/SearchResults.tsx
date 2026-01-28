import {
  Alert,
  Box,
  Button,
  List as MuiList,
  ListItem,
  ListItemText,
  Typography,
  useMediaQuery,
  useTheme
} from "@mui/material";
import { g3BorderRadius, G3_PRESETS } from "@/theme/g3Curves";
import { SearchResultItem } from "./SearchResultItem";
import { getHighlightRegex } from "./utils";
import type { RepoSearchItem } from "@/hooks/github/useRepoSearch";
import { useI18n } from "@/contexts/I18nContext";
import React, { useMemo } from "react";
import { AutoSizer } from "react-virtualized-auto-sizer";
import { List as VirtualList, useDynamicRowHeight } from "react-window";
import type { RowComponentProps } from "react-window";

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

interface SearchResultRowData {
  items: RepoSearchItem[];
  keyword: string;
  keywordLower: string;
  highlightRegex: RegExp | null;
  isSmallScreen: boolean;
  onResultClick: (item: RepoSearchItem) => void;
  onOpenGithub: (item: RepoSearchItem) => void;
}

const VIRTUALIZE_THRESHOLD = 30;

const SearchResultRow = ({
  ariaAttributes,
  index,
  style,
  ...rowData
}: RowComponentProps<SearchResultRowData>): React.ReactElement => {
  const item = rowData.items[index];

  if (item === undefined) {
    return (
      <div
        style={style}
        {...ariaAttributes}
        aria-hidden="true"
      />
    );
  }

  return (
    <SearchResultItem
      item={item}
      keyword={rowData.keyword}
      keywordLower={rowData.keywordLower}
      highlightRegex={rowData.highlightRegex}
      isSmallScreen={rowData.isSmallScreen}
      onClick={rowData.onResultClick}
      onOpenGithub={rowData.onOpenGithub}
      style={style}
      ariaAttributes={ariaAttributes}
    />
  );
};

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
  const { t } = useI18n();
  const listHeight = isSmallScreen ? 300 : 400;
  const shouldVirtualize = items.length >= VIRTUALIZE_THRESHOLD;
  const keywordLower = useMemo(() => keyword.toLowerCase(), [keyword]);
  const highlightRegex = useMemo(() => getHighlightRegex(keyword), [keyword]);
  const defaultRowHeight = isSmallScreen ? 72 : 88;
  const dynamicRowHeight = useDynamicRowHeight({ defaultRowHeight, key: keyword });

  const rowData = useMemo(
    (): SearchResultRowData => ({
      items,
      keyword,
      keywordLower,
      highlightRegex,
      isSmallScreen,
      onResultClick,
      onOpenGithub
    }),
    [
      items,
      keyword,
      keywordLower,
      highlightRegex,
      isSmallScreen,
      onResultClick,
      onOpenGithub
    ]
  );

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
                {isSmallScreen ? t('search.results.apiSearchButtonShort') : t('search.results.apiSearchButton')}
              </Button>
            }
          >
              <Typography variant={isSmallScreen ? "caption" : "body2"}>
            {t('search.results.emptyIndexResult')}
          </Typography>
        </Alert>
      )}

      {shouldVirtualize && items.length > 0 ? (
        <Box sx={{ height: listHeight, width: "100%" }}>
          <AutoSizer
            renderProp={({ width, height }) => {
              if (width === undefined || height === undefined) {
                return null;
              }

              return (
                <VirtualList
                  rowCount={items.length}
                  rowHeight={dynamicRowHeight}
                  rowComponent={SearchResultRow}
                  rowProps={rowData}
                  overscanCount={6}
                  tagName="ul"
                  style={{
                    height,
                    width,
                    overflowX: "hidden",
                    listStyle: "none",
                    margin: 0,
                    padding: 0
                  }}
                />
              );
            }}
          />
        </Box>
      ) : (
        <MuiList
          sx={{
            maxHeight: listHeight,
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
              keywordLower={keywordLower}
              highlightRegex={highlightRegex}
              isSmallScreen={isSmallScreen}
              onClick={onResultClick}
              onOpenGithub={onOpenGithub}
            />
          ))}
          {searchResult !== null && searchResult.items.length === 0 && (
            <ListItem>
              <ListItemText
                primary={t('search.results.noResults')}
                secondary={t('search.results.noResultsHint')}
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
        </MuiList>
      )}
    </>
  );
};
