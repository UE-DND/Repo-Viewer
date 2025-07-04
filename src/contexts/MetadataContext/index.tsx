import React, { createContext, useState, useContext, ReactNode } from "react";

// SEO默认值从环境变量获取
const DEFAULT_TITLE = import.meta.env.VITE_SITE_TITLE || "Repo-Viewer";
const DEFAULT_DESCRIPTION =
  import.meta.env.VITE_SITE_DESCRIPTION ||
  "基于MD3设计语言的GitHub仓库浏览应用";
const DEFAULT_KEYWORDS =
  import.meta.env.VITE_SITE_KEYWORDS || "GitHub, 仓库, 浏览器, 代码, 查看器";
const DEFAULT_OG_IMAGE =
  import.meta.env.VITE_SITE_OG_IMAGE || "/repo-viewer-icon.svg";
const DEFAULT_TWITTER_HANDLE = import.meta.env.VITE_SITE_TWITTER_HANDLE || "";

// SEO上下文类型定义
interface MetadataContextType {
  title: string;
  description: string;
  keywords: string;
  ogImage: string;
  twitterHandle: string;
  setTitle: (title: string) => void;
  setDescription: (description: string) => void;
  setKeywords: (keywords: string) => void;
  setOgImage: (ogImage: string) => void;
  setTwitterHandle: (twitterHandle: string) => void;
  resetMetadata: () => void;
  updateMetadata: (data: Partial<MetadataData>) => void;
}

interface MetadataData {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  twitterHandle?: string;
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
  const [twitterHandle, setTwitterHandle] = useState<string>(
    DEFAULT_TWITTER_HANDLE,
  );

  // 重置SEO数据到默认值
  const resetMetadata = () => {
    setTitle(DEFAULT_TITLE);
    setDescription(DEFAULT_DESCRIPTION);
    setKeywords(DEFAULT_KEYWORDS);
    setOgImage(DEFAULT_OG_IMAGE);
    setTwitterHandle(DEFAULT_TWITTER_HANDLE);
  };

  // 批量更新SEO数据
  const updateMetadata = (data: Partial<MetadataData>) => {
    if (data.title) setTitle(data.title);
    if (data.description) setDescription(data.description);
    if (data.keywords) setKeywords(data.keywords);
    if (data.ogImage) setOgImage(data.ogImage);
    if (data.twitterHandle) setTwitterHandle(data.twitterHandle);
  };

  return (
    <MetadataContext.Provider
      value={{
        title,
        description,
        keywords,
        ogImage,
        twitterHandle,
        setTitle,
        setDescription,
        setKeywords,
        setOgImage,
        setTwitterHandle,
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
