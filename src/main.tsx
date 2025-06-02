import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "github-markdown-css/github-markdown-light.css";
import "katex/dist/katex.min.css"; // 确保KaTeX样式全局引入
import { SnackbarProvider } from "notistack";
import { logger } from "./utils";
import ThemeProvider from "./providers/ThemeProvider";
import CustomSnackbar from "./components/common/CustomSnackbar";
import { checkTokenStatus } from "./utils/token-helper";
import { setupLatexOptimization } from "./utils/latexOptimizer";
import SEOProvider from "./contexts/SEOContext";

// 开发者模式配置 - 控制调试信息显示
const DEV_CONFIG = {
  DEBUG_MODE: import.meta.env.VITE_DEBUG_MODE === "true",
  CONSOLE_LOGGING: import.meta.env.VITE_CONSOLE_LOGGING === "true",
};

// 初始化日志系统
if (!DEV_CONFIG.CONSOLE_LOGGING) {
  console.log = () => {}; // 禁用标准控制台日志
}

// 检查GitHub Token状态
if (DEV_CONFIG.DEBUG_MODE) {
  // 延迟执行token检查，等应用初始化完成
  setTimeout(() => {
    // 使用异步函数检查令牌状态
    checkTokenStatus().catch((err) => {
      logger.error("检查令牌状态失败:", err);
    });
  }, 1000);
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
