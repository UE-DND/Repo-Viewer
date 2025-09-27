import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "github-markdown-css/github-markdown-light.css";
import { logger } from "./utils";
import ThemeProvider from "./providers/ThemeProvider";
import { setupLatexOptimization } from "./utils/rendering/latexOptimizer";
import SEOProvider from "./contexts/SEOContext";
import { ResponsiveSnackbarProvider } from "./components/ui/ResponsiveSnackbarProvider";
import { getDeveloperConfig } from "./config";

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
  // 记录到窗口对象上，以防需要手动清理
  (window as any).__latexOptimizerCleanup = setupLatexOptimization();

  logger.debug("LaTeX渲染优化已启用");
});

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
