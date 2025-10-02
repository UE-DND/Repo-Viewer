import { memo, type ReactElement } from "react";
import EmptyState, { type EmptyStateType } from "./EmptyState";

interface ErrorDisplayProps {
  errorMessage: string;
  onRetry?: () => void;
  isSmallScreen: boolean;
}

const defaultRetry: () => void = () => undefined;

const ErrorDisplay = memo<ErrorDisplayProps>(
  ({ errorMessage, onRetry, isSmallScreen }): ReactElement => {
    // 判断错误类型
    const getErrorType = (): EmptyStateType => {
      if (errorMessage.includes("网络") || errorMessage.includes("连接")) {
        return "network-error";
      }
      return "general-error";
    };

    const handleRetry = onRetry ?? defaultRetry;

    return (
      <EmptyState
        type={getErrorType()}
        description={errorMessage}
        onAction={handleRetry}
        isSmallScreen={isSmallScreen}
      />
    );
  },
);

// 添加显示名称以便调试
ErrorDisplay.displayName = "ErrorDisplay";

export default ErrorDisplay;
