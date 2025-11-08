import { memo, useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import {
  Box,
  Paper,
  CircularProgress,
  useTheme,
  IconButton,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useI18n } from "@/contexts/I18nContext";
import type { MarkdownPreviewProps } from "./types";
import { katexOptions } from "./config/katex";
import { loadKatexStyles } from "@/utils/lazy-loading";
import { markdownGlobalStyles } from "./styles/globalStyles";
import { createMarkdownStyles } from "./styles/markdownStyles";
import { createImageLoadingState } from "./utils/imageUtils";
import type { ImageLoadingState } from "./utils/imageUtils";
import { checkLatexCount, createLatexCodeHandler } from "./utils/latexUtils";
import { MarkdownImage } from "./components/MarkdownImage";
import { MarkdownLink } from "./components/MarkdownLink";
import { logger } from "@/utils";
import { MarkdownPreviewSkeleton } from "@/components/ui/skeletons";

/**
 * Markdown预览组件
 *
 * 渲染Markdown内容，支持GFM语法、LaTeX公式、代码高亮等。
 * 包含图片代理处理、懒加载和主题切换优化。
 */
const MarkdownPreview = memo<MarkdownPreviewProps>(
  ({
    readmeContent,
    loadingReadme,
    isSmallScreen,
    previewingItem,
    onClose,
    lazyLoad = true,
    currentBranch,
  }) => {
  const theme = useTheme();
  const { t } = useI18n();

    // 懒加载状态
    const [shouldRender, setShouldRender] = useState<boolean>(!lazyLoad);
    const markdownRef = useRef<HTMLDivElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const hasInitializedThemeModeRef = useRef<boolean>(false);
    const isEventDrivenThemeChangeRef = useRef<boolean>(false);

    // 图片加载状态
    const imageStateRef = useRef<ImageLoadingState>(createImageLoadingState());

    // 添加主题切换状态追踪
    const [isThemeChanging, setIsThemeChanging] = useState<boolean>(false);
    // LaTeX公式数量
    const [latexCount, setLatexCount] = useState<number>(0);
    // 检测LaTeX公式数量的回调
    const handleLatexCheck = useCallback(() => {
      checkLatexCount(markdownRef, setLatexCount);
    }, []);

    const isLazyLoadEnabled = lazyLoad;
    const hasReadmeContent =
      typeof readmeContent === "string" && readmeContent.length > 0;
    const [contentVersion, setContentVersion] = useState<number>(0);

    // 动态加载 katex 样式
    useEffect(() => {
      if (
        shouldRender &&
        typeof readmeContent === "string" &&
        readmeContent.length > 0 &&
        latexCount > 0
      ) {
        loadKatexStyles().catch((error: unknown) => {
          logger.error("加载 KaTeX 样式失败:", error);
        });
      }
    }, [shouldRender, readmeContent, latexCount]);

    useEffect(() => {
      if (hasReadmeContent) {
        setContentVersion((prev) => prev + 1);
      }
    }, [readmeContent, hasReadmeContent]);

    // 设置IntersectionObserver监听markdown容器
    useEffect(() => {
      if (!isLazyLoadEnabled || shouldRender) {
        return;
      }

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting === true) {
            setShouldRender(true);
            // 一旦内容开始加载，就停止观察
            if (observerRef.current !== null && markdownRef.current !== null) {
              observerRef.current.unobserve(markdownRef.current);
            }
          }
        },
        {
          root: null,
          rootMargin: "200px", // 提前200px开始加载
          threshold: 0,
        },
      );

      // 开始观察
      if (markdownRef.current !== null) {
        observerRef.current.observe(markdownRef.current);
      }

      return () => {
        if (observerRef.current !== null) {
          observerRef.current.disconnect();
        }
      };
    }, [isLazyLoadEnabled, shouldRender]);

    // 监听主题切换事件
    useEffect(() => {
      const handleThemeChanging = (): void => {
        isEventDrivenThemeChangeRef.current = true;
        setIsThemeChanging(true);
      };

      const handleThemeChanged = (): void => {
        // 主题切换完成后再显示公式并检测 LaTeX 数量
        setTimeout(() => {
          setIsThemeChanging(false);
          handleLatexCheck();
          isEventDrivenThemeChangeRef.current = false;
        }, 300);
      };

      window.addEventListener('theme:changing', handleThemeChanging);
      window.addEventListener('theme:changed', handleThemeChanged);

      return () => {
        window.removeEventListener('theme:changing', handleThemeChanging);
        window.removeEventListener('theme:changed', handleThemeChanged);
      };
    }, [handleLatexCheck]);

    // 监听主题模式变化（用于非事件触发的情况）
    useEffect(() => {
      if (!hasInitializedThemeModeRef.current) {
        hasInitializedThemeModeRef.current = true;
        return;
      }

      if (isEventDrivenThemeChangeRef.current) {
        handleLatexCheck();
        return;
      }

      // 当主题发生变化时，暂时将公式容器设为不可见，避免卡顿
      setIsThemeChanging(true);
      const timer = setTimeout(() => {
        setIsThemeChanging(false);
        handleLatexCheck();
      }, 300);

      return () => {
        clearTimeout(timer);
      };
    }, [theme.palette.mode, handleLatexCheck]);

    // 初始检测LaTeX公式数量
    useEffect(() => {
      if (shouldRender && hasReadmeContent) {
        handleLatexCheck();
      }
    }, [shouldRender, hasReadmeContent, handleLatexCheck]);

    // 清理图片加载计时器
    useEffect(() => {
      const imageState = imageStateRef.current;
      return () => {
        // 组件卸载时清理所有计时器
        imageState.imageTimers.forEach((timer) => {
          window.clearTimeout(timer);
        });
      };
    }, []);

    // 创建LaTeX代码处理器
    const latexCodeHandler = createLatexCodeHandler();

    if (loadingReadme) {
      return (
        <MarkdownPreviewSkeleton
          isSmallScreen={isSmallScreen}
          data-oid="8h5-fe5"
        />
      );
    }

    if (!hasReadmeContent) {
      return null;
    }

    return (
      <Box
        sx={{ position: "relative", width: "100%", height: "100%" }}
        ref={markdownRef}
        data-oid="-q9nqss"
      >
        {/* 添加全局样式组件 */}
        {markdownGlobalStyles}

        {/* 关闭按钮 */}
        {typeof onClose === "function" ? (
          <Tooltip title={t('ui.markdown.closePreview')} placement="left">
            <IconButton
              onClick={onClose}
              aria-label={t('ui.markdown.closePreview')}
              sx={{
                position: "fixed",
                top: { xs: 34, sm: 38 },
                right: { xs: 16, sm: 24 },
                zIndex: theme.zIndex.modal + 10,
                bgcolor: "background.paper",
                boxShadow: theme.shadows[4],
                width: { xs: 36, sm: 40 },
                height: { xs: 36, sm: 40 },
                "&:hover": {
                  bgcolor: "action.hover",
                  boxShadow: theme.shadows[6],
                },
                "&:active": {
                  boxShadow: theme.shadows[8],
                },
                transition: theme.transitions.create(
                  ["background-color", "box-shadow", "transform"],
                  {
                    duration: theme.transitions.duration.short,
                  }
                ),
              }}
              data-oid="md-close-btn"
            >
              <CloseIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
            </IconButton>
          </Tooltip>
        ) : null}

        <Paper
          square
          elevation={0}
          className={isThemeChanging ? "theme-transition-katex" : ""}
          sx={createMarkdownStyles(theme, latexCount, isSmallScreen)}
          data-oid=":p7j.31"
        >
          {shouldRender && !isThemeChanging && (
            <Box
              key={contentVersion}
              className="markdown-body"
              data-color-mode={theme.palette.mode}
              data-light-theme="light"
              data-dark-theme="dark"
              sx={{
                "@keyframes fadeIn": { from: { opacity: 0 }, to: { opacity: 1 } },
                animation: "fadeIn 0.25s ease",
              }}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeRaw, [rehypeKatex, katexOptions]]}
                components={{
                  a: ({ href, children, style: linkStyle, ...props }) => {
                    if (typeof href !== "string" || href.trim().length === 0) {
                      return <>{children}</>;
                    }

                    return (
                      <MarkdownLink href={href} style={linkStyle} {...props}>
                        {children}
                      </MarkdownLink>
                    );
                  },
                  img: ({ src, alt, style: imageStyle, ...props }) => {
                    if (typeof src !== "string" || src.trim().length === 0) {
                      return null;
                    }

                    return (
                      <MarkdownImage
                        src={src}
                        alt={alt ?? ""}
                        style={imageStyle}
                        previewingItem={previewingItem ?? null}
                        imageState={imageStateRef.current}
                        currentBranch={currentBranch}
                        {...props}
                      />
                    );
                  },
                  code: latexCodeHandler,
                }}
                data-oid="53g570v"
              >
                {readmeContent}
              </ReactMarkdown>
            </Box>
          )}

          {/* 加载中或切换主题时显示 */}
          {(isThemeChanging || !shouldRender) && (
            <Box
              sx={{
                height: "200px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: 0.7,
              }}
              data-oid="kzd4vzl"
            >
              <CircularProgress size={30} data-oid="x-yfp_w" />
            </Box>
          )}
        </Paper>
      </Box>
    );
  },
);

MarkdownPreview.displayName = "MarkdownPreview";

export default MarkdownPreview;
