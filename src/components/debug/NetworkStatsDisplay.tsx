import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Chip, 
  LinearProgress,
  Button,
  Tooltip,
  Stack
} from '@mui/material';
import { 
  NetworkCheck, 
  Speed, 
  Cached, 
  Replay,
  TrendingUp,
  Warning,
  CheckCircle,
  Error
} from '@mui/icons-material';
import { GitHubService } from '../../services/github/core/GitHubService';
import { ProxyService } from '../../services/github/proxy/ProxyService';

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  memoryUsage: number;
  lastCleanup: number;
}

interface NetworkStats {
  requestBatcher: {
    pendingRequests: number;
    batchedRequests: number;
    fingerprintCache: number;
    fingerprintHits: number;
  };
  proxyHealth: Array<{
    url: string;
    isHealthy: boolean;
    failureCount: number;
    responseTime: number;
    consecutiveFailures: number;
  }>;
  cacheStats: {
    content: CacheStats;
    file: CacheStats;
  };
}

export const NetworkStatsDisplay: React.FC = () => {
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const refreshStats = async () => {
    try {
      setIsLoading(true);
      
      // 获取各种统计信息
      const [batcherStats, proxyStats, cacheStats] = await Promise.all([
        // 获取请求批处理器统计
        Promise.resolve((GitHubService as any).batcher?.getStats() || {}),
        // 获取代理健康状态
        Promise.resolve(ProxyService.getProxyHealthStats() || []),
        // 获取缓存统计
        Promise.resolve(GitHubService.getCacheStats() || {})
      ]);

      setStats({
        requestBatcher: batcherStats,
        proxyHealth: proxyStats,
        cacheStats: cacheStats
      });
    } catch (error) {
      console.error('获取网络统计失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshStats();
    
    let intervalId: number | null = null;
    if (autoRefresh) {
      intervalId = window.setInterval(refreshStats, 5000); // 每5秒刷新
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefresh]);

  if (isLoading && !stats) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2}>
            <NetworkCheck />
            <Typography variant="h6">加载网络统计...</Typography>
          </Box>
          <LinearProgress sx={{ mt: 2 }} />
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent>
          <Typography color="error">无法加载网络统计信息</Typography>
        </CardContent>
      </Card>
    );
  }

  const calculateHitRate = (hits: number, misses: number) => {
    const total = hits + misses;
    return total > 0 ? ((hits / total) * 100).toFixed(1) : '0.0';
  };

  const getHealthColor = (isHealthy: boolean, responseTime: number) => {
    if (!isHealthy) return 'error';
    if (responseTime > 2000) return 'warning';
    if (responseTime > 1000) return 'info';
    return 'success';
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" display="flex" alignItems="center" gap={1}>
            <NetworkCheck />
            网络请求统计
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button 
              size="small" 
              onClick={refreshStats}
              startIcon={<Replay />}
            >
              刷新
            </Button>
            <Button 
              size="small" 
              variant={autoRefresh ? "contained" : "outlined"}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? '停止自动刷新' : '开启自动刷新'}
            </Button>
          </Stack>
        </Box>

        <Stack spacing={3} sx={{ mt: 2 }}>
          {/* 上半部分 - 批处理器和缓存统计 */}
          <Box display="flex" gap={2} flexDirection={{ xs: 'column', md: 'row' }}>
            {/* 请求批处理器统计 */}
            <Box flex={1}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom display="flex" alignItems="center" gap={1}>
                    <Speed />
                    请求批处理器
                  </Typography>
                  <Stack spacing={1}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2">进行中请求:</Typography>
                      <Chip 
                        label={stats.requestBatcher.pendingRequests} 
                        size="small" 
                        color={stats.requestBatcher.pendingRequests > 5 ? 'warning' : 'default'}
                      />
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2">批处理队列:</Typography>
                      <Chip label={stats.requestBatcher.batchedRequests} size="small" />
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2">指纹缓存:</Typography>
                      <Chip label={stats.requestBatcher.fingerprintCache} size="small" color="info" />
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2">去重命中:</Typography>
                      <Chip 
                        label={stats.requestBatcher.fingerprintHits} 
                        size="small" 
                        color="success"
                      />
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Box>

            {/* 缓存统计 */}
            <Box flex={1}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom display="flex" alignItems="center" gap={1}>
                  <Cached />
                  缓存性能
                </Typography>
                <Stack spacing={1}>
                  <Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">内容缓存命中率:</Typography>
                      <Chip 
                        label={`${calculateHitRate(
                          stats.cacheStats.content?.hits || 0,
                          stats.cacheStats.content?.misses || 0
                        )}%`}
                        size="small" 
                        color="success"
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      大小: {stats.cacheStats.content?.size || 0} 项
                    </Typography>
                  </Box>
                  <Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">文件缓存命中率:</Typography>
                      <Chip 
                        label={`${calculateHitRate(
                          stats.cacheStats.file?.hits || 0,
                          stats.cacheStats.file?.misses || 0
                        )}%`}
                        size="small" 
                        color="success"
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      大小: {stats.cacheStats.file?.size || 0} 项
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">内存使用:</Typography>
                    <Chip 
                      label={`${(((stats.cacheStats.content?.memoryUsage || 0) + (stats.cacheStats.file?.memoryUsage || 0)) / 1024 / 1024).toFixed(1)}MB`}
                      size="small" 
                      color="info"
                    />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
            </Box>
          </Box>

          {/* 代理健康状态 */}
          <Box>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom display="flex" alignItems="center" gap={1}>
                  <TrendingUp />
                  代理服务健康状态
                </Typography>
                {stats.proxyHealth.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    未配置代理服务
                  </Typography>
                ) : (
                  <Box display="flex" flexWrap="wrap" gap={1}>
                    {stats.proxyHealth.map((proxy, index) => (
                      <Box key={index} minWidth={200} flex={{ xs: '1 1 100%', sm: '1 1 calc(50% - 8px)', md: '1 1 calc(33.33% - 8px)' }}>
                        <Card variant="outlined" sx={{ p: 1, height: '100%' }}>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            {proxy.isHealthy ? (
                              <CheckCircle color="success" fontSize="small" />
                            ) : proxy.consecutiveFailures >= 3 ? (
                              <Error color="error" fontSize="small" />
                            ) : (
                              <Warning color="warning" fontSize="small" />
                            )}
                            <Tooltip title={proxy.url}>
                              <Typography variant="body2" noWrap sx={{ maxWidth: 120 }}>
                                {proxy.url.replace(/^https?:\/\//, '').split('/')[0]}
                              </Typography>
                            </Tooltip>
                          </Box>
                          <Stack spacing={0.5}>
                            <Box display="flex" justifyContent="space-between">
                              <Typography variant="caption">响应时间:</Typography>
                              <Chip 
                                label={`${proxy.responseTime}ms`}
                                size="small" 
                                color={getHealthColor(proxy.isHealthy, proxy.responseTime)}
                              />
                            </Box>
                            <Box display="flex" justifyContent="space-between">
                              <Typography variant="caption">失败次数:</Typography>
                              <Typography variant="caption">{proxy.failureCount}</Typography>
                            </Box>
                          </Stack>
                        </Card>
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        </Stack>

        {isLoading && (
          <LinearProgress sx={{ mt: 2 }} />
        )}
      </CardContent>
    </Card>
  );
};

export default NetworkStatsDisplay;
