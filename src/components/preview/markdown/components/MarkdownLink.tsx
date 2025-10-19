import React from "react";
import { useTheme } from "@mui/material";

/**
 * Markdown链接组件属性接口
 */
interface MarkdownLinkProps
  extends Omit<
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    "href" | "style" | "target" | "rel"
  > {
  href?: string;
  style?: React.CSSProperties | undefined;
  children?: React.ReactNode;
}

/**
 * Markdown链接组件
 * 
 * 自定义Markdown中的链接样式，自动添加外链属性。
 */
export const MarkdownLink: React.FC<MarkdownLinkProps> = ({
  href,
  children,
  style,
  ...props
}) => {
  const theme = useTheme();
  const resolvedHref = href?.trim() ?? "";
  const hasValidHref = resolvedHref.length > 0;
  const safeHref = hasValidHref ? resolvedHref : undefined;

  return (
    <a
      {...props}
      href={safeHref}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: theme.palette.primary.main,
        textDecoration: "none",
        ...style
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.textDecoration = "underline";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.textDecoration = "none";
      }}
      data-oid="wswk6df"
    >
      {children}
    </a>
  );
};