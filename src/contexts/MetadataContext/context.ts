import { createContext, useContext } from "react";
import { getSiteConfig } from "../../config";

export interface MetadataContextType {
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

export interface MetadataData {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
}

const siteConfig = getSiteConfig();

export const DEFAULT_METADATA = {
  title: siteConfig.title,
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  ogImage: siteConfig.ogImage,
};

export const MetadataContext = createContext<MetadataContextType | null>(null);

export const useMetadata = () => {
  const context = useContext(MetadataContext);
  if (!context) {
    throw new Error("useMetadata必须在MetadataProvider内部使用");
  }
  return context;
};
