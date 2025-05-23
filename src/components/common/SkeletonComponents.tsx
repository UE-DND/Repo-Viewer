import React, { useState, useEffect } from 'react';
import { 
  Box, Skeleton, useTheme, alpha, 
  List, ListItem, ListItemIcon, ListItemText,
  Paper, Divider
} from '@mui/material';
import { fadeAnimation, fadeOutAnimation } from '../../theme/animations';

// 获取骨架屏样式，使用当前主题颜色
const getSkeletonStyles = (theme: any) => ({
  backgroundColor: alpha(theme.palette.primary.main, 0.08),
  '&::after': {
    backgroundColor: alpha(theme.palette.primary.main, 0.12),
  },
  animation: `$pulse 1.5s ease-in-out 0.5s infinite, ${fadeAnimation} 0.5s ease-in-out`,
  '@keyframes pulse': {
    '0%': {
      opacity: 1,
    },
    '50%': {
      opacity: 0.5,
    },
    '100%': {
      opacity: 1,
    },
  },
});

// 创建获取容器过渡动画样式的函数，根据是否正在退出应用不同动画
const getContainerTransitionStyles = (isExiting: boolean) => ({
  animation: isExiting 
    ? `${fadeOutAnimation} 0.3s ease-in-out forwards`
    : `${fadeAnimation} 0.5s ease-in-out`,
  transition: 'all 0.3s ease-in-out',
  visibility: isExiting ? 'hidden' : 'visible',
  transitionDelay: isExiting ? '0s' : '0.1s',
});

// 文件列表骨架屏 - 显示多个文件列表项
export const FileListSkeleton: React.FC<{ 
  itemCount?: number, 
  isSmallScreen?: boolean,
  visible?: boolean,
  onExited?: () => void
}> = ({ 
  itemCount = 10, 
  isSmallScreen = false,
  visible = true,
  onExited
}) => {
  const theme = useTheme();
  const rowHeight = isSmallScreen ? 60 : 72;
  const [isExiting, setIsExiting] = useState(!visible);
  
  useEffect(() => {
    if (!visible && !isExiting) {
      setIsExiting(true);
      // 使用动画的持续时间后触发onExited回调
      const timer = setTimeout(() => {
        if (onExited) onExited();
      }, 300); // 匹配fadeOutAnimation的持续时间
      return () => clearTimeout(timer);
    } else if (visible && isExiting) {
      setIsExiting(false);
    }
  }, [visible, isExiting, onExited]);
  
  return (
    <List 
      sx={{ 
        width: '100%', 
        bgcolor: 'background.paper', 
        borderRadius: 2,
        mb: 2,
        overflow: 'hidden',
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
        border: '1px solid',
        borderColor: 'divider',
        p: { xs: 1, sm: 2 },
        ...getContainerTransitionStyles(isExiting)
      }}
    >
      {Array(itemCount).fill(0).map((_, index) => (
        <FileListItemSkeleton key={index} isSmallScreen={isSmallScreen} visible={visible} />
      ))}
    </List>
  );
};

// 单个文件列表项骨架屏
export const FileListItemSkeleton: React.FC<{ 
  isSmallScreen?: boolean,
  visible?: boolean
}> = ({ 
  isSmallScreen = false,
  visible = true
}) => {
  const theme = useTheme();
  const skeletonStyles = getSkeletonStyles(theme);
  const [isExiting, setIsExiting] = useState(!visible);
  
  useEffect(() => {
    if (!visible && !isExiting) {
      setIsExiting(true);
    } else if (visible && isExiting) {
      setIsExiting(false);
    }
  }, [visible, isExiting]);
  
  return (
    <ListItem
      disablePadding
      sx={{ 
        mb: 0.6, 
        '&:last-child': { mb: 0 }, 
        overflow: 'visible', 
        width: '100%', 
        position: 'relative', 
        minHeight: { xs: '40px', sm: '48px' }, 
        display: 'flex', 
        alignItems: 'flex-start',
        justifyContent: 'center',
        ...getContainerTransitionStyles(isExiting)
      }}
      secondaryAction={
        <Box sx={{
          display: 'inline-block', 
          cursor: 'default',
          position: 'absolute',
          right: '12px',
          top: '50%',
          transform: 'translateY(-50%)'
        }}>
          <Skeleton 
            variant="circular" 
            width={isSmallScreen ? 28 : 32} 
            height={isSmallScreen ? 28 : 32} 
            animation="wave"
            sx={skeletonStyles}
          />
        </Box>
      }
    >
      <Box
        sx={{ 
          borderRadius: { xs: 2, sm: 3 }, 
          py: { xs: 1, sm: 1.5 }, 
          pr: { xs: 6, sm: 8 }, 
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' }, 
          alignItems: { xs: 'flex-start', sm: 'center' }, 
          flex: 1,
          mx: 'auto',
          position: 'relative',
          width: '100%',
          bgcolor: 'transparent'
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          width: '100%',
          minWidth: 0 
        }}>
          <ListItemIcon sx={{ 
            minWidth: { xs: '32px', sm: '40px' }, 
            mt: '2px',
            mr: { xs: 1, sm: 1.5 } 
          }}>
            <Skeleton 
              variant="circular" 
              width={isSmallScreen ? 24 : 28} 
              height={isSmallScreen ? 24 : 28} 
              animation="wave"
              sx={skeletonStyles}
            />
          </ListItemIcon>
          <Skeleton 
            variant="text" 
            width="70%" 
            height={isSmallScreen ? 20 : 24} 
            animation="wave"
            sx={{
              borderRadius: '1',
              fontSize: { xs: '0.8rem', sm: '0.875rem' },
              fontWeight: 400,
              width: '100%', 
              overflow: 'hidden',
              display: 'block',
              ...skeletonStyles
            }}
          />
        </Box>
      </Box>
    </ListItem>
  );
};

// Markdown 预览骨架屏
export const MarkdownPreviewSkeleton: React.FC<{
  isSmallScreen?: boolean,
  visible?: boolean,
  onExited?: () => void
}> = ({
  isSmallScreen = false,
  visible = true,
  onExited
}) => {
  const theme = useTheme();
  const skeletonStyles = getSkeletonStyles(theme);
  const [isExiting, setIsExiting] = useState(!visible);
  
  useEffect(() => {
    if (!visible && !isExiting) {
      setIsExiting(true);
      const timer = setTimeout(() => {
        if (onExited) onExited();
      }, 300);
      return () => clearTimeout(timer);
    } else if (visible && isExiting) {
      setIsExiting(false);
    }
  }, [visible, isExiting, onExited]);
  
  return (
    <Box sx={{ 
      position: 'relative', 
      width: '100%', 
      height: '100%', 
      ...getContainerTransitionStyles(isExiting) 
    }}>
      <Paper 
        elevation={0} 
        sx={{ 
          py: 2,
          px: { xs: 2, sm: 3, md: 4 },
          mt: 2, 
          mb: 3,
          borderRadius: 2,
          bgcolor: 'background.paper',
          overflowX: 'auto',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {/* 标题 */}
        <Skeleton 
          variant="text" 
          width="60%" 
          height={isSmallScreen ? 32 : 40} 
          animation="wave" 
          sx={{ mb: 2, borderRadius: 1, ...skeletonStyles }}
        />
        
        {/* 副标题 */}
        <Skeleton 
          variant="text" 
          width="40%" 
          height={isSmallScreen ? 24 : 32} 
          animation="wave" 
          sx={{ mb: 3, borderRadius: 1, ...skeletonStyles }}
        />
        
        {/* 段落 */}
        <Skeleton 
          variant="text" 
          width="100%" 
          height={isSmallScreen ? 16 : 20} 
          animation="wave" 
          sx={{ mb: 1, borderRadius: 1, ...skeletonStyles }}
        />
        <Skeleton 
          variant="text" 
          width="95%" 
          height={isSmallScreen ? 16 : 20} 
          animation="wave" 
          sx={{ mb: 1, borderRadius: 1, ...skeletonStyles }}
        />
        <Skeleton 
          variant="text" 
          width="98%" 
          height={isSmallScreen ? 16 : 20} 
          animation="wave" 
          sx={{ mb: 3, borderRadius: 1, ...skeletonStyles }}
        />
        
        {/* 代码块 */}
        <Skeleton 
          variant="rectangular" 
          width="100%" 
          height={isSmallScreen ? 80 : 100} 
          animation="wave" 
          sx={{ mb: 3, borderRadius: 1, ...skeletonStyles }}
        />
        
        {/* 更多段落 */}
        <Skeleton 
          variant="text" 
          width="90%" 
          height={isSmallScreen ? 16 : 20} 
          animation="wave" 
          sx={{ mb: 1, borderRadius: 1, ...skeletonStyles }}
        />
        <Skeleton 
          variant="text" 
          width="100%" 
          height={isSmallScreen ? 16 : 20} 
          animation="wave" 
          sx={{ mb: 1, borderRadius: 1, ...skeletonStyles }}
        />
        <Skeleton 
          variant="text" 
          width="92%" 
          height={isSmallScreen ? 16 : 20} 
          animation="wave" 
          sx={{ mb: 3, borderRadius: 1, ...skeletonStyles }}
        />
      </Paper>
    </Box>
  );
};

// PDF 预览骨架屏
export const PDFPreviewSkeleton: React.FC<{
  isSmallScreen?: boolean,
  visible?: boolean,
  onExited?: () => void
}> = ({
  isSmallScreen = false,
  visible = true,
  onExited
}) => {
  const theme = useTheme();
  const skeletonStyles = getSkeletonStyles(theme);
  const [isExiting, setIsExiting] = useState(!visible);
  
  useEffect(() => {
    if (!visible && !isExiting) {
      setIsExiting(true);
      const timer = setTimeout(() => {
        if (onExited) onExited();
      }, 300);
      return () => clearTimeout(timer);
    } else if (visible && isExiting) {
      setIsExiting(false);
    }
  }, [visible, isExiting, onExited]);
  
  return (
    <Box sx={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#f5f5f5',
      ...(isSmallScreen && {
        m: 0,
        p: 0,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: theme.zIndex.modal,
      }),
      ...getContainerTransitionStyles(isExiting)
    }}>
      {/* PDF 查看器工具栏 */}
      <Box sx={{ 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: alpha(theme.palette.background.paper, 0.8)
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Skeleton variant="circular" width={36} height={36} animation="wave" sx={skeletonStyles} />
          <Skeleton variant="circular" width={36} height={36} animation="wave" sx={skeletonStyles} />
          <Skeleton variant="circular" width={36} height={36} animation="wave" sx={skeletonStyles} />
        </Box>
        <Skeleton variant="text" width={100} height={24} animation="wave" sx={skeletonStyles} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Skeleton variant="circular" width={36} height={36} animation="wave" sx={skeletonStyles} />
          <Skeleton variant="circular" width={36} height={36} animation="wave" sx={skeletonStyles} />
        </Box>
      </Box>
      
      {/* PDF 内容区域 */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        overflow: 'hidden',
        bgcolor: theme.palette.mode === 'dark' ? alpha('#000', 0.3) : alpha('#f5f5f5', 0.8)
      }}>
        <Skeleton 
          variant="rectangular" 
          width={isSmallScreen ? '100%' : '80%'} 
          height={isSmallScreen ? '100%' : '90%'} 
          animation="wave" 
          sx={{ 
            borderRadius: isSmallScreen ? 0 : 1,
            boxShadow: isSmallScreen ? 'none' : '0 4px 20px rgba(0,0,0,0.1)',
            ...skeletonStyles
          }}
        />
      </Box>
    </Box>
  );
};

// 图片预览骨架屏
export const ImagePreviewSkeleton: React.FC<{
  isSmallScreen?: boolean,
  visible?: boolean,
  onExited?: () => void
}> = ({
  isSmallScreen = false,
  visible = true,
  onExited
}) => {
  const theme = useTheme();
  const skeletonStyles = getSkeletonStyles(theme);
  const [isExiting, setIsExiting] = useState(!visible);
  
  useEffect(() => {
    if (!visible && !isExiting) {
      setIsExiting(true);
      const timer = setTimeout(() => {
        if (onExited) onExited();
      }, 300);
      return () => clearTimeout(timer);
    } else if (visible && isExiting) {
      setIsExiting(false);
    }
  }, [visible, isExiting, onExited]);
  
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#f5f5f5',
        zIndex: 10,
        ...getContainerTransitionStyles(isExiting)
      }}
    >
      {/* 标题 */}
      {!isSmallScreen && (
        <Box sx={{ 
          py: 1.5, 
          px: 2, 
          textAlign: 'center',
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}>
          <Skeleton variant="text" width="40%" height={28} animation="wave" sx={{ mx: 'auto', ...skeletonStyles }} />
        </Box>
      )}
      
      {/* 图片区域 */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          pb: '72px' // 为底部控制栏留出空间
        }}
      >
        <Skeleton 
          variant="rectangular" 
          width={isSmallScreen ? '80%' : '60%'} 
          height={isSmallScreen ? '50%' : '60%'} 
          animation="wave" 
          sx={{ borderRadius: 1, ...skeletonStyles }}
        />
      </Box>
      
      {/* 控制按钮 - 更新为固定位置的底部栏 */}
      <Box sx={{ 
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 2,
        p: 1.5,
        height: '72px',
        bgcolor: theme.palette.mode === 'dark' 
          ? alpha(theme.palette.background.paper, 0.7) 
          : alpha(theme.palette.background.paper, 0.8),
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid',
        borderColor: alpha(theme.palette.divider, 0.1),
        boxShadow: theme.palette.mode === 'dark' 
          ? '0 -4px 12px rgba(0,0,0,0.2)' 
          : '0 -4px 12px rgba(0,0,0,0.1)',
      }}>
        <Box sx={{ 
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 2,
          width: '100%',
        }}>
          <Skeleton variant="circular" width={isSmallScreen ? 40 : 48} height={isSmallScreen ? 40 : 48} animation="wave" sx={skeletonStyles} />
          <Skeleton 
            variant="rectangular" 
            width={isSmallScreen ? 64 : 80} 
            height={isSmallScreen ? 40 : 48} 
            animation="wave" 
            sx={{ borderRadius: '12px', ...skeletonStyles }}
          />
          <Skeleton variant="circular" width={isSmallScreen ? 40 : 48} height={isSmallScreen ? 40 : 48} animation="wave" sx={skeletonStyles} />
        </Box>
      </Box>
    </Box>
  );
};

// Office 文档预览骨架屏
export const OfficePreviewSkeleton: React.FC<{
  isSmallScreen?: boolean,
  visible?: boolean,
  onExited?: () => void
}> = ({
  isSmallScreen = false,
  visible = true,
  onExited
}) => {
  const theme = useTheme();
  const skeletonStyles = getSkeletonStyles(theme);
  const [isExiting, setIsExiting] = useState(!visible);
  
  useEffect(() => {
    if (!visible && !isExiting) {
      setIsExiting(true);
      const timer = setTimeout(() => {
        if (onExited) onExited();
      }, 300);
      return () => clearTimeout(timer);
    } else if (visible && isExiting) {
      setIsExiting(false);
    }
  }, [visible, isExiting, onExited]);
  
  return (
    <Box sx={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#f5f5f5',
      borderRadius: 1,
      ...getContainerTransitionStyles(isExiting)
    }}>
      {/* 标题栏 */}
      <Box sx={{ 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 1,
        pl: 2,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.8)',
      }}>
        <Skeleton variant="text" width={200} height={24} animation="wave" sx={skeletonStyles} />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Skeleton variant="circular" width={28} height={28} animation="wave" sx={skeletonStyles} />
          <Skeleton variant="circular" width={28} height={28} animation="wave" sx={skeletonStyles} />
          <Skeleton variant="circular" width={28} height={28} animation="wave" sx={skeletonStyles} />
          <Skeleton variant="circular" width={28} height={28} animation="wave" sx={skeletonStyles} />
        </Box>
      </Box>
      
      {/* 文档内容 - 单个大框 */}
      <Box sx={{ 
        flex: 1,
        p: 0,
        position: 'relative',
        overflow: 'hidden'
      }}>
        <Skeleton 
          variant="rectangular" 
          width="100%" 
          height="100%" 
          animation="wave" 
          sx={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 0,
            ...skeletonStyles
          }} 
        />
      </Box>
    </Box>
  );
}; 