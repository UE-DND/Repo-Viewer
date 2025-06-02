import React, { useContext, useEffect, useRef } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  useTheme,
  CssBaseline,
  ThemeProvider,
  useMediaQuery,
} from "@mui/material";
import { GitHubProvider } from "./contexts/GitHubContext";
import MainContent from "./components/layout/MainContent";
import ToolbarButtons from "./components/layout/ToolbarButtons";
import { ColorModeContext } from "./contexts/ColorModeContext";
import { SITE_TITLE } from "./constants";
import { GitHubService } from "./services/github";
import { logger } from "./utils";
import { SnackbarProvider } from "notistack";
import SEO from "./components/seo/SEO";
import Footer from "./components/layout/Footer";

// 优化后的App组件
const App = React.memo(() => {
  // 使用颜色模式上下文
  const colorMode = useContext(ColorModeContext);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const titleRef = useRef<HTMLDivElement | null>(null);

  // 处理标题点击事件
  const handleTitleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    // 在移动端禁用跳转功能
    if (isSmallScreen) return;

    // 只有当事件的目标元素是文本内容时才执行返回首页
    if (
      titleRef.current &&
      (event.target === titleRef.current ||
        titleRef.current.contains(event.target as Node))
    ) {
      // 清除缓存
      try {
        // 清除 GitHubService 中的内容缓存
        GitHubService.clearCache();

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
    const tokenCount = GitHubService.getTokenCount();
    const hasToken = GitHubService.hasToken();
    logger.info(
      `GitHub Token状态: ${hasToken ? "已配置" : "未配置"}, Token数量: ${tokenCount}`,
    );

    if (!hasToken) {
      logger.warn(
        "未检测到GitHub Token，API搜索功能可能受限。请考虑配置Token以获取更好的搜索体验。",
      );
      console.log("您可以使用以下代码在开发环境中设置临时token:");
      console.log('GitHubService.setLocalToken("your_github_token_here")');
    }
  }, []);

  return (
    <ThemeProvider theme={theme} data-oid="..yfsak">
      <CssBaseline data-oid="q-9ujvb" />
      <>
        {/* 基础SEO设置 */}
        <SEO data-oid="542h-3i" />

        <style data-oid="b003vxu">
          {`
            .notistack-SnackbarContainer {
              bottom: 24px !important;
            }
            
            .notistack-MuiContent {
              border-radius: ${theme.shape.borderRadius}px !important;
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
        <SnackbarProvider
          maxSnack={3}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          autoHideDuration={3000}
          dense={isSmallScreen}
          preventDuplicate
          TransitionProps={{ direction: "up" }}
          data-oid="a3ed3_x"
        >
          <GitHubProvider data-oid="a29dni6">
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                minHeight: "100vh",
                overflow: "hidden",
              }}
              data-oid="x1__:v_"
            >
              <AppBar
                position="static"
                elevation={0}
                sx={{
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
                data-oid="wo6wy.h"
              >
                <Toolbar data-oid="3t2uspn">
                  <Box
                    sx={{
                      flexGrow: 1,
                      display: "flex",
                      alignItems: "center",
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
                          xs: "0.9rem", // 手机屏幕
                          sm: "1rem", // 小平板
                          md: "1.25rem", // 正常桌面尺寸
                        },
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      onClick={handleTitleClick}
                      data-oid="isr-jsd"
                    >
                      {SITE_TITLE}
                    </Typography>
                  </Box>
                  <ToolbarButtons data-oid="enprsdk" />
                </Toolbar>
              </AppBar>

              <MainContent data-oid="jgn58er" />

              {/* 添加页脚组件 */}
              <Footer data-oid="ntwtx22" />
            </Box>
          </GitHubProvider>
        </SnackbarProvider>
      </>
    </ThemeProvider>
  );
});

// 添加显示名称以便调试
App.displayName = "App";

export default App;
