import React, { useEffect, useRef, useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  useTheme,
  useMediaQuery,
  Collapse,
} from "@mui/material";
import { AppContextProvider } from "@/contexts/unified";
import MainContent from "@/components/layout/MainContent";
import ToolbarButtons from "@/components/layout/ToolbarButtons";
import { SITE_TITLE } from "@/constants";
import { clearCache, getTokenCount, hasToken } from "@/services/github";
import { logger, debounce } from "@/utils";
import SEO from "@/components/seo/SEO";
import Footer from "@/components/layout/Footer";
import { FaviconManager } from "@/components/ui/DynamicIcon";
import { PageErrorBoundary, FeatureErrorBoundary } from "@/components/ui/ErrorBoundary";

/**
 * 应用主组件
 * 
 * 应用的根组件，包含顶部导航栏、主内容区和页脚。
 * 处理标题点击、滚动监听和token状态检查。
 */
const App = React.memo(() => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const titleRef = useRef<HTMLDivElement | null>(null);
  const [showBreadcrumbInToolbar, setShowBreadcrumbInToolbar] = useState(false);

  /**
   * 处理应用标题的点击事件
   * 
   * 当用户点击应用标题时，在桌面端会触发以下操作：
   * 1. 清除所有缓存的GitHub内容数据
   * 2. 重定向到网站根路径（首页）
   * 3. 刷新页面以重置应用状态
   * 
   * 注意：
   * - 在移动端（小屏幕）设备上，此功能被禁用以防止误触
   * - 只有当点击目标是标题元素本身时才会触发
   * - 缓存清除失败不会阻止页面跳转，只会记录错误日志
   * 
   * @param event - React鼠标点击事件对象
   * @returns void
   * 
   * @example
   * // 用户在桌面端点击标题
   * // → 清除所有缓存 → 跳转到首页 → 页面刷新
   */
  const handleTitleClick = (event: React.MouseEvent<HTMLDivElement>): void => {
    // 在移动端禁用跳转功能
    if (isSmallScreen) {
      return;
    }

    // 只有当事件的目标元素是文本内容时才执行返回首页
    if (
      titleRef.current !== null &&
      (event.target === titleRef.current ||
        titleRef.current.contains(event.target as Node))
    ) {
      // 清除缓存
      try {
        // 清除 GitHubService 中的内容缓存
        void clearCache();

        logger.debug("已清除所有缓存，准备返回首页");
      } catch (e) {
        logger.error("清除缓存失败:", e);
      }

      // 直接跳转到网站根路径
      window.location.href = "/";
      logger.debug("触发返回首页并刷新页面");
    }
  };

  // 启动时检查token状态
  useEffect(() => {
    // 在控制台显示token状态
    const tokenCount = getTokenCount();
    const hasTokenFlag = hasToken();
    logger.info(
      `GitHub Token状态: ${hasTokenFlag ? "已配置" : "未配置"}, Token数量: ${tokenCount.toString()}`,
    );

    if (!hasTokenFlag) {
      logger.warn(
        "未检测到GitHub Token，API搜索功能可能受限。请考虑配置Token以获取更好的搜索体验。",
      );
      logger.info("您可以使用以下代码在开发环境中设置临时token:");
      logger.info('GitHubService.setLocalToken("your_github_token_here")');
    }
  }, []);

  /**
   * 滚动处理逻辑的优化
   * 
   * 使用组合优化策略提升性能：
   * 1. requestAnimationFrame - 与浏览器刷新率同步
   * 2. debounce - 防抖限制函数调用频率
   * 3. passive 事件监听 - 提升滚动性能
   */
  useEffect(() => {
    let rafId: number | null = null;
    let lastScrollY = window.scrollY;
    const scrollThreshold = 100;

    const handleScroll = (): void => {
      if (rafId !== null) {
        return;
      }

      rafId = requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const shouldShow = currentScrollY > scrollThreshold;
        const wasShowing = lastScrollY > scrollThreshold;

        if (shouldShow !== wasShowing) {
          setShowBreadcrumbInToolbar(shouldShow);
        }

        lastScrollY = currentScrollY;
        rafId = null;
      });
    };

    // 使用 debounce 进一步优化，减少高频滚动时的函数调用
    // 16ms 约等于 60fps，与 RAF 配合使用效果最佳
    const debouncedHandleScroll = debounce(handleScroll, 16);

    window.addEventListener('scroll', debouncedHandleScroll, { passive: true });

    // 初始调用检查状态
    handleScroll();

    return () => {
      window.removeEventListener('scroll', debouncedHandleScroll);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return (
    <>
      {/* 动态favicon管理器 */}
      <FaviconManager />
      {/* 基础SEO设置 */}
      <SEO data-oid="542h-3i" />

        <style data-oid="b003vxu">
          {`
            .notistack-SnackbarContainer {
              bottom: 24px !important;
            }

            .notistack-MuiContent {
              border-radius: ${theme.shape.borderRadius.toString()}px !important;
              box-shadow: ${theme.shadows[3]} !important;
            }

            .notistack-MuiContent-success,
            .notistack-MuiContent-error,
            .notistack-MuiContent-warning,
            .notistack-MuiContent-info {
              padding: 10px 16px !important;
            }
          `}
        </style>
      <PageErrorBoundary>
        <AppContextProvider data-oid="a29dni6">
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              minHeight: "100vh",
            }}
            data-oid="x1__:v_"
          >
            <AppBar
              position="fixed"
              elevation={0}
              sx={{
                borderBottom: "1px solid",
                borderColor: "divider",
                zIndex: theme.zIndex.appBar,
              }}
              data-oid="wo6wy.h"
            >
              <Toolbar data-oid="3t2uspn">
                <Box
                  sx={{
                    flexGrow: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                  }}
                  data-oid="ldirzxg"
                >
                  <Typography
                    ref={titleRef}
                    variant="h6"
                    component="div"
                    sx={{
                      cursor: isSmallScreen ? "default" : "pointer",
                      transition: "opacity 0.2s ease-in-out",
                      "&:hover": isSmallScreen
                        ? {}
                        : {
                            opacity: 0.8,
                          },
                      fontSize: {
                        xs: "0.9rem",
                        sm: "1rem",
                        md: "1.25rem",
                      },
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      flexShrink: 0,
                    }}
                    onClick={handleTitleClick}
                    data-oid="isr-jsd"
                  >
                    {SITE_TITLE}
                  </Typography>

                  {/* 面包屑在顶部栏的容器 */}
                  <Collapse
                    in={showBreadcrumbInToolbar}
                    orientation="horizontal"
                    timeout={300}
                    sx={{
                      flexGrow: 1,
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      id="toolbar-breadcrumb-container"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        minWidth: 0,
                        flexGrow: 1,
                      }}
                    />
                  </Collapse>
                </Box>
                <ToolbarButtons
                  showBreadcrumbInToolbar={showBreadcrumbInToolbar}
                  isSmallScreen={isSmallScreen}
                  data-oid="enprsdk"
                />
              </Toolbar>
            </AppBar>

            {/* 占位符，用于为固定的AppBar留出空间 */}
            <Toolbar />

            <FeatureErrorBoundary featureName="MainContent">
              <MainContent showBreadcrumbInToolbar={showBreadcrumbInToolbar} data-oid="jgn58er" />
            </FeatureErrorBoundary>

            {/* 添加页脚组件 */}
            <Footer data-oid="ntwtx22" />
          </Box>
        </AppContextProvider>
      </PageErrorBoundary>
    </>
  );
});

// 添加显示名称以便调试
App.displayName = "App";

export default App;
