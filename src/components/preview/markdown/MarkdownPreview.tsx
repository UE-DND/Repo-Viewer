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
} from "@mui/material";

// 导入拆分的模块
import { MarkdownPreviewProps } from "./types";
import { katexOptions } from "./config/katex";
import { loadKatexStyles } from "../../../utils/lazy-loading";
import { markdownGlobalStyles } from "./styles/globalStyles";
import { createMarkdownStyles } from "./styles/markdownStyles";
import {
  createImageLoadingState,
  ImageLoadingState,
} from "./utils/imageUtils";
import { checkLatexCount, createLatexCodeHandler } from "./utils/latexUtils";
import { MarkdownImage } from "./components/MarkdownImage";
import { MarkdownLink } from "./components/MarkdownLink";
import { logger } from '../../../utils';

// 导入骨架屏组件
import { MarkdownPreviewSkeleton } from "../../ui/skeletons";

const MarkdownPreview = memo<MarkdownPreviewProps>(
  ({
    readmeContent,
    loadingReadme,
    isSmallScreen,
    previewingItem,
    lazyLoad = true,
  }) => {
    const theme = useTheme();

    // 懒加载状态
    const [shouldRender, setShouldRender] = useState<boolean>(!lazyLoad);
    const markdownRef = useRef<HTMLDivElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);

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

    // 动态加载 katex 样式
    useEffect(() => {
      if (shouldRender && readmeContent && latexCount > 0) {
        loadKatexStyles().catch((error) => {
          logger.error('加载 KaTeX 样式失败:', error);
        });
      }
    }, [shouldRender, readmeContent, latexCount]);

    // 设置IntersectionObserver监听markdown容器
    useEffect(() => {
      if (!lazyLoad || shouldRender) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            setShouldRender(true);
            // 一旦内容开始加载，就停止观察
            if (observerRef.current && markdownRef.current) {
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
      if (markdownRef.current) {
        observerRef.current.observe(markdownRef.current);
      }

      return () => {
        if (observerRef.current) {
          observerRef.current.disconnect();
        }
      };
    }, [lazyLoad, shouldRender]);

    // 添加主题切换检测
    useEffect(() => {
      // 检查是否是仅主题切换操作
      const isThemeChangeOnly =
        document.documentElement.getAttribute("data-theme-change-only") ===
        "true";

      // 当主题发生变化时，暂时将公式容器设为不可见，避免卡顿
      setIsThemeChanging(true);
      const timer = setTimeout(() => {
        setIsThemeChanging(false);

        // 检测LaTeX公式数量（仅在非主题切换操作或初始加载时进行）
        if (!isThemeChangeOnly) {
          handleLatexCheck();
        }
      }, 300); // 主题切换动画完成后再显示公式

      return () => clearTimeout(timer);
    }, [theme.palette.mode, handleLatexCheck]);

    // 初始检测LaTeX公式数量
    useEffect(() => {
      if (shouldRender && readmeContent) {
        handleLatexCheck();
      }
    }, [shouldRender, readmeContent, handleLatexCheck]);

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

    if (!readmeContent) {
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

        <Paper
          square
          elevation={0}
          className={isThemeChanging ? "theme-transition-katex" : ""}
          sx={createMarkdownStyles(theme, latexCount)}
          data-oid=":p7j.31"
        >
          {shouldRender && !isThemeChanging && (
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeRaw, [rehypeKatex, katexOptions]]}
              components={{
                a: ({ href, children, ...props }) => (
                  <MarkdownLink href={href} {...props}>
                    {children}
                  </MarkdownLink>
                ),
                img: ({ src, alt, ...props }) => (
                  <MarkdownImage
                    src={src}
                    alt={alt}
                    previewingItem={previewingItem || null}
                    imageState={imageStateRef.current}
                    {...props}
                  />
                ),
                code: latexCodeHandler,
              }}
              data-oid="53g570v"
            >
              {readmeContent}
            </ReactMarkdown>
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
