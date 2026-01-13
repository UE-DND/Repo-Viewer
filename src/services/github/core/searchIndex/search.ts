import { getGithubConfig, getSearchIndexConfig } from '@/config';

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

const WORD_TOKEN_PATTERN = /[\p{L}\p{N}_]{2,}/gu;
const HAN_SEQUENCE_PATTERN = /[\p{Script=Han}]+/gu;
const HAN_CHAR_PATTERN = /[\p{Script=Han}]/u;

function resolveEntryName(filePath: string): string {
  return filePath.split('/').pop() ?? filePath;
}

function resolveEntryExtension(filePath: string): string {
  const name = resolveEntryName(filePath);
  const dotIndex = name.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex === name.length - 1) {
    return '';
  }
  return name.slice(dotIndex + 1).toLowerCase();
}

function resolveDocumentBaseUrls(document: SearchIndexDocument): { raw?: string; html?: string } {
  if (document.baseUrls !== undefined) {
    return {
      raw: document.baseUrls.raw,
      html: document.baseUrls.html
    };
  }

  const { repoOwner, repoName } = getGithubConfig();
  if (repoOwner.trim() === '' || repoName.trim() === '') {
    return {};
  }

  const safeOwner = encodeURIComponent(repoOwner);
  const safeRepo = encodeURIComponent(repoName);
  const safeCommit = encodeURIComponent(document.commit);
  return {
    raw: `https://raw.githubusercontent.com/${safeOwner}/${safeRepo}/${safeCommit}`,
    html: `https://github.com/${safeOwner}/${safeRepo}/blob/${safeCommit}`
  };
}

function normalizeToken(token: string): string | undefined {
  const normalized = token.trim().toLowerCase();
  if (normalized.length > 64) {
    return undefined;
  }
  const hasHan = HAN_CHAR_PATTERN.test(normalized);
  const minLength = hasHan ? 2 : 3;
  if (normalized.length < minLength) {
    return undefined;
  }
  return normalized;
}

function tokenizeKeyword(keyword: string): string[] {
  const seen = new Set<string>();
  const matches = keyword.match(WORD_TOKEN_PATTERN);
  if (matches !== null) {
    for (const token of matches) {
      const normalized = normalizeToken(token);
      if (normalized !== undefined && !seen.has(normalized)) {
        seen.add(normalized);
      }
    }
  }

  const hanMatches = keyword.match(HAN_SEQUENCE_PATTERN);
  if (hanMatches !== null) {
    for (const sequence of hanMatches) {
      const chars = [...sequence];
      if (chars.length < 2) {
        continue;
      }
      for (let i = 0; i < chars.length - 1; i += 1) {
        const bigram = `${chars[i]}${chars[i + 1]}`;
        const normalized = normalizeToken(bigram);
        if (normalized !== undefined && !seen.has(normalized)) {
          seen.add(normalized);
        }
      }
    }
  }

  return Array.from(seen);
}

function resolveCandidateIndexes(document: SearchIndexDocument, keyword: string): number[] | null {
  const tokens = tokenizeKeyword(keyword);
  if (tokens.length === 0) {
    return null;
  }

  const index = document.invertedIndex?.tokens;
  if (index === undefined) {
    return null;
  }

  const candidates = new Set<number>();
  for (const token of tokens) {
    const hitList = index[token];
    if (!Array.isArray(hitList)) {
      continue;
    }
    for (const value of hitList) {
      candidates.add(value);
    }
  }

  if (candidates.size === 0) {
    return null;
  }

  return Array.from(candidates);
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
  const nameLower = resolveEntryName(entry.path).toLowerCase();

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
    const baseUrls = resolveDocumentBaseUrls(document);
    const candidateIndexes = resolveCandidateIndexes(document, keyword);
    const candidates = candidateIndexes === null
      ? document.files.map((entry) => entry)
      : candidateIndexes
        .map((index) => document.files[index])
        .filter((entry): entry is SearchIndexFileEntry => entry !== undefined);

    for (const entry of candidates) {
      if (pathPrefix.length > 0 && !entry.path.toLowerCase().startsWith(pathPrefix)) {
        continue;
      }

      if (extensionFilter !== null) {
        const extension = resolveEntryExtension(entry.path);
        if (!extensionFilter.has(extension)) {
          continue;
        }
      }

      const { matched, score, snippet } = scoreMatch(entry, keyword);
      if (!matched) {
        continue;
      }

      const name = resolveEntryName(entry.path);
      const resultItem: SearchIndexResultItem = {
        branch,
        path: entry.path,
        name,
        commit: document.commit,
        shortCommit: document.shortCommit,
        score
      };

      const extension = resolveEntryExtension(entry.path);
      if (extension !== '') {
        resultItem.extension = extension;
      }

      resultItem.size = entry.size;
      resultItem.binary = entry.binary;

      const normalizedPath = entry.path.replace(/^\/+/u, '');
      if (baseUrls.html !== undefined) {
        resultItem.htmlUrl = `${baseUrls.html}/${normalizedPath}`;
      }

      if (baseUrls.raw !== undefined) {
        resultItem.downloadUrl = `${baseUrls.raw}/${normalizedPath}`;
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
