import React, { useState, useEffect, useCallback } from "react";
import {
  Fab,
  useTheme,
  useMediaQuery,
  Zoom,
  alpha,
} from "@mui/material";
import { KeyboardArrowUp as ArrowUpIcon } from "@mui/icons-material";

interface ScrollToTopFabProps {
  /** 显示按钮的滚动阈值（像素） */
  threshold?: number;
  /** 滚动到顶部的动画持续时间（毫秒） */
  scrollDuration?: number;
  /** 自定义样式 */
  sx?: object;
  /** 是否在有内容时才显示 */
  showOnlyWithContent?: boolean;
}

const ScrollToTopFab: React.FC<ScrollToTopFabProps> = ({
  threshold = 200,
  scrollDuration = 800,
  sx = {},
  showOnlyWithContent = true,
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [isVisible, setIsVisible] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);

  // 检查滚动位置和内容
  const checkScrollPosition = useCallback(() => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const hasContent = showOnlyWithContent ? document.body.scrollHeight > window.innerHeight : true;
    setIsVisible(scrollTop > threshold && hasContent);
  }, [threshold, showOnlyWithContent]);

  // 平滑滚动到顶部
  const scrollToTop = useCallback(() => {
    if (isScrolling) return;

    setIsScrolling(true);
    const startTime = performance.now();
    const startScrollTop = window.pageYOffset || document.documentElement.scrollTop;

    const animateScroll = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / scrollDuration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentScrollTop = startScrollTop * (1 - easeOutQuart);

      window.scrollTo(0, currentScrollTop);

      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      } else {
        setIsScrolling(false);
      }
    };

    requestAnimationFrame(animateScroll);
  }, [scrollDuration, isScrolling]);

  // 监听滚动事件
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkScrollPosition, 10);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    checkScrollPosition();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(timeoutId);
    };
  }, [checkScrollPosition]);

  const fabStyles = {
    position: "fixed" as const,
    bottom: isSmallScreen ? 16 : 24,
    right: isSmallScreen ? 16 : 24,
    zIndex: theme.zIndex.fab,
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    boxShadow: theme.shadows[6],
    "&:hover": {
      backgroundColor: alpha(theme.palette.primary.main, 0.9),
      boxShadow: theme.shadows[8],
    },
    "&:active": {
      transform: "scale(0.95)",
      boxShadow: theme.shadows[6],
    },
    transition: "background-color 650ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 800ms cubic-bezier(0.4, 0, 0.2, 1), transform 500ms cubic-bezier(0.4, 0, 0.2, 1)",
    ...(isSmallScreen && {
      width: 48,
      height: 48,
      minHeight: 48,
    }),
    ...sx,
  };

  return (
    <Zoom
      in={isVisible}
      timeout={{
        enter: theme.transitions.duration.enteringScreen,
        exit: theme.transitions.duration.leavingScreen,
      }}
      style={{
        transitionDelay: isVisible ? "0ms" : "100ms",
      }}
    >
      <Fab
        size={isSmallScreen ? "medium" : "large"}
        aria-label="返回顶部"
        onClick={scrollToTop}
        disabled={isScrolling}
        sx={fabStyles}
      >
        <ArrowUpIcon
          fontSize={isSmallScreen ? "medium" : "large"}
          sx={{
            transition: theme.transitions.create("transform", {
              duration: theme.transitions.duration.short,
            }),
            transform: isScrolling ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </Fab>
    </Zoom>
  );
};

export default ScrollToTopFab;
