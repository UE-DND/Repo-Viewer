import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  CircularProgress,
  GlobalStyles,
  IconButton,
  Paper,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import WrapTextIcon from "@mui/icons-material/WrapText";
import TextRotationNoneIcon from "@mui/icons-material/TextRotationNone";
import type { TextPreviewProps } from "./types";
import { formatFileSize } from "@/utils/format/formatters";
import { useI18n } from "@/contexts/I18nContext";
import { highlightCodeByFilename } from "@/utils/content/prismHighlighter";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";

const MONO_FONT_STACK =
  "'JetBrains Mono', 'Fira Code', 'SFMono-Regular', ui-monospace, 'Source Code Pro', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

const TextPreview: React.FC<TextPreviewProps> = memo(
  ({ content, loading, isSmallScreen, previewingItem, onClose }) => {
    const theme = useTheme();
    const { t } = useI18n();
    const [wrapText, setWrapText] = useState<boolean>(false);
    const { copied, copy, reset } = useCopyToClipboard();
    const [prevContent, setPrevContent] = useState(content);

    // 当 content 变化时，重置 UI 状态
    if (content !== prevContent) {
      setPrevContent(content);
      setWrapText(false);
      reset();
    }

    const normalizedLines = useMemo(() => {
      if (typeof content !== "string") {
        return [];
      }
      return content.replace(/\r\n/g, "\n").split("\n");
    }, [content]);

    const lineCount = normalizedLines.length === 0 ? 1 : normalizedLines.length;

    // 大于500行的文件禁用代码高亮
    const MAX_LINES_FOR_HIGHLIGHT = 500;
    const shouldHighlight = lineCount <= MAX_LINES_FOR_HIGHLIGHT;

    // 计算高亮后的代码行
    const highlightedLines = useMemo(() => {
      if (typeof content !== "string" || content.length === 0) {
        return [];
      }
      // 如果行数超过限制，不进行高亮
      if (!shouldHighlight) {
        return [];
      }
      const filename = previewingItem?.name ?? undefined;
      return highlightCodeByFilename(content, filename);
    }, [content, previewingItem?.name, shouldHighlight]);

    const charCount = useMemo(() => (typeof content === "string" ? content.length : 0), [content]);

    // 计算实际字节大小（UTF-8编码）
    const byteSize = useMemo(() => {
      if (typeof content !== "string") {
        return 0;
      }
      try {
        return new TextEncoder().encode(content).length;
      } catch {
        // 如果TextEncoder不可用，使用字符数的近似值（假设平均每个字符2字节）
        return charCount * 2;
      }
    }, [content, charCount]);

    // 格式化文件大小
    const formattedSize = useMemo(() => formatFileSize(byteSize), [byteSize]);

    const lineNumberColumnWidth = useMemo(() => {
      const digitCount = Math.max(2, String(lineCount).length);
      return digitCount.toString() + "ch";
    }, [lineCount]);

    const handleCopy = (): void => {
      if (typeof content === "string") {
        void copy(content);
      }
    };

    const handleToggleWrap = useCallback(() => {
      setWrapText((prev) => !prev);
    }, []);

    const headerBg = useMemo(
      () => alpha(theme.palette.background.paper, theme.palette.mode === "light" ? 0.8 : 0.35),
      [theme.palette.background.paper, theme.palette.mode]
    );
    const borderColor = useMemo(
      () => alpha(theme.palette.divider, 0.56),
      [theme.palette.divider]
    );

    // Prism 主题颜色 - 使用 CSS 变量优化性能
    // 使用 useMemo 优化，但依赖 theme.palette.mode 而不是整个 theme 对象
    const prismTheme = useMemo(() => {
      const isLight = theme.palette.mode === "light";
      return {
        background: isLight
          ? alpha(theme.palette.background.paper, 0.95)
          : alpha(theme.palette.background.paper, 0.16),
        comment: isLight ? "#6a737d" : "#8b949e",
        string: isLight ? "#032f62" : "#a5d6ff",
        keyword: isLight ? "#d73a49" : "#ff7b72",
        function: isLight ? "#6f42c1" : "#d2a8ff",
        number: isLight ? "#005cc5" : "#79c0ff",
        operator: isLight ? "#d73a49" : "#ff7b72",
        punctuation: isLight ? "#24292e" : "#c9d1d9",
        property: isLight ? "#005cc5" : "#79c0ff",
        tag: isLight ? "#22863a" : "#7ee787",
        selector: isLight ? "#6f42c1" : "#d2a8ff",
        boolean: isLight ? "#005cc5" : "#79c0ff",
        variable: isLight ? "#e36209" : "#ffa657",
        regex: isLight ? "#032f62" : "#a5d6ff",
        "class-name": isLight ? "#6f42c1" : "#d2a8ff",
      };
    }, [theme.palette.mode, theme.palette.background.paper]);

    const containerRef = useRef<HTMLDivElement>(null);

    const handleCloseOptimized = useCallback(() => {
      if (containerRef.current !== null) {
        const container = containerRef.current;
        container.textContent = '';
        container.style.display = 'none';
        container.style.visibility = 'hidden';
        container.style.opacity = '0';
      }

      requestAnimationFrame(() => {
        setTimeout(() => {
          if (typeof onClose === 'function') {
            onClose();
          }
        }, 0);
      });
    }, [onClose]);

    useEffect(() => {
      const container = containerRef.current;
      if (container !== null) {
        // 更新 Prism 语法高亮的颜色变量
        container.style.setProperty('--prism-comment', prismTheme.comment);
        container.style.setProperty('--prism-string', prismTheme.string);
        container.style.setProperty('--prism-keyword', prismTheme.keyword);
        container.style.setProperty('--prism-function', prismTheme.function);
        container.style.setProperty('--prism-number', prismTheme.number);
        container.style.setProperty('--prism-operator', prismTheme.operator);
        container.style.setProperty('--prism-punctuation', prismTheme.punctuation);
        container.style.setProperty('--prism-property', prismTheme.property);
        container.style.setProperty('--prism-tag', prismTheme.tag);
        container.style.setProperty('--prism-selector', prismTheme.selector);
        container.style.setProperty('--prism-boolean', prismTheme.boolean);
        container.style.setProperty('--prism-variable', prismTheme.variable);
        container.style.setProperty('--prism-regex', prismTheme.regex);
        container.style.setProperty('--prism-class-name', prismTheme["class-name"]);
        // 更新文本颜色变量
        container.style.setProperty('--text-primary', theme.palette.text.primary);
      }
    }, [prismTheme, theme.palette.text.primary]);

    if (loading) {
      return (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            minHeight: "220px",
          }}
          data-oid="text-preview-loading"
        >
          <CircularProgress size={28} />
        </Box>
      );
    }

    if (typeof content !== "string") {
      return null;
    }

    return (
      <Box sx={{ position: "relative", width: "100%", height: "100%" }} data-oid="text-preview">
        <GlobalStyles
          styles={{
            ".text-preview__code-table": {
              fontFamily: MONO_FONT_STACK,
              fontSize: isSmallScreen ? "0.85rem" : "0.9rem",
              lineHeight: 1.6,
              color: "var(--text-primary)",
            },
            ".text-preview__code-container .token.comment": {
              color: "var(--prism-comment)",
              fontStyle: "italic",
            },
            ".text-preview__code-container .token.prolog": {
              color: "var(--prism-comment)",
            },
            ".text-preview__code-container .token.doctype": {
              color: "var(--prism-comment)",
            },
            ".text-preview__code-container .token.cdata": {
              color: "var(--prism-comment)",
            },
            ".text-preview__code-container .token.punctuation": {
              color: "var(--prism-punctuation)",
            },
            ".text-preview__code-container .token.property": {
              color: "var(--prism-property)",
            },
            ".text-preview__code-container .token.tag": {
              color: "var(--prism-tag)",
            },
            ".text-preview__code-container .token.boolean": {
              color: "var(--prism-boolean)",
            },
            ".text-preview__code-container .token.number": {
              color: "var(--prism-number)",
            },
            ".text-preview__code-container .token.constant": {
              color: "var(--prism-number)",
            },
            ".text-preview__code-container .token.symbol": {
              color: "var(--prism-number)",
            },
            ".text-preview__code-container .token.deleted": {
              color: "var(--prism-keyword)",
            },
            ".text-preview__code-container .token.selector": {
              color: "var(--prism-selector)",
            },
            ".text-preview__code-container .token.attr-name": {
              color: "var(--prism-property)",
            },
            ".text-preview__code-container .token.string": {
              color: "var(--prism-string)",
            },
            ".text-preview__code-container .token.char": {
              color: "var(--prism-string)",
            },
            ".text-preview__code-container .token.builtin": {
              color: "var(--prism-function)",
            },
            ".text-preview__code-container .token.inserted": {
              color: "var(--prism-tag)",
            },
            ".text-preview__code-container .token.operator": {
              color: "var(--prism-operator)",
            },
            ".text-preview__code-container .token.entity": {
              color: "var(--prism-variable)",
              cursor: "help",
            },
            ".text-preview__code-container .token.url": {
              color: "var(--prism-string)",
            },
            ".text-preview__code-container .token.variable": {
              color: "var(--prism-variable)",
            },
            ".text-preview__code-container .token.atrule": {
              color: "var(--prism-selector)",
            },
            ".text-preview__code-container .token.attr-value": {
              color: "var(--prism-string)",
            },
            ".text-preview__code-container .token.function": {
              color: "var(--prism-function)",
            },
            ".text-preview__code-container .token.class-name": {
              color: "var(--prism-class-name)",
            },
            ".text-preview__code-container .token.keyword": {
              color: "var(--prism-keyword)",
            },
            ".text-preview__code-container .token.regex": {
              color: "var(--prism-regex)",
            },
            ".text-preview__code-container .token.important": {
              color: "var(--prism-keyword)",
              fontWeight: "bold",
            },
            ".text-preview__code-container .token.bold": {
              fontWeight: "bold",
            },
            ".text-preview__code-container .token.italic": {
              fontStyle: "italic",
            },
          }}
        />

        {typeof onClose === "function" ? (
          <Tooltip title={t("ui.text.closePreview")} placement="bottom">
            <IconButton
              onClick={handleCloseOptimized}
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
                transition: theme.transitions.create(["background-color", "box-shadow", "transform"], {
                  duration: theme.transitions.duration.short,
                }),
              }}
              data-oid="text-preview-close"
            >
              <CloseIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
            </IconButton>
          </Tooltip>
        ) : null}

        <Paper
          square
          elevation={0}
          sx={{
            width: "100%",
            position: "relative",
            borderRadius: 1,
            overflow: "hidden",
            boxShadow: theme.shadows[1],
          }}
          data-oid="text-preview-paper"
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: isSmallScreen ? "column" : "row",
              alignItems: isSmallScreen ? "flex-start" : "center",
              justifyContent: "space-between",
              gap: 1.5,
              px: { xs: 2, sm: 3 },
              py: { xs: 1.5, sm: 2 },
              bgcolor: headerBg,
              borderBottom: `1px solid ${borderColor}`,
              backdropFilter: "blur(10px)",
            }}
            data-oid="text-preview-header"
          >
            <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 0.25, sm: 0.5 } }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  color: "text.primary",
                  wordBreak: "break-all",
                  fontSize: { xs: "0.95rem", sm: "1rem" },
                  lineHeight: { xs: 1.4, sm: 1.5 },
                }}
                data-oid="text-preview-filename"
              >
                {previewingItem?.name ?? t("ui.text.title")}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  wordBreak: "break-all",
                  fontSize: { xs: "0.7rem", sm: "0.75rem" },
                  lineHeight: { xs: 1.3, sm: 1.4 },
                }}
                data-oid="text-preview-meta"
              >
                {previewingItem?.path ?? ""} · {t("ui.text.meta.totalLines", { count: lineCount })} · {formattedSize}
              </Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.75, sm: 1 } }}>
              <Tooltip title={wrapText ? t("ui.text.disableWrap") : t("ui.text.enableWrap")}>
                <IconButton
                  size="small"
                  onClick={handleToggleWrap}
                  sx={{
                    width: { xs: 28, sm: 32 },
                    height: { xs: 28, sm: 32 },
                    borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                    boxShadow: wrapText ? theme.shadows[2] : theme.shadows[0],
                    color: wrapText ? theme.palette.primary.main : theme.palette.text.secondary,
                    bgcolor: wrapText ? alpha(theme.palette.primary.main, 0.12) : "transparent",
                    "&:hover": {
                      bgcolor: wrapText
                        ? alpha(theme.palette.primary.main, 0.16)
                        : alpha(theme.palette.action.hover, 0.4),
                    },
                  }}
                  data-oid="text-preview-wrap"
                >
                  {wrapText ? (
                    <TextRotationNoneIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />
                  ) : (
                    <WrapTextIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />
                  )}
                </IconButton>
              </Tooltip>

              <Tooltip title={copied ? t("ui.text.copied") : t("ui.text.copyAll")}>
                <IconButton
                  size="small"
                  onClick={handleCopy}
                  sx={{
                    width: { xs: 28, sm: 32 },
                    height: { xs: 28, sm: 32 },
                    borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                    color: copied ? theme.palette.success.main : theme.palette.text.secondary,
                    bgcolor: copied ? alpha(theme.palette.success.main, 0.12) : "transparent",
                    "&:hover": {
                      bgcolor: copied
                        ? alpha(theme.palette.success.main, 0.16)
                        : alpha(theme.palette.action.hover, 0.4),
                    },
                    transition: theme.transitions.create(["background-color", "box-shadow", "transform"], {
                      duration: theme.transitions.duration.shortest,
                    }),
                  }}
                  data-oid="text-preview-copy"
                >
                  {copied ? <CheckRoundedIcon sx={{ fontSize: { xs: 16, sm: 18 } }} /> : <ContentCopyRoundedIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />}
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Box
            ref={containerRef}
            className="text-preview__code-container"
            sx={{
              width: "100%",
              maxHeight: isSmallScreen ? "calc(100vh - 220px)" : "calc(100vh - 280px)",
              overflow: "auto",
              backgroundColor: prismTheme.background,
            }}
            data-oid="text-preview-content"
          >
            <Box
              component="div"
              sx={{
                display: "inline-block",
                minWidth: wrapText ? "100%" : "max-content",
                width: "100%",
              }}
            >
              <Box
                component="table"
                className="text-preview__code-table"
                sx={{
                  borderCollapse: "separate",
                  borderSpacing: 0,
                  width: wrapText ? "100%" : "auto",
                }}
              >
                <tbody>
                  {normalizedLines.map((line, index) => (
                    <tr key={`text-line-${String(index)}`}>
                      <td
                        style={{
                          textAlign: "right",
                          userSelect: "none",
                          verticalAlign: "top",
                          padding: isSmallScreen
                            ? `${theme.spacing(0.25)} ${theme.spacing(0.75)}`
                            : `${theme.spacing(0.25)} ${theme.spacing(1)}`,
                          width: `calc(${lineNumberColumnWidth} + ${isSmallScreen ? theme.spacing(0.75) : theme.spacing(1)})`,
                          borderRight: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
                          color: alpha(theme.palette.text.secondary, 0.9),
                          backgroundColor: alpha(theme.palette.background.default, 0.35),
                          position: "sticky",
                          left: 0,
                          fontSize: isSmallScreen ? "0.8rem" : "0.9rem",
                        }}
                      >
                        {index + 1}
                      </td>
                      <td
                        style={{
                          padding: isSmallScreen
                            ? `${theme.spacing(0.25)} ${theme.spacing(2)} ${theme.spacing(0.25)} ${theme.spacing(1.5)}`
                            : `${theme.spacing(0.25)} ${theme.spacing(3)} ${theme.spacing(0.25)} ${theme.spacing(2)}`,
                          verticalAlign: "top",
                        }}
                      >
                        <Box
                          component="span"
                          sx={{
                            display: "block",
                            fontFamily: MONO_FONT_STACK,
                            fontSize: { xs: "0.85rem", sm: "0.9rem" },
                            lineHeight: 1.6,
                            whiteSpace: wrapText ? "pre-wrap" : "pre",
                            wordBreak: wrapText ? "break-word" : "normal",
                            minWidth: wrapText ? "auto" : "max-content",
                            "& code": {
                              fontFamily: "inherit",
                              fontSize: "inherit",
                              background: "transparent",
                              padding: 0,
                              borderRadius: 0,
                            },
                            "& .token": {
                              fontFamily: "inherit",
                              fontSize: "inherit",
                            },
                            "& span.token": {
                              fontFamily: "inherit",
                              fontSize: "inherit",
                            },
                          }}
                          dangerouslySetInnerHTML={{
                            __html:
                              index < highlightedLines.length
                                ? (highlightedLines[index] ?? "\u00A0")
                                : line.length > 0
                                  ? line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
                                  : "\u00A0",
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>
    );
  },
);

TextPreview.displayName = "TextPreview";

export default TextPreview;
