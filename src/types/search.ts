export interface SearchIndexFile {
  path: string;
  name: string;
  directory: string;
  extension: string;
  size: number;
  lastModified: string;
  segments: string[];
  stem: string;
}

export interface SearchIndexSummary {
  totalFiles: number;
  ignoredDirectories: string[];
  ignoredExtensions: string[];
  maxFileSizeMb: number | null;
}

export interface SearchIndexMetadata {
  version: string;
  generatedAt: string;
  branch: string;
  repository: {
    owner: string;
    name: string;
  };
  summary: SearchIndexSummary;
  source?: {
    branch: string;
    commit: string;
    shortCommit: string;
  };
}

export interface SearchIndexData extends SearchIndexMetadata {
  files: SearchIndexFile[];
}

export interface SearchIndexManifestEntry {
  branch: string;
  sanitizedBranch: string;
  commit: string;
  shortCommit: string;
  file: string;
  generatedAt: string;
}

export type SearchIndexManifest = Record<string, SearchIndexManifestEntry>;

export interface PreparedSearchIndexFile extends SearchIndexFile {
  nameLower: string;
  pathLower: string;
  directoryLower: string;
  stemLower: string;
  tokens: string[];
}

export interface PreparedSearchIndex {
  metadata: SearchIndexMetadata;
  files: PreparedSearchIndexFile[];
}

export interface SearchResult extends SearchIndexFile {
  score: number;
  matchedTokens: string[];
}
