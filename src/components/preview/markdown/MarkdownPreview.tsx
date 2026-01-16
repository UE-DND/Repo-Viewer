import { memo, useState, useRef, useEffect, useCallback, useMemo } from "react";
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
import { useContentContext, usePreviewContext } from "@/contexts/unified";
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
import { logger, scroll } from "@/utils";
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

    // 获取导航和预览上下文
    const { navigateTo, findFileItemByPath, currentPath } = useContentContext();
    const { selectFile } = usePreviewContext();

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

    const isLazyLoadEnabled = lazyLoad;
    const hasReadmeContent =
      typeof readmeContent === "string" && readmeContent.length > 0;

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
        setIsThemeChanging(true);
      };

      const handleThemeChanged = (): void => {
        // 主题切换完成后再显示公式并检测 LaTeX 数量
        setTimeout(() => {
          setIsThemeChanging(false);
          handleLatexCheck();
        }, 300);
      };

      window.addEventListener('theme:changing', handleThemeChanging);
      window.addEventListener('theme:changed', handleThemeChanged);

      return () => {
        window.removeEventListener('theme:changing', handleThemeChanging);
        window.removeEventListener('theme:changed', handleThemeChanged);
      };
    }, [handleLatexCheck]);

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

    // 获取当前 README 文件所在的目录路径
    const previewingItemPath = previewingItem?.path ?? null;
    const currentReadmeDir = useMemo(() => {
      if (previewingItemPath !== null && previewingItemPath.length > 0) {
        // 从文件路径中获取目录部分
        const lastSlashIndex = previewingItemPath.lastIndexOf('/');
        return lastSlashIndex >= 0 ? previewingItemPath.substring(0, lastSlashIndex) : '';
      }
      // 如果没有 previewingItem，使用 currentPath
      return currentPath;
    }, [previewingItemPath, currentPath]);

    // 处理内部链接点击
    const handleInternalLinkClick = useCallback(
      (relativePath: string) => {
        // 解析相对路径
        let targetPath = relativePath;

        // 移除开头的 ./
        if (targetPath.startsWith('./')) {
          targetPath = targetPath.substring(2);
        }

        // 处理 ../ 路径
        const baseParts = currentReadmeDir.length > 0 ? currentReadmeDir.split('/') : [];
        const targetParts = targetPath.split('/');

        const resolvedParts = [...baseParts];
        for (const part of targetParts) {
          if (part === '..') {
            resolvedParts.pop();
          } else if (part !== '.' && part !== '') {
            resolvedParts.push(part);
          }
        }

        const resolvedPath = resolvedParts.join('/');
        logger.debug(`内部链接导航: ${relativePath} -> ${resolvedPath}`);

        // 尝试找到对应的文件项
        const fileItem = findFileItemByPath(resolvedPath);

        if (fileItem !== undefined) {
          // 如果找到了文件项，根据类型进行处理
          if (fileItem.type === 'dir') {
            navigateTo(resolvedPath, 'forward');
          } else {
            // 文件类型，打开预览
            void selectFile(fileItem);
          }
        } else {
          // 如果在当前目录内容中找不到，尝试直接导航
          // 判断是否可能是目录（没有扩展名或特定的目录标识）
          const hasExtension = /\.[^/]+$/.test(resolvedPath);
          if (!hasExtension) {
            // 可能是目录，尝试导航
            navigateTo(resolvedPath, 'forward');
          } else {
            // 可能是其他目录中的文件，导航到其父目录
            const lastSlashIdx = resolvedPath.lastIndexOf('/');
            const parentPath = lastSlashIdx >= 0 ? resolvedPath.substring(0, lastSlashIdx) : '';
            navigateTo(parentPath, 'forward');
            logger.info(`文件不在当前目录，导航到父目录: ${parentPath}`);
          }
        }

        // 导航后滚动到页面顶部
        void scroll.scrollToTop();
      },
      [currentReadmeDir, findFileItemByPath, navigateTo, selectFile]
    );

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
          <Tooltip title={t('ui.markdown.closePreview')} placement="bottom">
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
              key={readmeContent}
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
                      <MarkdownLink
                        href={href}
                        style={linkStyle}
                        onInternalLinkClick={handleInternalLinkClick}
                        {...props}
                      >
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
