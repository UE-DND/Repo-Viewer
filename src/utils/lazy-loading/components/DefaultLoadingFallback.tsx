import React from 'react';
import { CircularProgress, Box } from '@mui/material';

/**
 * 默认加载中组件
 */
export const DefaultLoadingFallback: React.FC<{ loadingText?: string }> = ({ 
  loadingText 
}) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '300px',
      gap: 2,
      py: 4,
    }}
  >
    <CircularProgress size={40} />
    {loadingText && (
      <Box
        component="span"
        sx={{
          fontSize: '0.875rem',
          color: 'text.secondary',
          fontWeight: 500,
        }}
      >
        {loadingText}
      </Box>
    )}
  </Box>
);
