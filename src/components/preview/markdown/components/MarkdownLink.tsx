import React from "react";
import { useTheme } from "@mui/material";

interface MarkdownLinkProps {
  href?: string | undefined;
  children?: React.ReactNode;
  style?: React.CSSProperties | undefined;
  [key: string]: any;
}

export const MarkdownLink: React.FC<MarkdownLinkProps> = ({
  href,
  children,
  style,
  ...props
}) => {
  const theme = useTheme();

  return (
    <a
      {...props}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: theme.palette.primary.main,
        textDecoration: 'none',
        ...style
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.textDecoration = 'underline';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.textDecoration = 'none';
      }}
      data-oid="wswk6df"
    >
      {children}
    </a>
  );
};