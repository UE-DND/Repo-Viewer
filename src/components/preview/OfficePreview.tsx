import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Box, Typography, useTheme, CircularProgress, IconButton, useMediaQuery,
  Button, Tooltip, alpha, Paper
} from '@mui/material';
import { 
  Close as CloseIcon, 
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import FullScreenPreview from '../file/FullScreenPreview';
import { useEffectOnce } from 'react-use';
import { GitHubService } from '../../services/github';
// 导入骨架屏组件
import { OfficePreviewSkeleton } from '../common/SkeletonComponents';

// 微软Office在线预览URL
const OFFICE_PREVIEW_URL = 'https://view.officeapps.live.com/op/view.aspx?src=';

// 备用预览服务URL
const BACKUP_PREVIEW_URL = 'https://view.officeapps.live.com/op/embed.aspx?src=';

// 文件类型枚举
export enum OfficeFileType {
  WORD = 'word',
  EXCEL = 'excel',
  PPT = 'ppt'
}

interface OfficePreviewProps {
  /**
   * 文档URL地址
   */
  fileUrl: string;
  
  /**
   * 文件类型
   */
  fileType: OfficeFileType;
  
  /**
   * 文件名
   */
  fileName: string;
  
  /**
   * 是否以全屏模式显示
   * @default false
   */
  isFullScreen?: boolean;
  
  /**
   * 关闭预览的回调函数
   */
  onClose?: () => void;
  
  /**
   * 自定义类名
   */
  className?: string;
  
  /**
   * 自定义样式
   */
  style?: React.CSSProperties;
}

/**
 * Office文档预览组件
 * 使用微软Office在线预览服务预览Word、Excel和PPT文档
 */
const OfficePreview: React.FC<OfficePreviewProps> = ({
  fileUrl,
  fileType,
  fileName,
  isFullScreen = false,
  onClose,
  className,
  style
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const isMobileDevice = useMediaQuery('(max-width:768px)') || 
                        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fullScreenMode, setFullScreenMode] = useState<boolean>(isFullScreen);
  const [refreshKey, setRefreshKey] = useState<number>(0); // 用于强制刷新iframe
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [officeProxyUrl, setOfficeProxyUrl] = useState<string>('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingRef = useRef<boolean>(true);
  const isIframeLoadedRef = useRef(false);
  
  // 根据文件类型获取文件类型显示名称
  const getFileTypeName = () => {
    switch (fileType) {
      case OfficeFileType.WORD:
        return 'Word';
      case OfficeFileType.EXCEL:
        return 'Excel';
      case OfficeFileType.PPT:
        return 'PPT';
      default:
        return 'Office';
    }
  };
  
  // 从配置中获取代理URL
  useEffectOnce(() => {
    const fetchConfig = async () => {
      try {
        const config = await GitHubService.getConfig();
        if (config.officeProxyUrl) {
          console.log('使用Office代理URL:', config.officeProxyUrl);
          setOfficeProxyUrl(config.officeProxyUrl);
        }
      } catch (err) {
        console.error('获取配置失败:', err);
      }
    };
    
    fetchConfig();
  });
  
  // 确保URL是安全的
  const safeUrl = encodeURIComponent(fileUrl);
  // 优先使用代理URL
  const previewUrl = officeProxyUrl 
    ? `${officeProxyUrl}/proxy/https://view.officeapps.live.com/op/view.aspx?src=${safeUrl}`
    : `${OFFICE_PREVIEW_URL}${safeUrl}`;
  const backupPreviewUrl = officeProxyUrl
    ? `${officeProxyUrl}/proxy/https://view.officeapps.live.com/op/embed.aspx?src=${safeUrl}`
    : `${BACKUP_PREVIEW_URL}${safeUrl}`;
  
  // 添加备用预览状态
  const [useBackupPreview, setUseBackupPreview] = useState<boolean>(false);
  const [triedBackup, setTriedBackup] = useState<boolean>(false);
  
  // 获取实际使用的预览URL
  const actualPreviewUrl = useBackupPreview ? backupPreviewUrl : previewUrl;
  
  // 更新loadingRef以反映当前的loading状态
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);
  
  // iframe加载事件处理
  const handleIframeLoad = useCallback(() => {
    console.log(`${getFileTypeName()}预览iframe加载完成:`, actualPreviewUrl);
    console.log('当前加载状态:', loading); // 打印当前加载状态
    isIframeLoadedRef.current = true;
    setLoading(false);
    console.log('已设置加载状态为 false');
  }, [actualPreviewUrl, fileType, getFileTypeName, loading]);
  
  // 添加 useEffect 钩子检查 iframe 加载状态
  useEffect(() => {
    if (isIframeLoadedRef.current) {
      console.log('iframe 已加载，确保 loading 状态为 false');
      setLoading(false);
    }
    
    return () => {
      // 当 URL 变化时重置加载状态引用
      if (refreshKey > 0) {
        isIframeLoadedRef.current = false;
      }
    };
  }, [refreshKey]);
  
  // 添加强制退出骨架屏的超时处理
  useEffect(() => {
    // 如果正在加载，设置一个超时处理
    if (loading) {
      const timeoutId = setTimeout(() => {
        console.log('强制退出骨架屏：超时');
        setLoading(false);
      }, 10000); // 10秒后强制退出骨架屏
      
      return () => clearTimeout(timeoutId);
    }
  }, [loading]);
  
  // 处理iframe加载错误
  const handleIframeError = useCallback(() => {
    console.error(`${getFileTypeName()}预览iframe加载失败:`, actualPreviewUrl);
    
    // 如果主预览失败但还未尝试备用预览，切换到备用预览
    if (!useBackupPreview && !triedBackup) {
      console.log('尝试使用备用预览方式');
      setUseBackupPreview(true);
      setTriedBackup(true);
      setLoading(true);
      return;
    }
    
    // 如果备用预览也失败，显示错误
    console.error(`${getFileTypeName()}预览所有方式都失败`);
    setError(`无法加载${getFileTypeName()}文档预览，可能是网络问题导致无法访问微软预览服务`);
    setLoading(false);
  }, [useBackupPreview, triedBackup, actualPreviewUrl]);
  
  // 刷新预览
  const handleRefresh = useCallback(() => {
    setLoading(true);
    setError(null);
    setRefreshKey(prev => prev + 1);
  }, []);
  
  // 切换全屏模式
  const toggleFullScreen = useCallback(() => {
    setFullScreenMode(prev => !prev);
  }, []);
  
  // 处理下载文件
  const handleDownload = useCallback(() => {
    // 创建临时a标签并触发下载
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = fileName;
    a.target = '_blank';
    a.click();
  }, [fileUrl, fileName]);
  
  // 在新窗口中打开
  const handleOpenInNewWindow = useCallback(() => {
    window.open(previewUrl, '_blank');
  }, [previewUrl]);
  
  // 添加URL变化监控
  useEffect(() => {
    if (officeProxyUrl) {
      console.log(`${getFileTypeName()}预览使用代理URL:`, officeProxyUrl);
      console.log(`${getFileTypeName()}预览完整URL:`, actualPreviewUrl);
    }
  }, [officeProxyUrl, actualPreviewUrl]);

  useEffect(() => {
    // 重置状态
    setLoading(true);
    setError(null);
    
    // 清除之前的超时计时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // 设置超时检测
    timeoutRef.current = setTimeout(() => {
      // 如果仍在加载状态
      if (loadingRef.current) {
        console.log('预览加载超时');
        setError('加载预览超时，请尝试使用下载按钮下载文件');
        setLoading(false);
      }
    }, 20000); // 20秒超时
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [fileUrl, refreshKey]);
  
  // 在渲染部分使用骨架屏
  if (loading) {
    return <OfficePreviewSkeleton isSmallScreen={isSmallScreen} />;
  }
  
  // 移动设备上显示特殊界面
  if (isMobileDevice) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#f5f5f5',
          borderRadius: 1,
          ...style
        }}
        className={`${className} ${fileType}-preview-container`}
      >
        {/* 标题栏 */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 1,
            pl: 2,
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(8px)'
          }}
        >
          <Typography variant="subtitle1" noWrap sx={{ flex: 1 }}>
            {fileName}
          </Typography>
          
          {onClose && (
            <Tooltip title="关闭">
              <IconButton 
                onClick={onClose} 
                size="small" 
                aria-label="关闭"
                sx={{ 
                  bgcolor: alpha(theme.palette.error.main, 0.1),
                  color: theme.palette.error.main,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.error.main, 0.2)
                  }
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        
        {/* 移动端提示界面 */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3,
            gap: 3
          }}
        >
          <Paper
            elevation={2}
            sx={{
              p: 3,
              maxWidth: '90%',
              width: '100%',
              textAlign: 'center',
              bgcolor: alpha(theme.palette.info.main, 0.05),
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`
            }}
          >
            <InfoIcon 
              color="info" 
              sx={{ fontSize: 48, mb: 2 }} 
            />
            
            <Typography variant="h6" gutterBottom>
              移动设备暂不支持{getFileTypeName()}在线预览
            </Typography>
            
            <Typography variant="body2" sx={{ mb: 3 }}>
              由于移动设备的限制，无法直接在应用内预览{getFileTypeName()}文档。
              您可以选择在浏览器中打开或下载文件后查看。
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleOpenInNewWindow}
                startIcon={<FullscreenIcon />}
              >
                在浏览器中打开
              </Button>
              
              <Button
                variant="outlined"
                color="primary"
                fullWidth
                onClick={handleDownload}
                startIcon={<DownloadIcon />}
              >
                下载文件
              </Button>
            </Box>
          </Paper>
        </Box>
      </Box>
    );
  }
  
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#f5f5f5',
        borderRadius: 1,
        ...style
      }}
      className={`${className} ${fileType}-preview-container`}
    >
      {/* 标题栏和工具栏 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1,
          pl: 2,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(8px)'
        }}
      >
        <Typography variant="subtitle1" noWrap sx={{ flex: 1 }}>
          {fileName}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="刷新">
            <IconButton 
              onClick={handleRefresh} 
              size="small" 
              aria-label="刷新"
              sx={{ 
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.2)
                }
              }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="下载文件">
            <IconButton 
              onClick={handleDownload} 
              size="small" 
              aria-label="下载文件"
              sx={{ 
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.2)
                }
              }}
            >
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="在新窗口打开">
            <IconButton 
              onClick={handleOpenInNewWindow} 
              size="small" 
              aria-label="在新窗口打开"
              sx={{ 
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.2)
                }
              }}
            >
              <FullscreenIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          {onClose && (
            <Tooltip title="关闭">
              <IconButton 
                onClick={onClose} 
                size="small" 
                aria-label="关闭"
                sx={{ 
                  bgcolor: alpha(theme.palette.error.main, 0.1),
                  color: theme.palette.error.main,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.error.main, 0.2)
                  }
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
      
      {/* 内容区域 */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {error ? (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 20,
              bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#f5f5f5',
              p: 3
            }}
          >
            <Paper
              elevation={2}
              sx={{
                p: 4,
                maxWidth: '400px',
                width: '100%',
                textAlign: 'center',
                bgcolor: alpha(theme.palette.error.main, 0.05),
                border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2
              }}
            >
              <Typography variant="h6" color="error" gutterBottom>
                预览加载失败
              </Typography>
              <Typography variant="body2">
                {error}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mt: 2, width: '100%', justifyContent: 'center' }}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={handleRefresh}
                  startIcon={<RefreshIcon />}
                >
                  重试
                </Button>
                <Button 
                  variant="outlined" 
                  color="primary" 
                  onClick={handleDownload}
                  startIcon={<DownloadIcon />}
                >
                  下载文件
                </Button>
              </Box>
            </Paper>
          </Box>
        ) : (
          <iframe
            ref={iframeRef}
            src={`${actualPreviewUrl}#view=fitH`}
            title={`${fileName} 预览`}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block'
            }}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            key={`iframe-${fileType}-${refreshKey}-${useBackupPreview ? 'backup' : 'main'}`}
          />
        )}
      </Box>
    </Box>
  );
};

export default OfficePreview; 