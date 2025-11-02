import { useState, useRef, useCallback, useEffect } from "react";

interface UseFallbackDialogProps {
  search: {
    searchLoading: boolean;
    searchResult: {
      mode: string;
      items: unknown[];
      completedAt: number;
    } | null;
    keyword: string;
  };
}

export const useFallbackDialog = ({ search }: UseFallbackDialogProps): {
  fallbackDialogOpen: boolean;
  openFallbackPrompt: () => void;
  handleFallbackDialogClose: () => void;
} => {
  const [fallbackDialogOpen, setFallbackDialogOpen] = useState(false);
  const fallbackPromptMetaRef = useRef<{ resultId: number | null; dismissed: boolean }>({
    resultId: null,
    dismissed: false
  });

  const openFallbackPrompt = useCallback(() => {
    const currentMeta = fallbackPromptMetaRef.current;
    fallbackPromptMetaRef.current = {
      resultId: currentMeta.resultId,
      dismissed: false
    };
    setFallbackDialogOpen(true);
  }, []);

  const handleFallbackDialogClose = useCallback(() => {
    fallbackPromptMetaRef.current = {
      ...fallbackPromptMetaRef.current,
      dismissed: true
    };
    setFallbackDialogOpen(false);
  }, []);

  useEffect(() => {
    if (search.searchLoading || search.searchResult === null) {
      return;
    }

    const { mode, items, completedAt } = search.searchResult;
    const keyword = search.keyword.trim();

    if (mode === 'search-index' && items.length === 0 && keyword.length > 0) {
      const meta = fallbackPromptMetaRef.current;
      if (meta.resultId !== completedAt) {
        fallbackPromptMetaRef.current = {
          resultId: completedAt,
          dismissed: false
        };
      }

      if (!fallbackPromptMetaRef.current.dismissed) {
        setFallbackDialogOpen(true);
      }
    } else {
      fallbackPromptMetaRef.current = {
        resultId: null,
        dismissed: false
      };
      setFallbackDialogOpen(false);
    }
  }, [search.searchLoading, search.searchResult, search.keyword]);

  return {
    fallbackDialogOpen,
    openFallbackPrompt,
    handleFallbackDialogClose
  };
};

