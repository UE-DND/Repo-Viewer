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
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import type { TextPreviewProps } from "./types";

const COPY_RESET_DELAY = 2000;
const MONO_FONT_STACK =
  "'JetBrains Mono', 'Fira Code', 'SFMono-Regular', ui-monospace, 'Source Code Pro', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

const TextPreview: React.FC<TextPreviewProps> = memo(
  ({ content, loading, isSmallScreen, previewingItem, onClose, onOpenInGithub }) => {
    const theme = useTheme();
    const [wrapText, setWrapText] = useState<boolean>(false);
    const [copied, setCopied] = useState<boolean>(false);
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
      return () => {
        if (timerRef.current !== null) {
          window.clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      };
    }, []);

    useEffect(() => {
      setWrapText(false);
      setCopied(false);
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }, [content]);

    const normalizedLines = useMemo(() => {
      if (typeof content !== "string") {
        return [];
      }
      return content.replace(/\r\n/g, "\n").split("\n");
    }, [content]);

    const lineCount = normalizedLines.length === 0 ? 1 : normalizedLines.length;

    const charCount = useMemo(() => (typeof content === "string" ? content.length : 0), [content]);

    const lineNumberColumnWidth = useMemo(() => {
      const digitCount = Math.max(2, String(lineCount).length);
      return digitCount.toString() + "ch";
    }, [lineCount]);

    const handleCopy = useCallback(async () => {
      if (typeof content !== "string") {
        return;
      }

      try {
        if (typeof navigator === "undefined") {
          throw new Error("navigator 未定义");
        }

        const clipboard = navigator.clipboard as Clipboard | undefined;

        if (clipboard === undefined || typeof clipboard.writeText !== "function") {
          return;
        }

        await clipboard.writeText(content);

        setCopied(true);
        if (timerRef.current !== null) {
          window.clearTimeout(timerRef.current);
        }
        timerRef.current = window.setTimeout(() => {
          setCopied(false);
          timerRef.current = null;
        }, COPY_RESET_DELAY);
      } catch {
        // 忽略剪贴板错误，日志由全局捕获系统处理
      }
    }, [content]);

    const handleToggleWrap = useCallback(() => {
      setWrapText((prev) => !prev);
    }, []);

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

    const headerBg = alpha(theme.palette.background.paper, theme.palette.mode === "light" ? 0.8 : 0.35);
    const borderColor = alpha(theme.palette.divider, 0.56);

    return (
      <Box sx={{ position: "relative", width: "100%", height: "100%" }} data-oid="text-preview">
        <GlobalStyles
          styles={{
            ".text-preview__code-table": {
              fontFamily: MONO_FONT_STACK,
              fontSize: "0.9rem",
              lineHeight: 1.6,
              color: theme.palette.text.primary,
            },
          }}
        />

        {typeof onClose === "function" ? (
          <Tooltip title="关闭预览" placement="bottom">
            <IconButton
              onClick={onClose}
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
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, color: "text.primary", wordBreak: "break-all" }}
                data-oid="text-preview-filename"
              >
                {previewingItem?.name ?? "文本预览"}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", wordBreak: "break-all" }}
                data-oid="text-preview-meta"
              >
                {previewingItem?.path ?? ""} · {lineCount.toString()} 行 · {charCount.toString()} 字符
              </Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {typeof onOpenInGithub === "function" ? (
                <Tooltip title="在 GitHub 查看">
                  <IconButton
                    size="small"
                    onClick={onOpenInGithub}
                    aria-label="在 GitHub 查看"
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 2,
                      border: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                      color: theme.palette.text.secondary,
                      bgcolor: "transparent",
                      "&:hover": {
                        bgcolor: alpha(theme.palette.action.hover, 0.4),
                      },
                      transition: theme.transitions.create(["background-color", "box-shadow"], {
                        duration: theme.transitions.duration.shortest,
                      }),
                    }}
                    data-oid="text-preview-open-github"
                  >
                    <OpenInNewIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              ) : null}

              <Tooltip title={wrapText ? "关闭自动换行" : "开启自动换行"}>
                <IconButton
                  size="small"
                  onClick={handleToggleWrap}
                  sx={{
                    width: 32,
                    height: 32,
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
                    <TextRotationNoneIcon sx={{ fontSize: 18 }} />
                  ) : (
                    <WrapTextIcon sx={{ fontSize: 18 }} />
                  )}
                </IconButton>
              </Tooltip>

              <Tooltip title={copied ? "已复制" : "复制全部内容"}>
                <IconButton
                  size="small"
                  onClick={() => {
                    void handleCopy();
                  }}
                  sx={{
                    width: 32,
                    height: 32,
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
                  {copied ? <CheckRoundedIcon sx={{ fontSize: 18 }} /> : <ContentCopyRoundedIcon sx={{ fontSize: 18 }} />}
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Box
            className="text-preview__code-container"
            sx={{
              width: "100%",
              maxHeight: isSmallScreen ? "calc(100vh - 220px)" : "calc(100vh - 280px)",
              overflow: "auto",
              backgroundColor:
                theme.palette.mode === "light"
                  ? alpha(theme.palette.background.paper, 0.95)
                  : alpha(theme.palette.background.paper, 0.16),
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
                          padding: `${theme.spacing(0.25)} ${theme.spacing(1)}`,
                          width: `calc(${lineNumberColumnWidth} + ${theme.spacing(1)})`,
                          borderRight: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
                          color: alpha(theme.palette.text.secondary, 0.9),
                          backgroundColor: alpha(theme.palette.background.default, 0.35),
                          position: "sticky",
                          left: 0,
                        }}
                      >
                        {index + 1}
                      </td>
                      <td
                        style={{
                          padding: `${theme.spacing(0.25)} ${theme.spacing(3)} ${theme.spacing(0.25)} ${theme.spacing(2)}`,
                          verticalAlign: "top",
                        }}
                      >
                        <Box
                          component="span"
                          sx={{
                            display: "block",
                            fontFamily: MONO_FONT_STACK,
                            fontSize: "0.9rem",
                            lineHeight: 1.6,
                            whiteSpace: wrapText ? "pre-wrap" : "pre",
                            wordBreak: wrapText ? "break-word" : "normal",
                            minWidth: wrapText ? "auto" : "max-content",
                          }}
                        >
                          {line.length > 0 ? line : "\u00A0"}
                        </Box>
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
