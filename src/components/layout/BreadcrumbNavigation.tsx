import React, { memo } from 'react';
import {
  Box, Breadcrumbs, Typography, Link, alpha, useTheme, IconButton, Tooltip
} from '@mui/material';
import {
  Home as HomeIcon,
  ChevronRight as ChevronRightIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';

interface BreadcrumbNavigationProps {
  breadcrumbSegments: Array<{ name: string; path: string }>;
  handleBreadcrumbClick: (path: string) => void;
  breadcrumbsMaxItems: number;
  isSmallScreen: boolean;
  breadcrumbsContainerRef: React.RefObject<HTMLDivElement | null>;
}

const BreadcrumbNavigation = memo<BreadcrumbNavigationProps>(({
  breadcrumbSegments,
  handleBreadcrumbClick,
  breadcrumbsMaxItems,
  isSmallScreen,
  breadcrumbsContainerRef
}) => {
  const theme = useTheme();
  
  // 处理返回上一级
  const handleGoUp = () => {
    // 如果只有Home或者当前已经在Home，不执行操作
    if (breadcrumbSegments.length <= 1) return;
    
    // 获取倒数第二个路径（当前路径的父级）
    const parentIndex = breadcrumbSegments.length - 2;
    if (parentIndex >= 0) {
      const parentPath = breadcrumbSegments[parentIndex].path;
      handleBreadcrumbClick(parentPath);
    }
  };

  // 检查是否有上级目录可返回
  const canGoUp = breadcrumbSegments.length > 1;
  
  return (
    <Box 
      ref={breadcrumbsContainerRef}
      sx={{ 
        mb: { xs: 2, sm: 3 }, 
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Breadcrumbs 
        aria-label="breadcrumb" 
        separator={<ChevronRightIcon fontSize="small" color="action" />}  
        maxItems={breadcrumbsMaxItems || undefined}
        itemsBeforeCollapse={isSmallScreen ? 1 : 2}
        itemsAfterCollapse={isSmallScreen ? 1 : 2}
        sx={{ 
          px: { xs: 1.5, sm: 2 }, 
          py: { xs: 1, sm: 1.5 }, 
          bgcolor: 'background.paper', 
          borderRadius: 2, 
          boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.05)',
          '& .MuiBreadcrumbs-ol': {
            alignItems: 'center',
            flexWrap: 'nowrap',
            width: '100%',
          },
          '& .MuiBreadcrumbs-li': {
            whiteSpace: 'nowrap',
            maxWidth: isSmallScreen ? '90px' : '200px', 
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'inline-block',
            fontSize: { xs: '0.75rem', sm: 'inherit' }, 
          },
          '& .MuiBreadcrumbs-separator': {
            mx: { xs: 0.5, sm: 1 } 
          },
          '& .MuiBreadcrumbs-collapsed': {
            color: theme.palette.primary.main,
            backgroundColor: alpha(theme.palette.primary.main, 0.07),
            borderRadius: 2,
            px: { xs: 0.5, sm: 1 }, 
            py: 0.2,
            mx: { xs: 0.25, sm: 0.5 }, 
            fontWeight: 500,
            fontSize: { xs: '0.7rem', sm: '0.75rem' }, 
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.12),
              transform: 'scale(1.05)',
              transition: 'all 0.2s'
            }
          },
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          scrollbarWidth: 'thin',
          msOverflowStyle: 'none', /* IE and Edge */
          '&::-webkit-scrollbar': {
            height: '4px'
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: alpha(theme.palette.primary.main, 0.2),
            borderRadius: '2px'
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'transparent'
          },
          ...(theme.palette.mode === 'dark' && {
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: alpha(theme.palette.primary.main, 0.3),
              borderRadius: '2px'
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'rgba(255, 255, 255, 0.03)'
            },
          }),
          flexGrow: 1,
          mr: { xs: 1, sm: 2 }
        }}
      >
        {breadcrumbSegments.map((segment, index) => {
          const isLast = index === breadcrumbSegments.length - 1;
          const isHome = segment.name === 'Home';
          return isLast ? (
            <Typography 
              key={segment.path} 
              color="text.primary" 
              sx={{ 
                display: 'flex', 
                alignItems: 'center',
                py: { xs: 0.25, sm: 0.5 }, 
                px: { xs: 1, sm: 1.5 }, 
                borderRadius: { xs: 1.5, sm: 2 }, 
                bgcolor: alpha(theme.palette.primary.main, 0.06),
                fontWeight: 500,
                height: { xs: '24px', sm: '32px' }, 
                fontSize: { xs: '0.75rem', sm: 'inherit' }, 
                boxSizing: 'border-box',
                maxWidth: isSmallScreen ? '120px' : '250px', 
                '& > span': { 
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'block' 
                }
              }}
            >
              {isHome ? (
                <Box 
                  component="span"
                  sx={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: theme.palette.primary.main,
                    mr: 0.5,
                    p: { xs: 0.25, sm: 0.5 }, 
                    borderRadius: '50%',
                    flexShrink: 0 
                  }}
                >
                  <HomeIcon fontSize="small" sx={{ fontSize: { xs: '0.9rem', sm: '1.1rem' } }} />
                </Box>
              ) : null}
              <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {segment.name}
              </Box>
            </Typography>
          ) : (
            <Link
              key={segment.path}
              underline="none"
              color={isHome ? 'primary' : 'inherit'}
              href="#"
              onClick={(e) => { e.preventDefault(); handleBreadcrumbClick(segment.path); }}
              sx={{ 
                display: 'flex', 
                alignItems: 'center',
                px: { xs: 1, sm: 1.5 }, 
                py: { xs: 0.25, sm: 0.5 }, 
                borderRadius: { xs: 1.5, sm: 2 }, 
                bgcolor: isHome ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                '&:hover': {
                  bgcolor: isHome 
                    ? alpha(theme.palette.primary.main, 0.12) 
                    : alpha(theme.palette.primary.main, 0.04),
                  color: isHome ? theme.palette.primary.main : alpha(theme.palette.primary.main, 0.9),
                  transform: 'translateY(-1px)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  transition: 'all 0.2s'
                },
                fontSize: { xs: '0.75rem', sm: 'inherit' }, 
                fontWeight: isHome ? 500 : 400,
                transition: 'all 0.2s',
                height: { xs: '24px', sm: '32px' }, 
                boxSizing: 'border-box',
                whiteSpace: 'nowrap',
                maxWidth: isSmallScreen ? '90px' : '220px', 
              }}
              aria-label={isHome ? "返回首页" : `返回到${segment.name}`}
            >
              {isHome && (
                <Box 
                  component="span"
                  sx={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: theme.palette.primary.main,
                    mr: isSmallScreen ? 0 : 0.5,
                    bgcolor: 'transparent',
                    p: { xs: 0.2, sm: 0.4 }, 
                    borderRadius: '50%',
                    transition: 'all 0.2s',
                    '.MuiLink-root:hover &': {
                      transform: 'rotate(-5deg)'
                    },
                    flexShrink: 0 
                  }}
                >
                  <HomeIcon fontSize="small" sx={{ fontSize: { xs: '0.9rem', sm: '1.1rem' } }} />
                </Box>
              )}
              {(!isHome || !isSmallScreen) && (
                <Box 
                  component="span" 
                  sx={{ 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap',
                    display: 'block' 
                  }}
                >
                  {segment.name}
                </Box>
              )}
            </Link>
          );
        })}
      </Breadcrumbs>
      
      {/* 返回上一级按钮 */}
      <Tooltip title={canGoUp ? "返回上一级" : "已在顶级目录"}>
        <span>
          <IconButton
            onClick={handleGoUp}
            disabled={!canGoUp}
            aria-label="返回上一级目录"
            size={isSmallScreen ? "small" : "medium"}
            sx={{
              bgcolor: 'background.paper',
              color: canGoUp ? theme.palette.primary.main : 'text.disabled',
              boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.05)',
              width: { xs: 36, sm: 40 },
              height: { xs: 36, sm: 40 },
              position: 'relative',
              '&:hover': canGoUp ? {
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                transform: 'translateX(-2px)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              } : {},
              '&:active': canGoUp ? {
                transform: 'translateX(-4px)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                transition: 'all 0.18s cubic-bezier(0.3, 0, 0.5, 1)',
              } : {},
              '&:not(:active)': canGoUp ? {
                transition: 'transform 0.25s cubic-bezier(0.2, 0, 0, 1.5)',
              } : {},
              '&::after': canGoUp ? {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                backgroundColor: theme.palette.primary.main,
                transition: 'all 0.3s cubic-bezier(0.2, 0, 0.3, 1)',
                opacity: 0,
                zIndex: -1,
              } : {},
              '&:active::after': canGoUp ? {
                opacity: 0.18,
                transform: 'scale(1.3)',
                transition: 'all 0.2s cubic-bezier(0, 0, 0.2, 1)',
              } : {},
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <ArrowBackIcon 
              fontSize={isSmallScreen ? "small" : "medium"}
              sx={{
                transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '.MuiIconButton-root:active &': canGoUp ? {
                  transform: 'translateX(-1px)',
                  transition: 'transform 0.15s cubic-bezier(0.1, 0, 0.4, 1)',
                } : {}
              }}
            />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
});

BreadcrumbNavigation.displayName = 'BreadcrumbNavigation';

export default BreadcrumbNavigation; 