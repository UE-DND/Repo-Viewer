import { useCallback } from "react";
import { useMetadata } from "@/contexts/MetadataContext/context";
import type { MetadataContextType } from "@/contexts/MetadataContext/context";

interface SEOData {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
}

export type UseSEOResult = MetadataContextType & {
  resetSEO: () => void;
  updateSEO: (data: Partial<SEOData>) => void;
};

export const useSEO = (): UseSEOResult => {
  const metadata = useMetadata();

  const resetSEO = useCallback((): void => {
    metadata.resetMetadata();
  }, [metadata]);

  const updateSEO = useCallback(
    (data: Partial<SEOData>): void => {
      metadata.updateMetadata(data);
    },
    [metadata],
  );

  return {
    ...metadata,
    resetSEO,
    updateSEO,
  };
};
