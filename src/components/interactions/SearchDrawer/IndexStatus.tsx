import { useMemo } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  IconButton,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Refresh as RefreshIcon } from "@mui/icons-material";
import { g3BorderRadius, G3_PRESETS } from "@/theme/g3Curves";
import { useI18n } from "@/contexts/I18nContext";
import type { InterpolationOptions } from "@/utils/i18n/types";

const FALLBACK_INDEX_TIME = Date.now();

interface IndexStatusProps {
  enabled: boolean;
  loading: boolean;
  error: { message: string; code?: string } | null;
  ready: boolean;
  indexedBranches: string[];
  lastUpdatedAt: number | undefined;
  onRefresh: () => void;
}

interface ErrorScenario {
  title: string;
  description: string[];
}

const getErrorScenario = (
  error: { message: string; code?: string } | null,
  ready: boolean,
  t: (key: string, options?: InterpolationOptions) => string
): ErrorScenario | null => {
  if (error?.code !== undefined) {
    switch (error.code) {
      case 'SEARCH_INDEX_MANIFEST_NOT_FOUND':
        return {
          title: t('search.index.errors.manifestNotFound.title'),
          description: [
            t('search.index.errors.manifestNotFound.description1'),
            t('search.index.errors.manifestNotFound.description2'),
          ],
        };
      case 'SEARCH_INDEX_MANIFEST_INVALID':
        return {
          title: t('search.index.errors.manifestInvalid.title'),
          description: [t('search.index.errors.manifestInvalid.description1')],
        };
      case 'SEARCH_INDEX_FILE_NOT_FOUND':
        return {
          title: t('search.index.errors.fileNotFound.title'),
          description: [
            t('search.index.errors.fileNotFound.description1'),
            t('search.index.errors.fileNotFound.description2'),
          ],
        };
      case 'SEARCH_INDEX_DOCUMENT_INVALID':
        return {
          title: t('search.index.errors.documentInvalid.title'),
          description: [
            t('search.index.errors.documentInvalid.description1'),
            t('search.index.errors.documentInvalid.description2'),
          ],
        };
      default:
        return {
          title: t('search.index.errors.default.title'),
          description: [
            t('search.index.errors.default.description1', { message: error.message }),
            t('search.index.errors.default.description2'),
          ],
        };
    }
  }

  if (!ready) {
    return {
      title: t('search.index.notReady.title'),
      description: [
        t('search.index.notReady.description1'),
        t('search.index.notReady.description2'),
      ],
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
  onRefresh,
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const { t } = useI18n();

  return useMemo(() => {
    if (!enabled) {
      return (
        <Alert severity="info" variant="outlined">
          {t('search.index.disabled')}
        </Alert>
      );
    }

    if (loading) {
      return (
        <Alert severity="info" icon={<CircularProgress size={16} />}>
          {t('search.index.detecting')}
        </Alert>
      );
    }

    const scenario = getErrorScenario(error, ready, t);

    if (scenario !== null) {
      return (
        <Alert
          severity="warning"
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: isSmallScreen ? 0.75 : 1,
            pl: isSmallScreen ? 2 : 3,
            px: isSmallScreen ? 1.5 : 2,
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
            <Tooltip title={t('search.index.refresh')} placement="left">
              <span>
                <IconButton
                  onClick={onRefresh}
                  disabled={loading}
                  size={isSmallScreen ? "small" : "medium"}
                  sx={{ borderRadius: g3BorderRadius(G3_PRESETS.button) }}
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

    return (
      <Alert severity="success">
        {t('search.index.ready', {
          time: new Date(lastUpdatedAt ?? FALLBACK_INDEX_TIME).toLocaleString(),
          count: indexedBranches.length,
        })}
      </Alert>
    );
  }, [enabled, loading, error, ready, indexedBranches.length, lastUpdatedAt, isSmallScreen, onRefresh, t]);
};
