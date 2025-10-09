import React from "react";
import { useTheme } from "@mui/material";

interface MarkdownLinkProps
  extends Omit<
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    "href" | "style" | "target" | "rel"
  > {
  href?: string;
  style?: React.CSSProperties | undefined;
  children?: React.ReactNode;
}

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