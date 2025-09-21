// 主组件导出
export { default } from "./MarkdownPreview";

// 类型导出
export type { MarkdownPreviewProps } from "./types";

// 工具函数导出
export { 
  createImageLoadingState,
  transformImageSrc,
  handleImageError,
  handleImageLoad,
  tryDirectImageLoad,
  type ImageLoadingState,
} from "./utils/imageUtils";

export {
  checkLatexCount,
  createLatexCodeHandler,
} from "./utils/latexUtils";

// 配置导出
export { katexOptions, handleKatexError } from "./config/katex";

// 样式导出
export { markdownGlobalStyles } from "./styles/globalStyles";
export { createMarkdownStyles } from "./styles/markdownStyles";

// 组件导出
export { MarkdownImage } from "./components/MarkdownImage";
export { MarkdownLink } from "./components/MarkdownLink";
export { ImageErrorDisplay } from "./components/ImageErrorDisplay";