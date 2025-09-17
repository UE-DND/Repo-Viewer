import React, { createContext, useState, useContext, ReactNode } from "react";
import { getSiteConfig } from '../../config/ConfigManager';

// SEO默认值从统一配置获取
const siteConfig = getSiteConfig();
const DEFAULT_TITLE = siteConfig.title;
const DEFAULT_DESCRIPTION = siteConfig.description;
const DEFAULT_KEYWORDS = siteConfig.keywords;
const DEFAULT_OG_IMAGE = siteConfig.ogImage;

// SEO上下文类型定义
interface MetadataContextType {
  title: string;
  description: string;
  keywords: string;
  ogImage: string;
  setTitle: (title: string) => void;
  setDescription: (description: string) => void;
  setKeywords: (keywords: string) => void;
  setOgImage: (ogImage: string) => void;
  resetMetadata: () => void;
  updateMetadata: (data: Partial<MetadataData>) => void;
}

interface MetadataData {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
}

// 创建SEO上下文
export const MetadataContext = createContext<MetadataContextType | null>(null);

// SEO提供者组件属性类型
interface MetadataProviderProps {
  children: ReactNode;
}

// SEO提供者组件
export const MetadataProvider: React.FC<MetadataProviderProps> = ({
  children,
}) => {
  const [title, setTitle] = useState<string>(DEFAULT_TITLE);
  const [description, setDescription] = useState<string>(DEFAULT_DESCRIPTION);
  const [keywords, setKeywords] = useState<string>(DEFAULT_KEYWORDS);
  const [ogImage, setOgImage] = useState<string>(DEFAULT_OG_IMAGE);

  // 重置SEO数据到默认值
  const resetMetadata = () => {
    setTitle(DEFAULT_TITLE);
    setDescription(DEFAULT_DESCRIPTION);
    setKeywords(DEFAULT_KEYWORDS);
    setOgImage(DEFAULT_OG_IMAGE);
  };

  // 批量更新SEO数据
  const updateMetadata = (data: Partial<MetadataData>) => {
    if (data.title) setTitle(data.title);
    if (data.description) setDescription(data.description);
    if (data.keywords) setKeywords(data.keywords);
    if (data.ogImage) setOgImage(data.ogImage);
  };

  return (
    <MetadataContext.Provider
      value={{
        title,
        description,
        keywords,
        ogImage,
        setTitle,
        setDescription,
        setKeywords,
        setOgImage,
        resetMetadata,
        updateMetadata,
      }}
      data-oid="2::o-n6"
    >
      {children}
    </MetadataContext.Provider>
  );
};

// 自定义Hook，用于访问SEO上下文
export const useMetadata = () => {
  const context = useContext(MetadataContext);
  if (!context) {
    throw new Error("useMetadata必须在MetadataProvider内部使用");
  }
  return context;
};

export default MetadataProvider;
