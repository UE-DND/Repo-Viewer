import { memo } from "react";
import EmptyState from "./EmptyState";

interface ErrorDisplayProps {
  errorMessage: string;
  onRetry?: () => void;
  isSmallScreen: boolean;
}

const ErrorDisplay = memo<ErrorDisplayProps>(
  ({ errorMessage, onRetry, isSmallScreen }) => {
    // 判断错误类型
    const getErrorType = () => {
      if (errorMessage.includes("网络") || errorMessage.includes("连接")) {
        return "network-error";
      }
      return "general-error";
    };

    return (
      <EmptyState
        type={getErrorType()}
        description={errorMessage}
        onAction={onRetry ?? (() => {})}
        isSmallScreen={isSmallScreen}
      />
    );
  },
);

// 添加显示名称以便调试
ErrorDisplay.displayName = "ErrorDisplay";

export default ErrorDisplay;
