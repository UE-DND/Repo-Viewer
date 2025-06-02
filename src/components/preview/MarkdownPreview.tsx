import React, { memo, useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import {
  Box,
  Typography,
  Paper,
  Divider,
  CircularProgress,
  Link,
  alpha,
  useTheme,
  IconButton,
  Button,
  GlobalStyles,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import { GitHubContent } from "../../types";
import { GitHubService } from "../../services/github";
import { Components } from "react-markdown";
import { logger } from "../../utils";
import { countLatexElements } from "../../utils/latexOptimizer";
// 导入骨架屏组件
import { MarkdownPreviewSkeleton } from "../common/SkeletonComponents";

// LaTeX错误处理函数
const handleKatexError = (message: string) => {
  logger.warn("[KaTeX] 公式渲染错误:", message);
};

// 定义KaTeX选项
const katexOptions = {
  throwOnError: false, // 不因渲染错误而中断
  strict: false, // 非严格模式，更宽容地处理语法
  output: "html", // 使用HTML输出
  trust: true, // 允许一些额外的命令
  errorCallback: handleKatexError, // 错误处理
  macros: {
    // 定义一些常用的宏
    "\\R": "\\mathbb{R}",
    "\\N": "\\mathbb{N}",
    "\\Z": "\\mathbb{Z}",
    "\\C": "\\mathbb{C}",
    "\\Q": "\\mathbb{Q}",
  },
  fleqn: false, // 公式左对齐
  leqno: false, // 等式编号在左侧
  colorIsTextColor: true,
};

interface MarkdownPreviewProps {
  readmeContent: string | null;
  loadingReadme: boolean;
  isSmallScreen: boolean;
  onClose?: () => void;
  previewingItem?: GitHubContent | null;
  isReadme?: boolean;
  lazyLoad?: boolean;
}

// 添加全局样式定义
const globalStyles = (
  <GlobalStyles
    styles={(theme) => ({
      ".MuiPaper-root.theme-switching img": {
        transition: "none !important",
      },
    })}
    data-oid="66:1nx7"
  />
);

const MarkdownPreview = memo<MarkdownPreviewProps>(
  ({
    readmeContent,
    loadingReadme,
    isSmallScreen,
    onClose,
    previewingItem,
    isReadme = false,
    lazyLoad = true,
  }) => {
    // 使用useTheme钩子获取主题
    const theme = useTheme();

    // 懒加载状态
    const [shouldRender, setShouldRender] = useState<boolean>(!lazyLoad);
    const markdownRef = useRef<HTMLDivElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    // 图片加载缓存，用于记住已加载的图片
    const loadedImagesRef = useRef<Set<string>>(new Set());
    // 图片加载失败缓存，用于记住加载失败的图片
    const failedImagesRef = useRef<Set<string>>(new Set());
    // 图片加载超时计时器
    const imageTimersRef = useRef<Map<string, number>>(new Map());
    // 添加主题切换状态追踪
    const [isThemeChanging, setIsThemeChanging] = useState<boolean>(false);
    // LaTeX公式数量
    const [latexCount, setLatexCount] = useState<number>(0);

    // 检测LaTeX公式数量
    const checkLatexCount = useCallback(() => {
      // 延迟检测，等待渲染完成
      setTimeout(() => {
        if (markdownRef.current) {
          const count = countLatexElements();
          setLatexCount(count);

          // 如果公式数量很多，在控制台提示
          if (count > 50) {
            console.warn(`检测到${count}个LaTeX公式，已启用性能优化模式`);
          }
        }
      }, 500);
    }, []);

    // 设置IntersectionObserver监听markdown容器
    useEffect(() => {
      if (!lazyLoad || shouldRender) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
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
          checkLatexCount();
        }
      }, 300); // 主题切换动画完成后再显示公式

      return () => clearTimeout(timer);
    }, [theme.palette.mode, checkLatexCount]);

    // 初始检测LaTeX公式数量
    useEffect(() => {
      if (shouldRender && readmeContent) {
        checkLatexCount();
      }
    }, [shouldRender, readmeContent, checkLatexCount]);

    // 清理图片加载计时器
    useEffect(() => {
      return () => {
        // 组件卸载时清理所有计时器
        imageTimersRef.current.forEach((timer) => {
          window.clearTimeout(timer);
        });
      };
    }, []);

    if (loadingReadme) {
      return (
        // 使用 Markdown 预览骨架屏替代加载指示器
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
        {globalStyles}

        <Paper
          elevation={0}
          className={isThemeChanging ? "theme-transition-katex" : ""}
          sx={{
            py: 2,
            px: { xs: 2, sm: 3, md: 4 },
            mt: 2,
            mb: 3,
            borderRadius: 2,
            bgcolor: "background.paper",
            overflowX: "auto",
            border: "1px solid",
            borderColor: "divider",
            // 主题切换时的过渡效果
            "&.theme-transition-katex .katex-display, &.theme-transition-katex .katex":
              {
                visibility: "hidden",
                opacity: 0,
                transition: "visibility 0s, opacity 0.3s linear",
              },
            // 大量公式时的特殊优化
            ...(latexCount > 50 && {
              "& .katex": {
                contain: "paint layout style",
                willChange: "transform",
              },
              "& .katex-display": {
                contain: "paint layout style",
                willChange: "transform",
              },
            }),
            "& img": {
              maxWidth: "100%",
              borderRadius: 1,
              my: 2,
              // 修改图片过渡效果，确保主题切换时不会闪烁
              transition: theme.transitions.create(["opacity", "filter"], {
                duration: theme.transitions.duration.standard,
              }),
              // 使用filter而不是opacity，在主题切换时不会重置
              filter: "brightness(1)",
              "&:not(.loaded)": {
                opacity: 0.7,
                filter: "brightness(0.95)",
                transform: "scale(0.98)",
              },
              "&.failed": {
                filter: "grayscale(0.5) brightness(0.9)",
                border: `1px dashed ${theme.palette.error.main}`,
              },
              "&.theme-transition": {
                transition: "none !important",
              },
            },
            // LaTeX公式样式
            "& .math": {
              fontSize: "1.1em",
              margin: "0.5em 0",
            },
            "& .math-inline": {
              display: "inline-flex",
              alignItems: "center",
              margin: "0 0.25em",
            },
            "& .katex-display": {
              margin: "1em 0",
              padding: "0.5em 0",
              overflowX: "auto",
              overflowY: "hidden",
            },
            // 深色模式下的LaTeX样式调整
            ...(theme.palette.mode === "dark" && {
              "& .katex": {
                color: "#E6E1E5",
              },
              "& .katex-display": {
                background: alpha(theme.palette.background.paper, 0.4),
                borderRadius: 1,
              },
            }),
            "& p": {
              "& > a + a, & > a + img, & > img + a, & > img + img": {
                marginLeft: 1,
                marginTop: 0,
                marginBottom: 0,
              },
              // 识别连续的徽章图片链接，将其设置为弹性布局
              '&:has(a > img[src*="img.shields.io"]), &:has(img[src*="img.shields.io"])':
                {
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 1,
                  "& > a, & > img": {
                    display: "inline-flex",
                    marginTop: "4px",
                    marginBottom: "4px",
                  },
                  "& img": {
                    margin: 0,
                  },
                },
            },
            "& h1": {
              borderBottom: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
              pb: 1,
              fontSize: { xs: "1.5rem", sm: "1.8rem" },
            },
            "& h2": {
              borderBottom: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
              pb: 1,
              mt: 3,
              fontSize: { xs: "1.25rem", sm: "1.5rem" },
            },
            "& h3, h4, h5, h6": {
              mt: 2,
              fontSize: { xs: "1rem", sm: "1.25rem" },
            },
            "& code": {
              backgroundColor: alpha(theme.palette.primary.main, 0.05),
              padding: "0.2em 0.4em",
              borderRadius: 1,
              fontFamily: "monospace",
              fontSize: "85%",
            },
            "& pre": {
              backgroundColor:
                theme.palette.mode === "dark"
                  ? alpha(theme.palette.common.black, 0.7)
                  : alpha(theme.palette.common.black, 0.03),
              padding: 2,
              borderRadius: 1,
              overflowX: "auto",
              "& code": {
                backgroundColor: "transparent",
                padding: 0,
                fontSize: "90%",
              },
            },
            "& blockquote": {
              borderLeft: `4px solid ${alpha(theme.palette.primary.main, 0.3)}`,
              pl: 2,
              ml: 0,
              color: theme.palette.text.secondary,
            },
            "& table": {
              borderCollapse: "collapse",
              width: "100%",
              my: 2,
              "& th": {
                backgroundColor: alpha(theme.palette.primary.main, 0.05),
                textAlign: "left",
                padding: "8px 16px",
                fontWeight: 500,
              },
              "& td": {
                padding: "8px 16px",
                borderBottom: `1px solid ${theme.palette.divider}`,
              },
              "& tr:nth-of-type(even)": {
                backgroundColor: alpha(theme.palette.primary.main, 0.02),
              },
            },
            "& a": {
              color: theme.palette.primary.main,
              textDecoration: "none",
              "&:hover": {
                textDecoration: "underline",
              },
            },
            "& ul, & ol": {
              pl: 3,
            },
          }}
          data-oid=":p7j.31"
        >
          {shouldRender && !isThemeChanging && (
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[[rehypeRaw], [rehypeKatex, katexOptions]]}
              components={{
                a: ({ node, ...props }) => (
                  <Link
                    {...props}
                    target="_blank"
                    rel="noopener noreferrer"
                    underline="hover"
                    data-oid="wswk6df"
                  />
                ),

                img: ({ node, ...props }) => {
                  // 处理图片路径
                  let imgSrc = props.src || "";
                  const originalSrc = props.src || "";
                  const imgId = `img-${imgSrc.replace(/[^a-zA-Z0-9]/g, "-")}`;

                  // 添加本地状态管理图片加载情况
                  const [isImageLoaded, setIsImageLoaded] = useState(false);
                  const [isImageFailed, setIsImageFailed] = useState(
                    failedImagesRef.current.has(imgSrc || ""),
                  );

                  if (previewingItem && props.src) {
                    // 记录转换前的URL
                    logger.debug("Markdown中的原始图片URL:", props.src);
                    logger.debug("当前Markdown文件路径:", previewingItem.path);

                    // 使用GitHubService处理图片URL
                    const transformedSrc = GitHubService.transformImageUrl(
                      props.src,
                      previewingItem.path,
                      true,
                    );

                    if (transformedSrc) {
                      logger.debug("转换后的图片URL:", transformedSrc);
                      imgSrc = transformedSrc;
                    } else {
                      logger.warn("URL转换失败，使用原始URL:", props.src);
                    }
                  }

                  // 检查图片是否已经加载失败
                  if (isImageFailed) {
                    return (
                      <div
                        style={{
                          position: "relative",
                          margin: "1em 0",
                          border: `1px dashed ${theme.palette.error.main}`,
                          borderRadius: "4px",
                          padding: "16px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: "100px",
                          backgroundColor: alpha(
                            theme.palette.error.main,
                            0.05,
                          ),
                        }}
                        data-oid="jygfg5b"
                      >
                        <ErrorOutlineIcon
                          color="error"
                          style={{ fontSize: 40, marginBottom: 8 }}
                          data-oid="g5glf05"
                        />
                        <Typography
                          variant="body2"
                          color="error"
                          gutterBottom
                          data-oid="wwi58v_"
                        >
                          图片加载失败
                        </Typography>
                        <Typography
                          variant="caption"
                          color="textSecondary"
                          style={{
                            maxWidth: "90%",
                            wordBreak: "break-all",
                            textAlign: "center",
                            marginBottom: 8,
                          }}
                          data-oid="dcz6qln"
                        >
                          {imgSrc || "未知图片路径"}
                        </Typography>
                        <Button
                          startIcon={<RefreshIcon data-oid="d5-tho9" />}
                          size="small"
                          variant="outlined"
                          color="primary"
                          onClick={() => {
                            // 重置失败状态
                            setIsImageFailed(false);
                            // 从失败缓存中移除
                            failedImagesRef.current.delete(imgSrc || "");

                            // 尝试使用备选加载方式
                            const directSrc = tryDirectLoad();
                            if (directSrc) {
                              // 使用直接URL加载
                              const imgElement = document
                                .getElementById(imgId)
                                ?.querySelector("img");
                              if (imgElement) {
                                imgElement.src = directSrc;
                              }
                            } else {
                              // 强制重新渲染以触发图片重新加载
                              setIsThemeChanging(true);
                              setTimeout(() => setIsThemeChanging(false), 50);
                            }
                          }}
                          data-oid="e12fctp"
                        >
                          重试加载
                        </Button>
                      </div>
                    );
                  }

                  // 尝试不同的加载方式
                  const tryDirectLoad = () => {
                    // 尝试直接从GitHub加载
                    if (imgSrc && imgSrc.includes("githubusercontent.com")) {
                      try {
                        // 提取实际的路径部分
                        let directPath = "";
                        if (
                          imgSrc.includes(
                            "/api/github?action=getFileContent&url=",
                          )
                        ) {
                          // 解码URL参数
                          const encodedUrl = imgSrc.split("url=")[1];
                          if (encodedUrl) {
                            const decodedUrl = decodeURIComponent(encodedUrl);
                            // 提取路径
                            const pathMatch = decodedUrl.match(
                              /githubusercontent\.com\/[^\/]+\/[^\/]+\/[^\/]+\/(.+)/,
                            );
                            if (pathMatch && pathMatch[1]) {
                              directPath = pathMatch[1];
                            }
                          }
                        } else if (imgSrc.includes("githubusercontent.com")) {
                          const pathMatch = imgSrc.match(
                            /githubusercontent\.com\/[^\/]+\/[^\/]+\/[^\/]+\/(.+)/,
                          );
                          if (pathMatch && pathMatch[1]) {
                            directPath = pathMatch[1];
                          }
                        }

                        if (directPath) {
                          // 尝试使用备选的代理服务
                          const proxy = "https://cdn.jsdelivr.net/gh";
                          // 提取仓库信息
                          const repoOwner =
                            GitHubService.getCurrentProxyService().includes(
                              "Royfor12",
                            )
                              ? "Royfor12"
                              : "UE-DND";
                          const repoName =
                            GitHubService.getCurrentProxyService().includes(
                              "CQUT-Course-Guide-Sharing-Scheme",
                            )
                              ? "CQUT-Course-Guide-Sharing-Scheme"
                              : "Repo-Viewer";
                          // 构建新的URL
                          const newSrc = `${proxy}/${repoOwner}/${repoName}@main/${directPath}`;
                          logger.info("尝试使用JSDelivr加载图片:", newSrc);
                          return newSrc;
                        }
                      } catch (error) {
                        logger.error("解析直接URL失败:", error);
                      }
                    }
                    return null;
                  };

                  // 创建懒加载图片
                  return (
                    <div
                      style={{ position: "relative", margin: "1em 0" }}
                      id={imgId}
                      data-oid="rqizsxa"
                    >
                      <img
                        {...props}
                        src={imgSrc}
                        style={{
                          maxWidth: "100%",
                          height: "auto",
                          opacity: isImageLoaded ? 1 : 0.7,
                          transition: "opacity 0.3s ease",
                        }}
                        alt={props.alt || "图片"}
                        loading="lazy"
                        className={
                          isImageLoaded
                            ? "loaded"
                            : isImageFailed
                              ? "failed"
                              : ""
                        }
                        onLoad={(e) => {
                          // 设置本地状态
                          setIsImageLoaded(true);

                          // 添加loaded类以触发淡入效果
                          e.currentTarget.classList.add("loaded");
                          e.currentTarget.style.opacity = "1";
                          logger.debug("图片加载成功:", imgSrc);

                          // 记录已加载的图片，以便主题切换时不再重复加载效果
                          if (imgSrc) {
                            loadedImagesRef.current.add(imgSrc);
                            failedImagesRef.current.delete(imgSrc);

                            // 清除超时计时器
                            const timerId = imageTimersRef.current.get(imgSrc);
                            if (timerId) {
                              window.clearTimeout(timerId);
                              imageTimersRef.current.delete(imgSrc);
                            }
                          }
                        }}
                        onError={(e) => {
                          // 图片加载失败时的处理
                          logger.error("图片加载失败:", imgSrc);

                          // 设置失败状态
                          setIsImageFailed(true);

                          // 清除超时计时器
                          const timerId = imageTimersRef.current.get(imgSrc);
                          if (timerId) {
                            window.clearTimeout(timerId);
                            imageTimersRef.current.delete(imgSrc);
                          }

                          // 如果是代理URL，尝试标记该代理服务失败
                          if (
                            imgSrc &&
                            (imgSrc.includes("gh-proxy.com") ||
                              imgSrc.includes("ghproxy.com") ||
                              imgSrc.includes("staticdn.net") ||
                              imgSrc.includes("ghfast.top"))
                          ) {
                            try {
                              // 提取代理服务URL
                              const proxyUrl =
                                imgSrc.split("/")[0] +
                                "//" +
                                imgSrc.split("/")[2];
                              // 标记该代理服务失败
                              GitHubService.markProxyServiceFailed(proxyUrl);
                              logger.warn("标记代理服务失败:", proxyUrl);

                              // 获取新的代理服务
                              const currentProxy =
                                GitHubService.getCurrentProxyService();
                              logger.info("切换到新的代理服务:", currentProxy);

                              // 如果还有可用的备选代理，重新加载图片
                              if (currentProxy && currentProxy !== proxyUrl) {
                                // 清除失败记录以允许重试
                                failedImagesRef.current.delete(imgSrc);
                                // 重置失败状态
                                setIsImageFailed(false);
                                return;
                              }
                            } catch (error) {
                              logger.error("处理代理服务失败出错:", error);
                            }
                          }

                          // 尝试使用备选的直接加载方式
                          const directSrc = tryDirectLoad();
                          if (directSrc) {
                            logger.info("尝试使用直接URL加载:", directSrc);
                            e.currentTarget.src = directSrc;

                            // 设置新的超时计时器
                            const newTimerId = window.setTimeout(() => {
                              if (!loadedImagesRef.current.has(directSrc)) {
                                failedImagesRef.current.add(imgSrc);
                                setIsImageFailed(true);
                              }
                            }, 15000); // 15秒超时

                            imageTimersRef.current.set(directSrc, newTimerId);
                            return;
                          }

                          // 如果转换后的URL加载失败，可以尝试使用原始URL
                          if (
                            imgSrc !== originalSrc &&
                            !failedImagesRef.current.has(originalSrc)
                          ) {
                            logger.debug("尝试使用原始URL:", originalSrc);
                            e.currentTarget.src = originalSrc;

                            // 为原始URL设置超时计时器
                            const newTimerId = window.setTimeout(() => {
                              if (!loadedImagesRef.current.has(originalSrc)) {
                                failedImagesRef.current.add(originalSrc);
                                setIsImageFailed(true);
                              }
                            }, 15000); // 15秒超时

                            imageTimersRef.current.set(originalSrc, newTimerId);
                          } else {
                            // 记录失败的图片
                            if (imgSrc) {
                              failedImagesRef.current.add(imgSrc);
                              setIsImageFailed(true);
                            }
                          }
                        }}
                        data-oid="1jtw89v"
                      />
                    </div>
                  );
                },
                // 添加代码块支持，改进LaTeX代码块的处理
                code: ({
                  node,
                  inline,
                  className,
                  children,
                  ...props
                }: any) => {
                  const match = /language-(\w+)/.exec(className || "");
                  const isLatexBlock =
                    !inline &&
                    (match?.[1] === "math" ||
                      match?.[1] === "latex" ||
                      match?.[1] === "tex");

                  // 处理特殊的LaTeX代码块
                  if (isLatexBlock) {
                    return (
                      <div
                        className="math math-display"
                        style={{ overflowX: "auto", padding: "0.5em 0" }}
                        data-oid="g0ievsv"
                      >
                        {String(children).replace(/\n$/, "")}
                      </div>
                    );
                  }

                  // 普通代码块
                  return (
                    <code className={className} {...props} data-oid="nzwnmt7">
                      {children}
                    </code>
                  );
                },
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

// 添加显示名称以便调试
MarkdownPreview.displayName = "MarkdownPreview";

export default MarkdownPreview;
