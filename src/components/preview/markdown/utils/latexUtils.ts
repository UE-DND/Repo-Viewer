import React from "react";
import { countLatexElements } from "@/utils/rendering/latexOptimizer";
import { logger } from '@/utils';

/**
 * 检测LaTeX公式数量
 */
export const checkLatexCount = (
  markdownRef: React.RefObject<HTMLDivElement | null>,
  setLatexCount: (count: number) => void
) => {
  // 延迟检测，等待渲染完成
  setTimeout(() => {
    if (markdownRef.current) {
      const count = countLatexElements();
      setLatexCount(count);

      // 如果公式数量很多，在控制台提示
      if (count > 50) {
        logger.warn(`检测到${count}个LaTeX公式，已启用性能优化模式`);
      }
    }
  }, 500);
};

/**
 * 创建LaTeX代码块处理器
 */
export const createLatexCodeHandler = () => {
  return ({
    inline,
    className = "",
    children,
    ...props
  }: any) => {
    const match = /language-(\w+)/.exec(className);
    const language = match?.[1]?.toLowerCase();
    const isLatexBlock =
      !inline && Boolean(language && ["math", "latex", "tex"].includes(language));

    const childText = React.Children.toArray(children)
      .map((child) => (typeof child === "string" ? child : ""))
      .join("");
    const normalizedContent = childText.replace(/\n$/, "");
    const hasLineBreak = normalizedContent.includes("\n");
    const shouldRenderAsBlock =
      !isLatexBlock && !inline && (Boolean(language) || hasLineBreak);

    if (isLatexBlock) {
      return React.createElement(
        "div",
        {
          className: "math math-display",
          style: { overflowX: "auto", padding: "0.5em 0" },
          "data-oid": "g0ievsv"
        },
        String(children).replace(/\n$/, "")
      );
    }

    if (shouldRenderAsBlock) {
      return React.createElement(
        "pre",
        {
          className: className || undefined,
          tabIndex: 0,
          "data-language": language || undefined,
          "data-oid": "b48y9g3"
        },
        React.createElement(
          "code",
          {
            className,
            ...props
          },
          normalizedContent
        )
      );
    }

    return React.createElement(
      "code",
      {
        className: className || undefined,
        ...props,
        "data-oid": "nzwnmt7"
      },
      children
    );
  };
};
