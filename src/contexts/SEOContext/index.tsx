import React, { createContext, useState, useContext, ReactNode } from 'react';
import { HelmetProvider } from 'react-helmet-async';

// SEO默认值从环境变量获取
const DEFAULT_TITLE = import.meta.env.VITE_SITE_TITLE || 'Repo-Viewer';
const DEFAULT_DESCRIPTION = import.meta.env.VITE_SITE_DESCRIPTION || '基于MD3设计语言的GitHub仓库浏览应用';
const DEFAULT_KEYWORDS = import.meta.env.VITE_SITE_KEYWORDS || 'GitHub, 仓库, 浏览器, 代码, 查看器';
const DEFAULT_OG_IMAGE = import.meta.env.VITE_SITE_OG_IMAGE || '/repo-viewer-icon.svg';
const DEFAULT_TWITTER_HANDLE = import.meta.env.VITE_SITE_TWITTER_HANDLE || '';

// SEO上下文类型定义
interface SEOContextType {
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
  resetSEO: () => void;
  updateSEO: (data: Partial<SEOData>) => void;
}

interface SEOData {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  twitterHandle?: string;
}

// 创建SEO上下文
export const SEOContext = createContext<SEOContextType | null>(null);

// SEO提供者组件属性类型
interface SEOProviderProps {
  children: ReactNode;
}

// SEO提供者组件
export const SEOProvider: React.FC<SEOProviderProps> = ({ children }) => {
  const [title, setTitle] = useState<string>(DEFAULT_TITLE);
  const [description, setDescription] = useState<string>(DEFAULT_DESCRIPTION);
  const [keywords, setKeywords] = useState<string>(DEFAULT_KEYWORDS);
  const [ogImage, setOgImage] = useState<string>(DEFAULT_OG_IMAGE);
  const [twitterHandle, setTwitterHandle] = useState<string>(DEFAULT_TWITTER_HANDLE);

  // 重置SEO数据到默认值
  const resetSEO = () => {
    setTitle(DEFAULT_TITLE);
    setDescription(DEFAULT_DESCRIPTION);
    setKeywords(DEFAULT_KEYWORDS);
    setOgImage(DEFAULT_OG_IMAGE);
    setTwitterHandle(DEFAULT_TWITTER_HANDLE);
  };

  // 批量更新SEO数据
  const updateSEO = (data: Partial<SEOData>) => {
    if (data.title) setTitle(data.title);
    if (data.description) setDescription(data.description);
    if (data.keywords) setKeywords(data.keywords);
    if (data.ogImage) setOgImage(data.ogImage);
    if (data.twitterHandle) setTwitterHandle(data.twitterHandle);
  };

  return (
    <SEOContext.Provider
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
        resetSEO,
        updateSEO,
      }}
    >
      <HelmetProvider>
        {children}
      </HelmetProvider>
    </SEOContext.Provider>
  );
};

// 自定义Hook，用于访问SEO上下文
export const useSEO = () => {
  const context = useContext(SEOContext);
  if (!context) {
    throw new Error('useSEO必须在SEOProvider内部使用');
  }
  return context;
};

export default SEOProvider; 