import {
  Box,
  Chip,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme
} from "@mui/material";
import { GitHub as GitHubIcon } from "@mui/icons-material";
import { g3BorderRadius, G3_PRESETS } from "@/theme/g3Curves";
import { highlightKeyword, highlightKeywords, resolveItemHtmlUrl } from "./utils";
import type { RepoSearchItem } from "@/hooks/github/useRepoSearch";
import { useI18n } from "@/contexts/I18nContext";

interface SearchResultItemProps {
  item: RepoSearchItem;
  keyword: string;
  onClick: (item: RepoSearchItem) => void;
  onOpenGithub: (item: RepoSearchItem) => void;
}

export const SearchResultItem: React.FC<SearchResultItemProps> = ({
  item,
  keyword,
  onClick,
  onOpenGithub
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const { t } = useI18n();

  const pathParts = highlightKeyword(item.path, keyword);
  const githubUrl = resolveItemHtmlUrl(item);

  const snippet = ("snippet" in item && typeof (item as { snippet?: unknown }).snippet === "string")
    ? (item as { snippet?: string }).snippet
    : undefined;
  const snippetParts = snippet ? highlightKeywords(snippet, keyword) : null;

  return (
    <ListItem disablePadding alignItems="flex-start">
      <Box
        sx={{
          display: "flex",
          width: "100%",
          gap: 1,
          alignItems: "flex-start"
        }}
      >
        <ListItemButton
          onClick={() => { onClick(item); }}
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
                  {item.source === "search-index" ? t('search.results.source.index') : t('search.results.source.api')}
                </Typography>
              </Stack>
            }
            secondary={
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
                {snippetParts && snippetParts.length > 0 && (
                  <Box component="span" display="block" mt={0.5}>
                    {snippetParts.map((part: { text: string; highlight: boolean }, idx: number) => (
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
                )}
              </Box>
            }
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
          <Tooltip title={t('search.github.open')} placement="left">
            <IconButton
              onClick={() => { onOpenGithub(item); }}
              aria-label={t('search.github.open')}
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
};
