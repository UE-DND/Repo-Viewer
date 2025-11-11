import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ClassAttributes, HTMLAttributes } from "react";
import { Box, IconButton, Tooltip, useTheme, useMediaQuery } from "@mui/material";
import { alpha } from "@mui/material/styles";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { logger } from "@/utils";
import { useI18n } from "@/contexts/I18nContext";

type CodeElementProps = (HTMLAttributes<HTMLElement> & ClassAttributes<HTMLElement>) | undefined;

interface MarkdownCodeBlockProps {
  className?: string | undefined;
  language?: string | undefined;
  content: string;
  codeProps?: CodeElementProps;
  dataOid?: string | undefined;
}

const COPY_RESET_DELAY = 2000;

export const MarkdownCodeBlock: React.FC<MarkdownCodeBlockProps> = ({
  className,
  language,
  content,
  codeProps,
  dataOid,
}) => {
  const theme = useTheme();
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const isDesktop = useMediaQuery(theme.breakpoints.up("sm"));

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      if (typeof navigator === "undefined") {
        throw new Error("navigator 未定义");
      }

      const clipboard = navigator.clipboard as Clipboard | undefined;

      if (clipboard === undefined || typeof clipboard.writeText !== "function") {
        logger.warn("当前环境不支持 Clipboard API 自动复制");
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
    } catch (error) {
      logger.error("复制代码失败:", error);
    }
  }, [content]);

  const { restProps: codeAttributes, ref: codeRef } = useMemo(() => {
    if (codeProps === undefined) {
      return { restProps: {} as HTMLAttributes<HTMLElement>, ref: undefined };
    }

    const { children: _children, ref, ...rest } = codeProps as Record<string, unknown> & {
      ref?: ClassAttributes<HTMLElement>["ref"];
    };

    return {
      restProps: rest as HTMLAttributes<HTMLElement>,
      ref: ref,
    };
  }, [codeProps]);

  const iconColor = copied ? theme.palette.success.main : theme.palette.text.secondary;
  const baseBg = alpha(theme.palette.background.paper, theme.palette.mode === "light" ? 0.92 : 0.4);
  const hoverBg = alpha(theme.palette.background.paper, theme.palette.mode === "light" ? 1 : 0.55);
  const borderColor = alpha(theme.palette.divider, 0.6);
  const showCopyButton = !isDesktop || isHovered;

  return (
    <Box
      sx={{ position: "relative", width: "100%" }}
      data-oid={dataOid !== undefined ? `${dataOid}-container` : undefined}
      onMouseEnter={isDesktop ? () => { setIsHovered(true); } : undefined}
      onMouseLeave={isDesktop ? () => { setIsHovered(false); } : undefined}
      onFocusCapture={isDesktop ? () => { setIsHovered(true); } : undefined}
      onBlurCapture={isDesktop ? () => { setIsHovered(false); } : undefined}
    >
      <pre
        className={className}
        tabIndex={0}
        data-language={language ?? undefined}
        data-oid={dataOid}
      >
        <code
          className={className}
          ref={codeRef}
          {...codeAttributes}
        >
          {content}
        </code>
      </pre>

      <Tooltip
        title={copied ? t('ui.markdown.copy.copied') : t('ui.markdown.copy.button')}
        placement="left"
        enterDelay={200}
        leaveDelay={150}
        disableHoverListener={!isDesktop}
        disableFocusListener={!isDesktop}
        disableTouchListener={!isDesktop}
      >
        <IconButton
          size="small"
          aria-label={t('ui.markdown.copy.aria')}
          onClick={() => { void handleCopy(); }}
          sx={{
            position: "absolute",
            top: theme.spacing(0),
            right: theme.spacing(1),
            width: 28,
            height: 28,
            borderRadius: 10,
            backgroundColor: baseBg,
            color: iconColor,
            border: `1px solid ${borderColor}`,
            boxShadow: theme.shadows[1],
            backdropFilter: "blur(6px)",
            transition: theme.transitions.create(["background-color", "color", "box-shadow", "opacity"], {
              duration: theme.transitions.duration.shortest,
            }),
            opacity: showCopyButton ? 1 : 0,
            pointerEvents: showCopyButton ? "auto" : "none",
            "&:hover": {
              backgroundColor: hoverBg,
              color: copied ? theme.palette.success.dark : theme.palette.text.primary,
              boxShadow: theme.shadows[2],
            },
            "&:active": {
              boxShadow: theme.shadows[3],
            },
            zIndex: 2,
          }}
          data-oid={dataOid !== undefined ? `${dataOid}-copy` : undefined}
        >
          {copied ? (
            <CheckRoundedIcon sx={{ fontSize: 16 }} />
          ) : (
            <ContentCopyRoundedIcon sx={{ fontSize: 16 }} />
          )}
        </IconButton>
      </Tooltip>
    </Box>
  );
};
