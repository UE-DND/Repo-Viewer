import React, { memo } from 'react';
import { 
  Box, Paper, Typography, Button, 
  alpha, useTheme
} from '@mui/material';
import { 
  ErrorOutline as ErrorIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

interface ErrorDisplayProps {
  errorMessage: string;
  onRetry?: () => void;
  isSmallScreen: boolean;
}

const ErrorDisplay = memo<ErrorDisplayProps>(({
  errorMessage,
  onRetry,
  isSmallScreen
}) => {
  // 使用useTheme钩子获取主题
  const theme = useTheme();
  
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 3, sm: 4 },
        borderRadius: 2,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: alpha(theme.palette.error.main, 0.2),
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        width: '100%',
        minHeight: '200px'
      }}
    >
      <ErrorIcon 
        color="error" 
        sx={{ 
          fontSize: { xs: '2.5rem', sm: '3rem' },
          mb: 2
        }}
      />
      
      <Typography 
        variant={isSmallScreen ? "body1" : "h6"} 
        color="error" 
        gutterBottom
        sx={{ fontWeight: 500 }}
      >
        出错了
      </Typography>
      
      <Typography 
        variant="body2" 
        color="text.secondary"
        sx={{ 
          maxWidth: '500px',
          mb: 3
        }}
      >
        {errorMessage}
      </Typography>
      
      {onRetry && (
        <Button
          variant="contained"
          color="primary"
          startIcon={<RefreshIcon />}
          onClick={onRetry}
          sx={{
            borderRadius: { xs: 4, sm: 5 },
            px: { xs: 2, sm: 3 },
            py: { xs: 0.75, sm: 1 },
            textTransform: 'none',
            fontWeight: 500
          }}
        >
          重试
        </Button>
      )}
    </Paper>
  );
});

// 添加显示名称以便调试
ErrorDisplay.displayName = 'ErrorDisplay';

export default ErrorDisplay; 