export const enum SearchIndexErrorCode {
  DISABLED = 'SEARCH_INDEX_DISABLED',
  MANIFEST_NOT_FOUND = 'SEARCH_INDEX_MANIFEST_NOT_FOUND',
  MANIFEST_INVALID = 'SEARCH_INDEX_MANIFEST_INVALID',
  INDEX_BRANCH_MISSING = 'SEARCH_INDEX_BRANCH_MISSING',
  INDEX_FILE_NOT_FOUND = 'SEARCH_INDEX_FILE_NOT_FOUND',
  INDEX_DOCUMENT_INVALID = 'SEARCH_INDEX_DOCUMENT_INVALID',
  INDEX_BRANCH_NOT_INDEXED = 'SEARCH_INDEX_BRANCH_NOT_INDEXED',
  UNSUPPORTED_COMPRESSION = 'SEARCH_INDEX_UNSUPPORTED_COMPRESSION'
}

export interface SearchIndexErrorDetails {
  status?: number;
  branch?: string;
  path?: string;
  compression?: string;
  cause?: unknown;
}

export class SearchIndexError extends Error {
  readonly code: SearchIndexErrorCode;
  readonly details?: SearchIndexErrorDetails;

  constructor(code: SearchIndexErrorCode, message: string, details?: SearchIndexErrorDetails) {
    super(message);
    this.code = code;
    if (details !== undefined) {
      this.details = details;
    }
    this.name = 'SearchIndexError';
  }
}

export function createSearchIndexError(
  code: SearchIndexErrorCode,
  message: string,
  details?: SearchIndexErrorDetails
): SearchIndexError {
  return new SearchIndexError(code, message, details);
}

