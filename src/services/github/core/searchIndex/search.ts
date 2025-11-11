import { getSearchIndexConfig } from '@/config';

import type { SearchIndexDocument, SearchIndexFileEntry } from '../../schemas';
import { createSearchIndexError, SearchIndexErrorCode } from './errors';
import { fetchManifest, loadIndexDocument } from './fetchers';

export interface SearchIndexSearchOptions {
  keyword: string;
  branches?: string[];
  pathPrefix?: string;
  extensions?: string[];
  limit?: number;
  signal?: AbortSignal;
}

export interface SearchIndexResultItem {
  branch: string;
  path: string;
  name: string;
  extension?: string;
  size?: number;
  binary?: boolean;
  htmlUrl?: string;
  downloadUrl?: string;
  commit: string;
  shortCommit: string;
  score: number;
  snippet?: string;
}

function normalizeExtensions(extensions?: string[]): Set<string> | null {
  if (extensions === undefined) {
    return null;
  }
  const normalized = extensions
    .map(ext => ext.trim().toLowerCase())
    .filter(ext => ext.length > 0)
    .map(ext => (ext.startsWith('.') ? ext.slice(1) : ext));
  return normalized.length > 0 ? new Set(normalized) : null;
}

function scoreMatch(entry: SearchIndexFileEntry, keyword: string): {
  matched: boolean;
  score: number;
  snippet?: string;
} {
  const normalizedKeyword = keyword.toLowerCase();
  let score = 0;
  let snippet: string | undefined;

  const pathLower = entry.path.toLowerCase();
  const nameLower = entry.name.toLowerCase();

  if (nameLower.includes(normalizedKeyword)) {
    score += 5;
  }

  if (pathLower.includes(normalizedKeyword)) {
    score += 3;
  }

  if (Array.isArray(entry.tokens) && entry.tokens.some(token => token.toLowerCase() === normalizedKeyword)) {
    score += 2;
  }

  if (Array.isArray(entry.fragments)) {
    const matchedFragment = entry.fragments.find(fragment =>
      fragment.snippet.toLowerCase().includes(normalizedKeyword)
    );
    if (matchedFragment !== undefined) {
      score += 1;
      snippet = matchedFragment.snippet;
    }
  }

  if (typeof entry.scoreBoost === 'number') {
    score += entry.scoreBoost;
  }

  const matched = score > 0;
  const result: { matched: boolean; score: number; snippet?: string } = { matched, score };
  if (snippet !== undefined) {
    result.snippet = snippet;
  }
  return result;
}

function collectBranchResults(
  branch: string,
  documents: SearchIndexDocument[],
  keyword: string,
  extensionFilter: Set<string> | null,
  pathPrefix: string,
  limit: number,
  results: SearchIndexResultItem[]
): void {
  for (const document of documents) {
    for (const entry of document.files) {
      if (entry.type !== 'file') {
        continue;
      }

      if (pathPrefix.length > 0 && !entry.path.toLowerCase().startsWith(pathPrefix)) {
        continue;
      }

      if (extensionFilter !== null) {
        const extension = entry.extension?.toLowerCase() ?? '';
        if (!extensionFilter.has(extension)) {
          continue;
        }
      }

      const { matched, score, snippet } = scoreMatch(entry, keyword);
      if (!matched) {
        continue;
      }

      const resultItem: SearchIndexResultItem = {
        branch,
        path: entry.path,
        name: entry.name,
        commit: document.commit,
        shortCommit: document.shortCommit,
        score
      };

      if (entry.extension !== undefined) {
        resultItem.extension = entry.extension;
      }

      if (entry.size !== undefined) {
        resultItem.size = entry.size;
      }

      if (entry.binary !== undefined) {
        resultItem.binary = entry.binary;
      }

      if (entry.htmlUrl !== undefined) {
        resultItem.htmlUrl = entry.htmlUrl;
      }

      if (entry.downloadUrl !== undefined) {
        resultItem.downloadUrl = entry.downloadUrl;
      }

      if (snippet !== undefined) {
        resultItem.snippet = snippet;
      }

      results.push(resultItem);

      if (results.length >= limit) {
        return;
      }
    }

    if (results.length >= limit) {
      return;
    }
  }
}

export async function searchIndex(options: SearchIndexSearchOptions): Promise<SearchIndexResultItem[]> {
  const config = getSearchIndexConfig();
  if (!config.enabled) {
    throw createSearchIndexError(SearchIndexErrorCode.DISABLED, 'Search index feature is disabled');
  }

  const keyword = options.keyword.trim();
  if (keyword.length === 0) {
    return [];
  }

  const manifest = await fetchManifest(options.signal);
  const manifestDefaultBranch = manifest.repository.defaultBranch.trim().length > 0
    ? manifest.repository.defaultBranch
    : config.defaultBranch;

  const requestedBranches = options.branches !== undefined && options.branches.length > 0
    ? options.branches
    : [manifestDefaultBranch];

  const normalizedBranches = requestedBranches
    .map(branch => branch.trim())
    .filter(branch => branch.length > 0)
    .filter(branch => branch !== config.indexBranch);

  let candidateBranches = Array.from(new Set(normalizedBranches));
  if (candidateBranches.length === 0) {
    candidateBranches = Object.keys(manifest.branches);
  }

  const indexedBranches = candidateBranches.filter(branch => manifest.branches[branch] !== undefined);
  if (indexedBranches.length === 0) {
    throw createSearchIndexError(
      SearchIndexErrorCode.INDEX_BRANCH_NOT_INDEXED,
      'No indexed branches found for search request',
      { branch: candidateBranches.join(', ') }
    );
  }

  const extensionFilter = normalizeExtensions(options.extensions);
  const pathPrefix = options.pathPrefix?.trim().toLowerCase() ?? '';
  const limit = options.limit ?? 100;

  const results: SearchIndexResultItem[] = [];

  for (const branch of indexedBranches) {
    const branchInfo = manifest.branches[branch];
    if (branchInfo === undefined) {
      continue;
    }

    const documents: SearchIndexDocument[] = [];
    for (const descriptor of branchInfo.indexFiles) {
      const document = await loadIndexDocument(descriptor, config.indexBranch, options.signal);
      documents.push(document);
    }

    collectBranchResults(
      branch,
      documents,
      keyword,
      extensionFilter,
      pathPrefix,
      limit,
      results
    );

    if (results.length >= limit) {
      break;
    }
  }

  results.sort((a, b) => {
    const scoreDiff = b.score - a.score;
    if (scoreDiff !== 0) {
      return scoreDiff;
    }
    return a.path.localeCompare(b.path);
  });

  return results.slice(0, limit);
}

