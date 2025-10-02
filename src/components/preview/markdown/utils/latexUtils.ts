import React from "react";
import type { PropsWithChildren, ReactElement, HTMLAttributes, ClassAttributes } from "react";
import { countLatexElements } from "@/utils/rendering/latexOptimizer";
import { logger } from "@/utils";

/**
 * 检测LaTeX公式数量
 */
export const checkLatexCount = (
  markdownRef: React.RefObject<HTMLDivElement | null>,
  setLatexCount: (count: number) => void
): void => {
  window.setTimeout(() => {
    if (markdownRef.current === null) {
      return;
    }

    const count = countLatexElements();
    setLatexCount(count);

    if (count > 50) {
      logger.warn(`检测到${String(count)}个LaTeX公式，已启用性能优化模式`);
    }
  }, 500);
};

interface LatexCodeProps extends ClassAttributes<HTMLElement>, HTMLAttributes<HTMLElement> {
  inline?: boolean;
  className?: string | undefined;
}

export const createLatexCodeHandler = (): (props: PropsWithChildren<LatexCodeProps>) => ReactElement => {
  return ({ inline = false, className, children, ...rest }: PropsWithChildren<LatexCodeProps>) => {
    const normalizedClassName = typeof className === "string" ? className : "";
    const match = /language-(\w+)/.exec(normalizedClassName);
    const language = match?.[1]?.toLowerCase();
    const isLatexLanguage = language !== undefined && ["math", "latex", "tex"].includes(language);
    const isLatexBlock = !inline && isLatexLanguage;

    const flattenedChildren = React.Children.toArray(children ?? []);
    const childText = flattenedChildren
      .map((child) => (typeof child === "string" ? child : ""))
      .join("");
    const normalizedContent = childText.replace(/\n$/, "");
    const hasLineBreak = normalizedContent.includes("\n");
    const shouldRenderAsBlock = !isLatexBlock && !inline && (language !== undefined || hasLineBreak);

    const codeClassName = normalizedClassName.length > 0 ? normalizedClassName : undefined;

    if (isLatexBlock) {
      return React.createElement(
        "div",
        {
          className: "math math-display",
          style: { overflowX: "auto", padding: "0.5em 0" },
          "data-oid": "g0ievsv",
        },
        normalizedContent,
      );
    }

    if (shouldRenderAsBlock) {
      return React.createElement(
        "pre",
        {
          className: codeClassName,
          tabIndex: 0,
          "data-language": language ?? undefined,
          "data-oid": "b48y9g3",
        },
        React.createElement(
          "code",
          {
            className: codeClassName,
            ...rest,
          },
          normalizedContent,
        ),
      );
    }

    return React.createElement(
      "code",
      {
        className: codeClassName,
        ...rest,
        "data-oid": "nzwnmt7",
      },
      children,
    );
  };
};
