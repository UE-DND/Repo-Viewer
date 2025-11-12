import {
  TextField,
  Button,
  InputAdornment,
  IconButton,
  CircularProgress,
  useMediaQuery,
  useTheme
} from "@mui/material";
import { Clear as ClearIcon } from "@mui/icons-material";
import { g3BorderRadius, G3_PRESETS } from "@/theme/g3Curves";
import { useI18n } from "@/contexts/I18nContext";

interface SearchInputProps {
  value: string;
  label: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  onClear: () => void;
  disabled: boolean;
  loading: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  label,
  onChange,
  onSearch,
  onClear,
  disabled,
  loading
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const { t } = useI18n();

  return (
    <TextField
      id="repo-search-keyword"
      label={label}
      placeholder={t('search.input.placeholder')}
      variant="outlined"
      fullWidth
      value={value}
      onChange={(event) => { onChange(event.target.value); }}
      onKeyDown={event => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          onSearch();
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
              {value.trim().length > 0 && (
                <IconButton
                  size="small"
                  onClick={onClear}
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
                startIcon={loading ? <CircularProgress size={16} /> : undefined}
                disabled={disabled || loading}
                onClick={onSearch}
                sx={{
                  mr: 0,
                  borderRadius: g3BorderRadius(G3_PRESETS.button),
                  minWidth: isSmallScreen ? 'auto' : undefined,
                  px: isSmallScreen ? 2 : 3
                }}
              >
                {t('search.actions.search')}
              </Button>
            </InputAdornment>
          )
        }
      }}
    />
  );
};

