import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "github-markdown-css/github-markdown-light.css";
import { SnackbarProvider } from "notistack";
import { useTheme, useMediaQuery } from "@mui/material";
import { logger } from "./utils";
import ThemeProvider from "./providers/ThemeProvider";
import CustomSnackbar from "./components/ui/CustomSnackbar";
import { setupLatexOptimization } from "./utils/rendering/latexOptimizer";
import SEOProvider from "./contexts/SEOContext";

import { getDeveloperConfig } from './config';

// 开发者模式配置 - 控制调试信息显示
const developerConfig = getDeveloperConfig();
const allowConsoleOutput = developerConfig.mode || developerConfig.consoleLogging;

// 初始化日志系统
if (!allowConsoleOutput) {
  const noop = (..._args: unknown[]) => undefined;
  console.log = noop;
  console.info = noop;
  console.debug = noop;
  console.group = noop as typeof console.group;
  console.groupCollapsed = noop as typeof console.groupCollapsed;
  console.groupEnd = () => undefined;
}


// 应用LaTeX渲染优化
// 在应用加载后设置LaTeX优化监听器
document.addEventListener("DOMContentLoaded", () => {
  // 设置LaTeX优化
  const cleanup = setupLatexOptimization();

  // 记录到窗口对象上，以防需要手动清理
  (window as any).__latexOptimizerCleanup = cleanup;

  logger.debug("LaTeX渲染优化已启用");
});

// 响应式 Snackbar Provider：保持 App.tsx 中的行为（maxSnack=3, dense=小屏, preventDuplicate, TransitionProps: up）
function ResponsiveSnackbarProvider({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <SnackbarProvider
      maxSnack={3}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "center",
      }}
      autoHideDuration={3000}
      dense={isSmallScreen}
      preventDuplicate
      TransitionProps={{ direction: "up" }}
      Components={{
        default: CustomSnackbar,
        success: CustomSnackbar,
        error: CustomSnackbar,
        warning: CustomSnackbar,
        info: CustomSnackbar,
      }}
      data-oid="kcy4t9o"
    >
      {children}
    </SnackbarProvider>
  );
}

// 使用更轻量级、优化的根组件
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode data-oid="6an7u6a">
    <SEOProvider data-oid="doscrxm">
      <ThemeProvider data-oid="d_mpj1:">
        <ResponsiveSnackbarProvider>
          <App data-oid="xf913mc" />
        </ResponsiveSnackbarProvider>
      </ThemeProvider>
    </SEOProvider>
  </React.StrictMode>,
);
