import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "github-markdown-css/github-markdown-light.css";
import "katex/dist/katex.min.css"; // 确保KaTeX样式全局引入
import { SnackbarProvider } from "notistack";
import { logger } from "./utils";
import ThemeProvider from "./providers/ThemeProvider";
import CustomSnackbar from "./components/ui/CustomSnackbar";
import { setupLatexOptimization } from "./utils/rendering/latexOptimizer";
import SEOProvider from "./contexts/SEOContext";

import { getDeveloperConfig } from './config/ConfigManager';

// 开发者模式配置 - 控制调试信息显示
const DEV_CONFIG = {
  CONSOLE_LOGGING: getDeveloperConfig().consoleLogging,
};

// 初始化日志系统
if (!DEV_CONFIG.CONSOLE_LOGGING) {
  console.log = () => {}; // 禁用标准控制台日志
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

// 使用更轻量级、优化的根组件
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode data-oid="6an7u6a">
    <SEOProvider data-oid="doscrxm">
      <ThemeProvider data-oid="d_mpj1:">
        <SnackbarProvider
          maxSnack={5}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "center",
          }}
          autoHideDuration={3000}
          Components={{
            default: CustomSnackbar,
            success: CustomSnackbar,
            error: CustomSnackbar,
            warning: CustomSnackbar,
            info: CustomSnackbar,
          }}
          data-oid="kcy4t9o"
        >
          <App data-oid="xf913mc" />
        </SnackbarProvider>
      </ThemeProvider>
    </SEOProvider>
  </React.StrictMode>,
);
