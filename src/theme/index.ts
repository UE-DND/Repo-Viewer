import { createTheme, alpha, type PaletteMode, type Theme } from '@mui/material/styles';
import { g3BorderRadius, G3_PRESETS } from './g3Curves';

// 主题色配置
const md3Themes = [
  {
    name: '默认',
    light: {
      primary: {
        main: '#C2185B',
        light: '#FCE4EC',
        dark: '#880E4F',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: '#E91E63',
        light: '#F8BBD0',
        dark: '#AD1457',
        contrastText: '#1C1B1F',
      }
    },
    dark: {
      primary: {
        main: '#F48FB1',
        light: '#FCE4EC',
        dark: '#F06292',
        contrastText: '#880E4F',
      },
      secondary: {
        main: '#F48FB1',
        light: '#FCE4EC',
        dark: '#F06292',
        contrastText: '#3F0019',
      }
    }
  },
  {
    name: '蓝色',
    light: {
      primary: {
        main: '#0B57D0',
        light: '#D3E3FD',
        dark: '#0842A0',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: '#1976d2',
        light: '#E3F2FD',
        dark: '#175cb9',
        contrastText: '#1C1B1F',
      }
    },
    dark: {
      primary: {
        main: '#A8C7FA',
        light: '#D3E3FD',
        dark: '#7AACF9',
        contrastText: '#0842A0',
      },
      secondary: {
        main: '#90CAF9',
        light: '#E3F2FD',
        dark: '#64B5F6',
        contrastText: '#002159',
      }
    }
  },
  {
    name: '绿色',
    light: {
      primary: {
        main: '#146C2E',
        light: '#CDEECD',
        dark: '#0C4819',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: '#2E7D32',
        light: '#E8F5E9',
        dark: '#1B5E20',
        contrastText: '#1C1B1F',
      }
    },
    dark: {
      primary: {
        main: '#86D993',
        light: '#CDEECD',
        dark: '#65C874',
        contrastText: '#0C4819',
      },
      secondary: {
        main: '#81C784',
        light: '#E8F5E9',
        dark: '#66BB6A',
        contrastText: '#052e10',
      }
    }
  },
  {
    name: '紫色',
    light: {
      primary: {
        main: '#7B1FA2',
        light: '#E9D8FD',
        dark: '#4A0072',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: '#9C27B0',
        light: '#F3E5F5',
        dark: '#6A0080',
        contrastText: '#1C1B1F',
      }
    },
    dark: {
      primary: {
        main: '#D0A9F5',
        light: '#E9D8FD',
        dark: '#C17EF3',
        contrastText: '#4A0072',
      },
      secondary: {
        main: '#CE93D8',
        light: '#F3E5F5',
        dark: '#BA68C8',
        contrastText: '#29003B',
      }
    }
  },
  {
    name: '橙色',
    light: {
      primary: {
        main: '#F25C00',
        light: '#FDC2A9',
        dark: '#B72500',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: '#FF5722',
        light: '#FFCCBC',
        dark: '#E64A19',
        contrastText: '#1C1B1F',
      }
    },
    dark: {
      primary: {
        main: '#FFB59C',
        light: '#FFDBCC',
        dark: '#FF8A65',
        contrastText: '#B72500',
      },
      secondary: {
        main: '#FF8A65',
        light: '#FFCCBC',
        dark: '#FF7043',
        contrastText: '#330900',
      }
    }
  },
  {
    name: '红色',
    light: {
      primary: {
        main: '#B31412',
        light: '#FFDAD6',
        dark: '#8C0009',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: '#F44336',
        light: '#FFEBEE',
        dark: '#D32F2F',
        contrastText: '#1C1B1F',
      }
    },
    dark: {
      primary: {
        main: '#FFACA8',
        light: '#FFDAD6',
        dark: '#FF897A',
        contrastText: '#8C0009',
      },
      secondary: {
        main: '#EF9A9A',
        light: '#FFEBEE',
        dark: '#E57373',
        contrastText: '#4B0000',
      }
    }
  },
  {
    name: '青色',
    light: {
      primary: {
        main: '#018786',
        light: '#A7F0EC',
        dark: '#005B5B',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: '#00BCD4',
        light: '#E0F7FA',
        dark: '#0097A7',
        contrastText: '#1C1B1F',
      }
    },
    dark: {
      primary: {
        main: '#70EFDE',
        light: '#A7F0EC',
        dark: '#00CFBE',
        contrastText: '#005B5B',
      },
      secondary: {
        main: '#80DEEA',
        light: '#E0F7FA',
        dark: '#4DD0E1',
        contrastText: '#003544',
      }
    }
  }
];

/**
 * 获取基于日期的主题索引
 * 
 * 根据当前日期计算主题索引，每天使用不同的主题。
 * 
 * @returns 主题索引
 */
const getThemeIndexByDate = (): number => {
  const today = new Date();
  const dayCount = Math.floor(today.getTime() / (24 * 60 * 60 * 1000));
  return dayCount % md3Themes.length;
};

/**
 * 获取当前主题配置
 * 
 * @returns 当前主题配置对象
 */
const getCurrentTheme = (): (typeof md3Themes)[number] => {
  const index = getThemeIndexByDate();
  const theme = md3Themes[index];
  if (theme === undefined) {
    throw new Error(`Invalid theme index: ${index.toString()}`);
  }
  return theme;
};

const lightPalette = {
  primary: getCurrentTheme().light.primary,
  secondary: getCurrentTheme().light.secondary,
  error: {
    main: '#B3261E',
    light: '#F9DEDC',
    dark: '#601410',
    contrastText: '#FFFFFF',
  },
  background: {
    default: '#FFFBFE',
    paper: '#FFFFFF',
  },
  text: {
    primary: '#1C1B1F',
    secondary: '#49454F',
    disabled: alpha('#1C1B1F', 0.38),
  },
};

const darkPalette = {
  primary: getCurrentTheme().dark.primary,
  secondary: getCurrentTheme().dark.secondary,
  error: {
    main: '#F2B8B5',
    light: '#F9DEDC',
    dark: '#B3261E',
    contrastText: '#601410',
  },
  background: {
    default: '#1C1B1F',
    paper: '#2D2C34',
  },
  text: {
    primary: '#E6E1E5',
    secondary: '#CAC4D0',
    disabled: alpha('#E6E1E5', 0.38),
  },
};

/**
 * 获取当前主题名称
 * 
 * @returns 当前主题的显示名称
 */
export const getCurrentThemeName = (): string => {
  return getCurrentTheme().name;
};

/**
 * 创建Material You主题
 * 
 * 根据指定的模式（明/暗）创建完整的Material-UI主题配置。
 * 
 * @param mode - 主题模式（'light'或'dark'）
 * @returns Material-UI主题对象
 */
export const createMaterialYouTheme = (mode: PaletteMode): Theme => {
  const themeConfig = {
    palette: {
      mode,
      ...(mode === 'light' ? lightPalette : darkPalette),
    },
    shape: {
      borderRadius: g3BorderRadius(G3_PRESETS.fileListContainer),
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontWeight: 400,
        fontSize: '2.5rem',
        lineHeight: 1.2,
        letterSpacing: '-0.01562em',
        '@media (max-width:600px)': {
          fontSize: '2rem',
        },
      },
      h6: {
        fontWeight: 500,
        fontSize: '1.25rem',
        lineHeight: 1.6,
        letterSpacing: '0.0075em',
        '@media (max-width:600px)': {
          fontSize: '1.1rem',
        },
      },
      button: {
        textTransform: 'none' as const,
        fontWeight: 500,
      },
      body1: {
        '@media (max-width:600px)': {
          fontSize: '0.875rem',
        },
      },
      body2: {
        '@media (max-width:600px)': {
          fontSize: '0.75rem',
        },
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: g3BorderRadius(G3_PRESETS.button),
            padding: '10px 24px',
            boxShadow: 'none',
            '@media (max-width:600px)': {
              padding: '8px 16px',
              fontSize: '0.8rem',
            },
          },
          contained: {
            '&:hover': {
              boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: ({ theme }: { theme: Theme }) => ({
            boxShadow: 'none',
            backgroundColor: theme.palette.mode === 'light' ? '#FFFBFE' : '#1C1B1F',
            color: theme.palette.mode === 'light' ? '#1C1B1F' : '#E6E1E5',
          }),
        },
      },
      MuiCard: {
        styleOverrides: {
          root: ({ theme }: { theme: Theme }) => ({
            borderRadius: g3BorderRadius(G3_PRESETS.card),
            padding: 16,
            boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.1)',
            backgroundColor: theme.palette.mode === 'light' ? '#FFFFFF' : '#2D2C34',
            '@media (max-width:600px)': {
              padding: 12,
              borderRadius: g3BorderRadius({...G3_PRESETS.card, radius: 16}),
            },
          }),
        },
      },
      MuiPaper: {
        styleOverrides: {
          rounded: {
            borderRadius: g3BorderRadius(G3_PRESETS.fileListContainer),
            '@media (max-width:600px)': {
              borderRadius: g3BorderRadius({...G3_PRESETS.fileListContainer, radius: 12}),
            },
          },
          elevation1: {
            boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.1)',
          },
        },
      },
      MuiListItem: {
        styleOverrides: {
          root: {
            borderRadius: g3BorderRadius(G3_PRESETS.fileListItem),
            margin: '4px 0',
            overflow: 'visible',
            '@media (max-width:600px)': {
              margin: '2px 0',
              minHeight: '36px',
              borderRadius: g3BorderRadius({...G3_PRESETS.fileListItem, radius: 8}),
            },
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: ({ theme }: { theme: Theme }) => ({
            borderRadius: g3BorderRadius(G3_PRESETS.fileListItem),
            transition: 'background-color 0.3s ease',
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'light' ? 0.08 : 0.16),
            },
            '@media (max-width:600px)': {
              borderRadius: g3BorderRadius({...G3_PRESETS.fileListItem, radius: 8}),
              py: 0.75,
            },
          }),
        },
      },
      MuiListItemIcon: {
        styleOverrides: {
          root: {
            '@media (max-width:600px)': {
              minWidth: '32px',
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: '50%',
            '@media (max-width:600px)': {
              padding: 8,
              '& .MuiSvgIcon-root': {
                fontSize: '1.25rem',
              },
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: g3BorderRadius(G3_PRESETS.dialog),
            padding: 0,
            '@media (max-width:600px)': {
              borderRadius: g3BorderRadius({...G3_PRESETS.dialog, radius: 20}),
            },
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            fontSize: '1.25rem',
            fontWeight: 500,
            '@media (max-width:600px)': {
              fontSize: '1.1rem',
              padding: '16px',
            },
          },
        },
      },
      MuiDialogContent: {
        styleOverrides: {
          root: {
            padding: 24,
            '@media (max-width:600px)': {
              padding: 16,
            },
          },
        },
      },
      MuiDialogActions: {
        styleOverrides: {
          root: {
            padding: '12px 24px',
            '@media (max-width:600px)': {
              padding: '8px 16px',
            },
          },
        },
      },
      MuiBreadcrumbs: {
        styleOverrides: {
          root: {
            '& .MuiBreadcrumbs-separator': {
              margin: '0 8px',
              '@media (max-width:600px)': {
                margin: '0 4px',
              },
            },
          },
        },
      },
      MuiSvgIcon: {
        styleOverrides: {
          root: {
            '@media (max-width:600px)': {
              fontSize: '1.25rem',
            },
            '&.MuiSvgIcon-fontSizeSmall': {
              '@media (max-width:600px)': {
                fontSize: '1rem',
              },
            },
          },
        },
      },
      MuiToolbar: {
        styleOverrides: {
          root: {
            '@media (max-width:600px)': {
              minHeight: '56px',
              padding: '0 16px',
            },
          },
        },
      },
      MuiTooltip: {
        defaultProps: {
        },
        styleOverrides: {
          tooltip: ({ theme }: { theme: Theme }) => ({
            backgroundColor: alpha(theme.palette.grey[700], 0.92),
            color: '#fff',
            borderRadius: g3BorderRadius(G3_PRESETS.tooltip),
            padding: '6px 12px',
            fontSize: theme.typography.pxToRem(12),
            maxWidth: 300,
          }),
          popper: {
            transition: 'none !important',
          }
        },
      },
      MuiSwitch: {
        styleOverrides: {
          switchBase: {
            color: '#E6E1E5',
            '&.Mui-checked': {
              color: '#D0BCFF',
            },
            '&.Mui-checked + .MuiSwitch-track': {
              backgroundColor: '#9A82DB',
            },
          },
          track: ({ theme }: { theme: Theme }) => ({
            backgroundColor: theme.palette.mode === 'light' ? '#CAC4D0' : '#49454F',
          }),
        },
      },
    },
  };
  return createTheme(themeConfig);
};
const materialYouTheme = createMaterialYouTheme('light');
export default materialYouTheme;
