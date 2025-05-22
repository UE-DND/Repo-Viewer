import React, { forwardRef, memo } from 'react';
import { Alert, AlertTitle, Box, IconButton, LinearProgress, alpha } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { CustomContentProps, useSnackbar } from 'notistack';
import { eventEmitter, EVENTS } from '../../utils/eventEmitter';

// 自定义Snackbar组件Props
interface CustomSnackbarProps extends CustomContentProps {
  progress?: number; 
}

// 使用memo优化CustomSnackbar以减少不必要的重新渲染
const CustomSnackbar = memo(forwardRef<HTMLDivElement, CustomSnackbarProps>(({ 
  id, 
  message, 
  variant, 
  progress, 
  ...props 
}, ref) => {
  const { closeSnackbar } = useSnackbar();
  
  const handleDismiss = () => {
    // 如果是下载相关的提示条，发送取消下载事件
    if (isDownloadRelated()) {
      eventEmitter.dispatch(EVENTS.CANCEL_DOWNLOAD, id);
    }
    closeSnackbar(id);
  };
  
  const severity = variant === 'default' ? 'info' : variant;
  const title = 
    variant === 'success' ? '成功' : 
    variant === 'error' ? '错误' : 
    variant === 'warning' ? '警告' : 
    '信息'; 
    
  // 简化判断逻辑，仅检查是否为下载相关提示条
  const isDownloadRelated = () => {
    // 下载成功的提示条不需要显示X号
    if (variant === 'success' && typeof message === 'string' && message.includes('下载成功')) {
      return false;
    }
    
    // 直接判断是否有进度条 - 下载提示总是有进度条
    if (progress !== undefined && progress >= 0) {
      return true;
    }
    
    // 检查消息内容是否为React元素且包含LinearProgress组件(进度条)
    if (React.isValidElement(message)) {
      // 递归检查子元素中是否包含LinearProgress
      const hasProgressBar = (element: React.ReactNode): boolean => {
        // 如果不是有效元素则直接返回 false
        if (!React.isValidElement(element)) return false;
        
        // 检查元素类型是否为LinearProgress
        if (element.type === LinearProgress) {
          return true;
        }
        
        // 安全地检查子元素
        try {
          const props = element.props as any;
          const children = props?.children;
          
          if (!children) return false;
          
          // 如果子元素是数组，检查每个子元素
          if (Array.isArray(children)) {
            return children.some(child => hasProgressBar(child));
          }
          
          // 单个子元素
          return hasProgressBar(children);
        } catch (e) {
          // 如果访问props或children时出错，返回false
          return false;
        }
      };
      
      return hasProgressBar(message);
    }
    
    // 检查消息文本内容是否包含"下载"关键词
    if (typeof message === 'string' && (message.includes('下载') || message.includes('准备'))) {
      // 排除下载成功的提示
      return !message.includes('下载成功');
    }
    
    return false;
  };
  
  return (
    <Alert 
      ref={ref} 
      severity={severity} 
      variant="filled" 
      sx={{ 
        width: { xs: '90%', sm: 'auto' }, 
        margin: { xs: 'auto', sm: 'initial' },
        minWidth: { sm: '344px' }, 
        alignItems: 'center', 
        borderRadius: 2, 
      }}
      action={
        isDownloadRelated() ? (
          <IconButton size="small" color="inherit" onClick={handleDismiss}>
            <CloseIcon fontSize="small" />
          </IconButton>
        ) : null
      }
    >
      <AlertTitle sx={{ fontWeight: 500 }}>{title}</AlertTitle>
      <Box sx={{ width: '100%' }}>
        {message}
        {progress !== undefined && progress >= 0 && (
           <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              mt: 1,
              height: 6,
              borderRadius: 1,
              backgroundColor: (theme) => alpha(theme.palette.common.white, 0.3),
              '& .MuiLinearProgress-bar': {
                backgroundColor: (theme) => theme.palette.common.white,
              }
            }}
          />
        )}
      </Box>
    </Alert>
  );
}));

// 添加显示名称以便调试
CustomSnackbar.displayName = 'CustomSnackbar';

export default CustomSnackbar; 