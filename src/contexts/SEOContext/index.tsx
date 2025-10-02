/* eslint-disable react-refresh/only-export-components */
import { MetadataProvider } from "@/contexts/MetadataContext";
import { useMetadata } from "@/contexts/MetadataContext/context";
import { useCallback } from "react";

// 导入需要的类型
interface SEOData {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
}

// 创建一个适配器Hook，提供旧的API接口
export const useSEO = () => {
  const metadata = useMetadata();

  // 添加兼容性方法
  const resetSEO = useCallback(() => {
    metadata.resetMetadata();
  }, [metadata]);

  const updateSEO = useCallback(
    (data: Partial<SEOData>) => {
      metadata.updateMetadata(data);
    },
    [metadata],
  );

  // 返回包含旧方法名的对象
  return {
    ...metadata,
    resetSEO,
    updateSEO,
  };
};

// 导出MetadataProvider作为SEOProvider以保持向后兼容
export { MetadataProvider as SEOProvider };
export default MetadataProvider;
