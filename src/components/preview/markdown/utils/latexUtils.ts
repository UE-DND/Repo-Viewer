import React from "react";
import { countLatexElements } from "../../../../utils/rendering/latexOptimizer";
import { logger } from '../../../../utils';

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

    // 普通代码块
    return React.createElement(
      "code",
      { className, ...props, "data-oid": "nzwnmt7" },
      children
    );
  };
};