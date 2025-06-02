import React from "react";
import NativeSEO from "./NativeSEO"; // 导入NativeSEO

// 基础SEO组件属性类型
interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  twitterHandle?: string;
  noindex?: boolean;
  canonical?: string;
}

/**
 * SEO组件 - 用于设置页面的元数据
 * 支持标题、描述、关键词、Open Graph和Twitter Card标签
 * 使用React 19原生元数据支持
 */
const SEO: React.FC<SEOProps> = (props) => {
  return <NativeSEO {...props} data-oid="auibq8i" />;
};

export default SEO;
