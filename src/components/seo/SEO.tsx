import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useSEO } from '../../contexts/SEOContext';

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
 */
const SEO: React.FC<SEOProps> = ({
  title,
  description,
  keywords,
  ogImage,
  twitterHandle,
  noindex = false,
  canonical,
}) => {
  // 从SEO上下文获取当前SEO状态
  const seo = useSEO();
  
  // 使用传入的值，如果没有则使用上下文中的默认值
  const metaTitle = title || seo.title;
  const metaDescription = description || seo.description;
  const metaKeywords = keywords || seo.keywords;
  const metaOgImage = ogImage || seo.ogImage;
  const metaTwitterHandle = twitterHandle || seo.twitterHandle;
  
  // 确保ogImage是完整URL
  const fullOgImageUrl = metaOgImage.startsWith('http') 
    ? metaOgImage 
    : `${window.location.origin}${metaOgImage}`;

  // 获取当前规范URL（canonical）
  const siteUrl = window.location.origin;
  const canonicalUrl = canonical || window.location.href;
  
  return (
    <Helmet>
      {/* 基本元标签 */}
      <title>{metaTitle}</title>
      <meta name="description" content={metaDescription} />
      {metaKeywords && <meta name="keywords" content={metaKeywords} />}
      
      {/* 规范链接和索引控制 */}
      <link rel="canonical" href={canonicalUrl} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Open Graph标签 - 用于社交媒体分享 */}
      <meta property="og:title" content={metaTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={fullOgImageUrl} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={metaTitle} />
      
      {/* Twitter Card标签 */}
      <meta name="twitter:card" content="summary_large_image" />
      {metaTwitterHandle && <meta name="twitter:creator" content={metaTwitterHandle} />}
      <meta name="twitter:title" content={metaTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={fullOgImageUrl} />
      
      {/* 其他常用元标签 */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="language" content="Chinese" />
    </Helmet>
  );
};

export default SEO; 