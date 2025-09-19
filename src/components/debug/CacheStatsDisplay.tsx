import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  IconButton,
  Collapse,
  Divider,
  Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Cached as CachedIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  Memory as MemoryIcon
} from '@mui/icons-material';
import { GitHubService } from '../../services/github/GitHubService';
import { CacheStats } from '../../services/github/CacheManager';

interface CacheStatsDisplayProps {
  showDetailed?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface CombinedStats {
  content: CacheStats;
  file: CacheStats;
}

export const CacheStatsDisplay: React.FC<CacheStatsDisplayProps> = ({
  showDetailed = false,
  autoRefresh = true,
  refreshInterval = 5000
}) => {
  const [stats, setStats] = useState<CombinedStats | null>(null);
  const [expanded, setExpanded] = useState(showDetailed);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const cacheStats = GitHubService.getCacheStats();
      setStats(cacheStats);
    } catch (error) {
      console.warn('获取缓存统计失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    
    if (autoRefresh) {
      const interval = setInterval(fetchStats, refreshInterval);
      return () => clearInterval(interval);
    }
    // 如果不是自动刷新模式，不需要返回清理函数
    return undefined;
  }, [autoRefresh, refreshInterval]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatTime = (timestamp: number): string => {
    if (timestamp === 0) return '从未';
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return `${Math.floor(diff / 86400000)}天前`;
  };

  const getHitRateColor = (hitRate: number): string => {
    if (hitRate >= 0.8) return 'success.main';
    if (hitRate >= 0.6) return 'warning.main';
    return 'error.main';
  };

  if (loading) {
    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1}>
            <CachedIcon />
            <Typography variant="h6">缓存统计</Typography>
          </Box>
          <LinearProgress sx={{ mt: 2 }} />
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  const totalStats = {
    hits: stats.content.hits + stats.file.hits,
    misses: stats.content.misses + stats.file.misses,
    size: stats.content.size + stats.file.size,
    memoryUsage: stats.content.memoryUsage + stats.file.memoryUsage,
    hitRate: (stats.content.hits + stats.file.hits) / 
              Math.max(1, stats.content.hits + stats.file.hits + stats.content.misses + stats.file.misses)
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <CachedIcon />
            <Typography variant="h6">缓存统计</Typography>
            <Chip 
              size="small" 
              label={`命中率 ${formatPercentage(totalStats.hitRate)}`}
              color={totalStats.hitRate >= 0.8 ? 'success' : totalStats.hitRate >= 0.6 ? 'warning' : 'error'}
            />
          </Box>
          <IconButton onClick={() => setExpanded(!expanded)} size="small">
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="primary.main">
                {totalStats.size}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                缓存项目
              </Typography>
            </Box>
          </Grid>
          
          <Grid size={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="success.main">
                {totalStats.hits}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                命中次数
              </Typography>
            </Box>
          </Grid>
          
          <Grid size={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="error.main">
                {totalStats.misses}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                未命中
              </Typography>
            </Box>
          </Grid>
          
          <Grid size={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="info.main">
                {formatBytes(totalStats.memoryUsage)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                内存使用
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ mt: 2 }}>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <SpeedIcon fontSize="small" />
            <Typography variant="body2">整体命中率</Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={totalStats.hitRate * 100}
            sx={{ 
              height: 8, 
              borderRadius: 4,
              backgroundColor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                backgroundColor: getHitRateColor(totalStats.hitRate)
              }
            }}
          />
          <Typography variant="caption" color="text.secondary">
            {formatPercentage(totalStats.hitRate)}
          </Typography>
        </Box>

        <Collapse in={expanded}>
          <Divider sx={{ my: 2 }} />
          
          <Grid container spacing={3}>
            {/* 内容缓存统计 */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Box>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <StorageIcon fontSize="small" color="primary" />
                  <Typography variant="subtitle1" fontWeight="bold">
                    内容缓存
                  </Typography>
                </Box>
                
                <Grid container spacing={2}>
                  <Grid size={6}>
                    <Tooltip title="缓存项数量">
                      <Box>
                        <Typography variant="h6" color="primary.main">
                          {stats.content.size}
                        </Typography>
                        <Typography variant="caption">项目</Typography>
                      </Box>
                    </Tooltip>
                  </Grid>
                  
                  <Grid size={6}>
                    <Tooltip title="命中率">
                      <Box>
                        <Typography variant="h6" sx={{ color: getHitRateColor(stats.content.hitRate) }}>
                          {formatPercentage(stats.content.hitRate)}
                        </Typography>
                        <Typography variant="caption">命中率</Typography>
                      </Box>
                    </Tooltip>
                  </Grid>
                  
                  <Grid size={6}>
                    <Tooltip title="内存使用量">
                      <Box>
                        <Typography variant="body2" color="info.main">
                          {formatBytes(stats.content.memoryUsage)}
                        </Typography>
                        <Typography variant="caption">内存</Typography>
                      </Box>
                    </Tooltip>
                  </Grid>
                  
                  <Grid size={6}>
                    <Tooltip title="最后清理时间">
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {formatTime(stats.content.lastCleanup)}
                        </Typography>
                        <Typography variant="caption">清理</Typography>
                      </Box>
                    </Tooltip>
                  </Grid>
                </Grid>
              </Box>
            </Grid>

            {/* 文件缓存统计 */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Box>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <MemoryIcon fontSize="small" color="secondary" />
                  <Typography variant="subtitle1" fontWeight="bold">
                    文件缓存
                  </Typography>
                </Box>
                
                <Grid container spacing={2}>
                  <Grid size={6}>
                    <Tooltip title="缓存项数量">
                      <Box>
                        <Typography variant="h6" color="secondary.main">
                          {stats.file.size}
                        </Typography>
                        <Typography variant="caption">项目</Typography>
                      </Box>
                    </Tooltip>
                  </Grid>
                  
                  <Grid size={6}>
                    <Tooltip title="命中率">
                      <Box>
                        <Typography variant="h6" sx={{ color: getHitRateColor(stats.file.hitRate) }}>
                          {formatPercentage(stats.file.hitRate)}
                        </Typography>
                        <Typography variant="caption">命中率</Typography>
                      </Box>
                    </Tooltip>
                  </Grid>
                  
                  <Grid size={6}>
                    <Tooltip title="内存使用量">
                      <Box>
                        <Typography variant="body2" color="info.main">
                          {formatBytes(stats.file.memoryUsage)}
                        </Typography>
                        <Typography variant="caption">内存</Typography>
                      </Box>
                    </Tooltip>
                  </Grid>
                  
                  <Grid size={6}>
                    <Tooltip title="最后清理时间">
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {formatTime(stats.file.lastCleanup)}
                        </Typography>
                        <Typography variant="caption">清理</Typography>
                      </Box>
                    </Tooltip>
                  </Grid>
                </Grid>
              </Box>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              💡 提示：高命中率（{'>'}80%）表示缓存效果良好。内存使用量会根据缓存策略自动管理。
            </Typography>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default CacheStatsDisplay;
