import React, { useContext, useState, useCallback } from 'react';
import { Box, IconButton, Tooltip, useTheme } from '@mui/material';
import {
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { ColorModeContext } from '../../contexts/ColorModeContext';
import { useRefresh } from '../../hooks/useRefresh';
import { pulseAnimation } from '../../theme/animations';
import { GitHubService } from '../../services/github';
import { useSnackbar } from 'notistack';

// 工具栏按钮组件
const ToolbarButtons: React.FC = () => {
  const colorMode = useContext(ColorModeContext);
  const theme = useTheme();
  const handleRefresh = useRefresh();
  const { enqueueSnackbar } = useSnackbar();
  
  // 处理刷新按钮点击
  const onRefreshClick = useCallback(() => {
    // 强制刷新时绕过缓存获取新数据
    GitHubService.clearCache(); 
    handleRefresh();
  }, [handleRefresh]);
  
  // 处理主题切换按钮点击
  const onThemeToggleClick = useCallback(() => {
    // 设置标记，表明这是一个主题切换操作，防止触发README重新加载
    document.documentElement.setAttribute('data-theme-change-only', 'true');
    // 执行主题切换
    colorMode.toggleColorMode();
  }, [colorMode]);
  
  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Tooltip title="刷新内容">
        <IconButton 
          color="inherit"
          onClick={onRefreshClick}
          sx={{
            '&:hover': {
              animation: `${pulseAnimation} 0.4s ease`,
              color: theme.palette.primary.light
            }
          }}
        >
          <RefreshIcon />
        </IconButton>
      </Tooltip>
      
      {/* 主题切换按钮 - 点击时不会触发内容重新加载 */}
      <Tooltip title={theme.palette.mode === 'dark' ? '浅色模式' : '深色模式'}>
        <IconButton 
          onClick={onThemeToggleClick} 
          color="inherit"
          sx={{
            '&:hover': {
              animation: `${pulseAnimation} 0.4s ease`,
              color: theme.palette.mode === 'dark' 
                ? theme.palette.warning.light 
                : theme.palette.primary.light
            }
          }}
        >
          {theme.palette.mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default ToolbarButtons; 