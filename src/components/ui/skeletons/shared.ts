import { useEffect, useState } from "react";
import { alpha } from "@mui/material";
import type { Theme } from "@mui/material";
import type { SystemStyleObject } from "@mui/system";
import { fadeAnimation, fadeOutAnimation } from "@/theme/animations";

// 获取骨架屏样式，使用当前主题颜色
export const getSkeletonStyles = (theme: Theme): SystemStyleObject<Theme> => ({
  backgroundColor: alpha(theme.palette.primary.main, 0.08),
  "&::after": {
    backgroundColor: alpha(theme.palette.primary.main, 0.12),
  },
  animation: `$pulse 1.5s ease-in-out 0.5s infinite, ${fadeAnimation} 0.5s ease-in-out`,
  "@keyframes pulse": {
    "0%": {
      opacity: 1,
    },
    "50%": {
      opacity: 0.5,
    },
    "100%": {
      opacity: 1,
    },
  },
});

// 创建获取容器过渡动画样式的函数，根据是否正在退出应用不同动画
export const getContainerTransitionStyles = (isExiting: boolean): SystemStyleObject<Theme> => ({
  animation: isExiting
    ? `${fadeOutAnimation} 0.3s ease-in-out forwards`
    : `${fadeAnimation} 0.5s ease-in-out`,
  transition: "all 0.3s ease-in-out",
  visibility: isExiting ? "hidden" : "visible",
  transitionDelay: isExiting ? "0s" : "0.1s",
});

export const useSkeletonVisibility = (visible: boolean, onExited?: () => void): boolean => {
  const [isExiting, setIsExiting] = useState(!visible);

  useEffect(() => {
    let timer: number | null = null;

    if (!visible && !isExiting) {
      setIsExiting(true);
      timer = window.setTimeout(() => {
        onExited?.();
      }, 300);
    } else if (visible && isExiting) {
      setIsExiting(false);
    }

    return () => {
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [visible, isExiting, onExited]);

  return isExiting;
};
