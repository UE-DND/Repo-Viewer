/**
 * 全局错误边界组件
 * 
 * 捕获React组件树中的JavaScript错误并提供优雅的降级UI。
 * 支持三个层级的错误边界：页面级、功能级和组件级。
 * 
 * @module ErrorBoundary
 * 
 * ## 功能特性
 * - 多层级错误捕获（page/feature/component）
 * - 自动/手动错误重试机制
 * - 错误统计和追踪（集成ErrorManager）
 * - 用户友好的错误UI界面
 * - 开发模式下显示详细堆栈信息
 * - 支持props变化时自动重置
 * 
 * ## 使用示例
 * 
 * ### 基础用法 - 组件级错误边界
 * ```tsx
 * <ErrorBoundary 
 *   level="component"
 *   componentName="UserProfile"
 * >
 *   <UserProfile userId={123} />
 * </ErrorBoundary>
 * ```
 * 
 * ### 功能模块级错误边界
 * ```tsx
 * <ErrorBoundary 
 *   level="feature"
 *   componentName="FilePreview"
 *   onError={(error, errorInfo) => {
 *     // 自定义错误处理逻辑
 *     console.error('Preview error:', error);
 *   }}
 * >
 *   <FilePreviewPanel />
 * </ErrorBoundary>
 * ```
 * 
 * ### 页面级错误边界（带自动重置）
 * ```tsx
 * <ErrorBoundary 
 *   level="page"
 *   componentName="DashboardPage"
 *   resetOnPropsChange={true}
 *   resetKeys={[userId, currentDate]}
 * >
 *   <Dashboard userId={userId} date={currentDate} />
 * </ErrorBoundary>
 * ```
 * 
 * ### 自定义错误回退UI
 * ```tsx
 * const CustomErrorFallback: React.FC<ErrorFallbackProps> = ({ 
 *   error, 
 *   resetError 
 * }) => (
 *   <div>
 *     <h2>出错了</h2>
 *     <p>{error.message}</p>
 *     <button onClick={resetError}>重试</button>
 *   </div>
 * );
 * 
 * <ErrorBoundary fallback={CustomErrorFallback}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 * 
 * ### 使用便捷包装组件
 * ```tsx
 * // 页面级
 * <PageErrorBoundary>
 *   <AppContent />
 * </PageErrorBoundary>
 * 
 * // 功能模块级
 * <FeatureErrorBoundary featureName="UserSettings">
 *   <SettingsPanel />
 * </FeatureErrorBoundary>
 * ```
 * 
 * ## 最佳实践
 * 
 * ### 1. 错误边界层次化
 * 建议按照以下层次使用错误边界：
 * - **页面级**: 整个页面/路由的最外层
 * - **功能级**: 大型功能模块（如预览、编辑器等）
 * - **组件级**: 容易出错的独立组件（如第三方集成）
 * 
 * ### 2. 使用 resetKeys 自动恢复
 * 当依赖的数据变化时，自动重置错误状态：
 * ```tsx
 * <ErrorBoundary 
 *   resetOnPropsChange={true}
 *   resetKeys={[userId, dataVersion]}
 * >
 *   <DataDisplay />
 * </ErrorBoundary>
 * ```
 * 
 * ### 3. 错误监控集成
 * ErrorBoundary 自动集成 ErrorManager 进行错误追踪，
 * 可在生产环境中收集错误日志用于问题诊断。
 * 
 * ### 4. 避免过度使用
 * 不要为每个小组件都包装错误边界
 * 在关键边界处使用，保持代码清晰
 * 
 * ### 5. 错误边界无法捕获的情况
 * - 事件处理器中的错误（使用 try-catch）
 * - 异步代码（setTimeout、Promise）
 * - 服务端渲染
 * - 错误边界自身的错误
 * 
 * @see {@link ErrorManager} 错误管理器
 * @see {@link PageErrorBoundary} 页面级错误边界快捷组件
 * @see {@link FeatureErrorBoundary} 功能级错误边界快捷组件
 */

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Alert,
  AlertTitle,
  Chip,
  Collapse
} from '@mui/material';
import { g3BorderRadius, G3_PRESETS } from '@/theme/g3Curves';
import {
  ErrorOutline,
  Refresh,
  BugReport,
  Home,
  ExpandLess,
  ExpandMore
} from '@mui/icons-material';
import { ErrorManager } from '@/utils/error/ErrorManager';
import { isDeveloperMode } from '@/config';

type ErrorInfo = React.ErrorInfo;

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  retryCount: number;
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: (string | number)[];
  level?: 'page' | 'component' | 'feature';
  componentName?: string;
}

export interface ErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo;
  resetError: () => void;
  retryCount: number;
  level: 'page' | 'component' | 'feature';
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const { onError, componentName = 'Unknown' } = this.props;

    // 创建组件错误并交给ErrorManager处理
    const componentError = ErrorManager.createComponentError(
      componentName,
      error.message,
      undefined, // props在这里不容易获取
      {
        componentStack: errorInfo.componentStack,
        stack: error.stack,
        retryCount: this.state.retryCount
      }
    );

    ErrorManager.captureError(componentError);

    // 更新状态
    this.setState({
      errorInfo,
      retryCount: this.state.retryCount + 1
    });

    // 调用自定义错误处理器
    onError?.(error, errorInfo);
  }

  override componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    // 当指定的props发生变化时重置错误状态
    if (
      hasError &&
      resetOnPropsChange === true &&
      Array.isArray(resetKeys) &&
      Array.isArray(prevProps.resetKeys)
    ) {
      const hasResetKeyChanged = resetKeys.some(
        (key, idx) => prevProps.resetKeys?.[idx] !== key
      );

      if (hasResetKeyChanged) {
        this.resetError();
      }
    }
  }

  resetError = (): void => {
    // 清除重置定时器
    if (this.resetTimeoutId !== null) {
      window.clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    });
  };

  // 延迟重置，给用户时间看到错误信息
  autoResetAfterDelay = (delay = 5000): void => {
    this.resetTimeoutId = window.setTimeout(() => {
      this.resetError();
    }, delay);
  };

  toggleDetails = (): void => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails
    }));
  };

  reloadPage = (): void => {
    window.location.reload();
  };

  goHome = (): void => {
    window.location.href = '/';
  };

  override render(): React.ReactNode {
    const { hasError, error, errorInfo, showDetails, retryCount } = this.state;
    const { children, fallback: CustomFallback, level = 'component' } = this.props;

    if (hasError && error !== null) {
      const resolvedErrorInfo: ErrorInfo = errorInfo ?? { componentStack: '' };

      // 使用自定义fallback组件
      if (typeof CustomFallback === 'function') {
        return (
          <CustomFallback
            error={error}
            errorInfo={resolvedErrorInfo}
            resetError={this.resetError}
            retryCount={retryCount}
            level={level}
          />
        );
      }

      // 默认错误UI
      return (
        <DefaultErrorFallback
          error={error}
          errorInfo={resolvedErrorInfo}
          resetError={this.resetError}
          retryCount={retryCount}
          level={level}
          toggleDetails={this.toggleDetails}
          showDetails={showDetails}
          reloadPage={this.reloadPage}
          goHome={this.goHome}
        />
      );
    }

    return children;
  }
}

// 默认错误回退组件
const DefaultErrorFallback: React.FC<ErrorFallbackProps & {
  toggleDetails: () => void;
  showDetails: boolean;
  reloadPage: () => void;
  goHome: () => void;
}> = ({
  error,
  errorInfo,
  resetError,
  retryCount,
  level,
  toggleDetails,
  showDetails,
  reloadPage,
  goHome
}) => {
  const isPageLevel = level === 'page';
  const isDev = isDeveloperMode();

  const getErrorTitle = (): string => {
    switch (level) {
      case 'page':
        return '页面加载出错';
      case 'feature':
        return '功能模块出错';
      default:
        return '组件出错';
    }
  };

  const getErrorMessage = (): string => {
    if (retryCount > 3) {
      return '多次重试后仍然出错，请刷新页面或联系技术支持';
    }
    if (error.message !== '') {
      return error.message;
    }
    return '发生了未知错误，请稍后重试';
  };

  return (
    <Box
      sx={{
        p: isPageLevel ? 4 : 2,
        minHeight: isPageLevel ? '50vh' : 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Card
        sx={{
          maxWidth: isPageLevel ? 600 : 400,
          width: '100%',
          boxShadow: isPageLevel ? 3 : 1
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2} alignItems="center">
            {/* 错误图标和标题 */}
            <Box sx={{ textAlign: 'center' }}>
              <ErrorOutline
                sx={{
                  fontSize: isPageLevel ? 64 : 48,
                  color: 'error.main',
                  mb: 1
                }}
              />
              <Typography variant={isPageLevel ? 'h4' : 'h6'} gutterBottom>
                {getErrorTitle()}
              </Typography>
            </Box>

            {/* 错误信息 */}
            <Alert severity="error" sx={{ width: '100%' }}>
              <AlertTitle>错误详情</AlertTitle>
              {getErrorMessage()}
            </Alert>

            {/* 重试次数显示 */}
            {retryCount > 0 && (
              <Chip
                label={`已重试 ${String(retryCount)} 次`}
                color="warning"
                size="small"
              />
            )}

            {/* 操作按钮 */}
            <Stack
              direction="row"
              spacing={2}
              sx={{ width: '100%' }}
              justifyContent="center"
            >
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={resetError}
                disabled={retryCount > 5}
              >
                重试
              </Button>

              {isPageLevel && (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<Home />}
                    onClick={goHome}
                  >
                    回到首页
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={reloadPage}
                  >
                    刷新页面
                  </Button>
                </>
              )}
            </Stack>

            {/* 开发模式下的详细信息 */}
            {isDev && (
              <Box sx={{ width: '100%' }}>
                <Button
                  startIcon={showDetails ? <ExpandLess /> : <ExpandMore />}
                  onClick={toggleDetails}
                  size="small"
                  endIcon={<BugReport />}
                >
                  {showDetails ? '隐藏' : '显示'}堆栈详情
                </Button>

                <Collapse in={showDetails}>
                  <Box sx={{ mt: 2 }}>
                    <Alert severity="info">
                      <AlertTitle>错误堆栈</AlertTitle>
                      <Box
                        component="pre"
                        sx={{
                          fontSize: '0.75rem',
                          maxHeight: 200,
                          overflow: 'auto',
                          backgroundColor: 'grey.100',
                          p: 1,
                          borderRadius: g3BorderRadius(G3_PRESETS.card),
                          mt: 1
                        }}
                      >
                        {error.stack}
                      </Box>
                    </Alert>

                    {errorInfo.componentStack !== '' && (
                      <Alert severity="info" sx={{ mt: 1 }}>
                        <AlertTitle>组件堆栈</AlertTitle>
                        <Box
                          component="pre"
                          sx={{
                            fontSize: '0.75rem',
                            maxHeight: 200,
                            overflow: 'auto',
                            backgroundColor: 'grey.100',
                            p: 1,
                            borderRadius: g3BorderRadius(G3_PRESETS.card),
                            mt: 1
                          }}
                        >
                          {errorInfo.componentStack}
                        </Box>
                      </Alert>
                    )}
                  </Box>
                </Collapse>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};



// 页面级错误边界
export const PageErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary
    level="page"
    componentName="PageLevel"
    resetOnPropsChange={true}
  >
    {children}
  </ErrorBoundary>
);

// 功能模块级错误边界
export const FeatureErrorBoundary: React.FC<{
  children: React.ReactNode;
  featureName: string;
}> = ({ children, featureName }) => (
  <ErrorBoundary
    level="feature"
    componentName={featureName}
    resetOnPropsChange={true}
  >
    {children}
  </ErrorBoundary>
);

export default ErrorBoundary;
