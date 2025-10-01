import React, { useState, type ReactNode } from "react";
import {
  MetadataContext,
  type MetadataData,
  DEFAULT_METADATA,
} from "./context";

// SEO提供者组件属性类型
interface MetadataProviderProps {
  children: ReactNode;
}

// SEO提供者组件
export const MetadataProvider: React.FC<MetadataProviderProps> = ({
  children,
}) => {
  const [title, setTitle] = useState<string>(DEFAULT_METADATA.title);
  const [description, setDescription] = useState<string>(
    DEFAULT_METADATA.description,
  );
  const [keywords, setKeywords] = useState<string>(DEFAULT_METADATA.keywords);
  const [ogImage, setOgImage] = useState<string>(DEFAULT_METADATA.ogImage);

  // 重置SEO数据到默认值
  const resetMetadata = () => {
  setTitle(DEFAULT_METADATA.title);
  setDescription(DEFAULT_METADATA.description);
  setKeywords(DEFAULT_METADATA.keywords);
  setOgImage(DEFAULT_METADATA.ogImage);
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

export default MetadataProvider;
