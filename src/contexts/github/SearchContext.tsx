import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { getFeaturesConfig } from "../../config";
import { SearchIndexService } from "../../services/searchIndexService";
import {
  PreparedSearchIndexFile,
  SearchIndexMetadata,
  SearchResult,
} from "../../types";
import { logger } from "../../utils";

interface SearchContextValue {
  enabled: boolean;
  searchTerm: string;
  results: SearchResult[];
  loading: boolean;
  error: string | null;
  metadata: SearchIndexMetadata | null;
  hasIndex: boolean;
  search: (term: string) => Promise<void>;
  clear: () => void;
  refreshIndex: () => Promise<void>;
}

const SearchContext = createContext<SearchContextValue | undefined>(undefined);

const scoreToken = (file: PreparedSearchIndexFile, token: string): number => {
  let score = 0;

  if (file.nameLower === token) score += 80;
  if (file.stemLower === token) score += 70;

  if (file.nameLower.startsWith(token)) score += 45;
  if (file.stemLower.startsWith(token)) score += 40;

  if (file.tokens.includes(token)) score += 35;
  if (file.pathLower.includes(token)) score += 25;
  if (file.directoryLower.includes(token)) score += 15;

  if (file.extension === token) score += 20;

  return score;
};

const rankFiles = (
  files: PreparedSearchIndexFile[],
  tokens: string[],
  maxResults: number,
): SearchResult[] => {
  const results: SearchResult[] = [];
  const uniqueTokens = Array.from(new Set(tokens));

  for (const file of files) {
    let totalScore = 0;
    const matchedTokens: string[] = [];

    for (const token of uniqueTokens) {
      const tokenScore = scoreToken(file, token);
      if (tokenScore <= 0) {
        totalScore = 0;
        break;
      }
      totalScore += tokenScore;
      matchedTokens.push(token);
    }

    if (totalScore <= 0) {
      continue;
    }

    // Path depth bonus（越浅路径得分越高）
    totalScore += Math.max(0, 30 - file.segments.length * 3);

    results.push({
      ...file,
      score: totalScore,
      matchedTokens: Array.from(new Set(matchedTokens)),
    });
  }

  results.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    if (a.segments.length !== b.segments.length) {
      return a.segments.length - b.segments.length;
    }

    return a.path.localeCompare(b.path, "en-US");
  });

  return results.slice(0, Math.max(1, maxResults));
};

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const featuresConfig = getFeaturesConfig();
  const searchFeature = featuresConfig.search;
  const enabled = searchFeature?.enabled ?? true;
  const maxResults = Math.max(1, searchFeature?.maxResults ?? 200);

  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<SearchIndexMetadata | null>(null);
  const [files, setFiles] = useState<PreparedSearchIndexFile[]>([]);

  const ensureIndex = useCallback(async () => {
    if (!enabled) {
      throw new Error("搜索功能已禁用");
    }

    if (files.length > 0 && metadata) {
      return { files, metadata };
    }

    const index = await SearchIndexService.getIndex();
    setFiles(index.files);
    setMetadata(index.metadata);
    return index;
  }, [enabled, files, metadata]);

  const performSearch = useCallback(
    async (term: string) => {
      setSearchTerm(term);
      const normalized = term.trim();

      if (!normalized) {
        setResults([]);
        setError(null);
        return;
      }

      if (!enabled) {
        setError("搜索功能已禁用");
        setResults([]);
        return;
      }

      const tokens = normalized.toLowerCase().split(/\s+/).filter(Boolean);
      if (tokens.length === 0) {
        setResults([]);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const index = await ensureIndex();
        const ranked = rankFiles(index.files, tokens, maxResults);
        setResults(ranked);
      } catch (err: any) {
        const message = err?.message || "搜索索引加载失败";
        logger.error("[SearchProvider] 搜索失败", err);
        setError(message);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [enabled, ensureIndex, maxResults],
  );

  const clear = useCallback(() => {
    setSearchTerm("");
    setResults([]);
    setError(null);
  }, []);

  const refreshIndex = useCallback(async () => {
    if (!enabled) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const index = await SearchIndexService.getIndex(true);
      setFiles(index.files);
      setMetadata(index.metadata);

      if (searchTerm.trim()) {
        const tokens = searchTerm
          .trim()
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean);
        if (tokens.length > 0) {
          setResults(rankFiles(index.files, tokens, maxResults));
        }
      }
    } catch (err: any) {
      const message = err?.message || "刷新搜索索引失败";
      logger.error("[SearchProvider] 刷新索引失败", err);
      setError(message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, maxResults, searchTerm]);

  const contextValue = useMemo<SearchContextValue>(
    () => ({
      enabled,
      searchTerm,
      results,
      loading,
      error,
      metadata,
      hasIndex: files.length > 0,
      search: performSearch,
      clear,
      refreshIndex,
    }),
    [enabled, searchTerm, results, loading, error, metadata, files.length, performSearch, clear, refreshIndex],
  );

  return (
    <SearchContext.Provider value={contextValue}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = (): SearchContextValue => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearch 必须在 SearchProvider 内使用");
  }
  return context;
};
