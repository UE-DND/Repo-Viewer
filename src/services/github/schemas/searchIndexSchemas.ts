import { z } from 'zod';

const IsoDateStringSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Invalid ISO date string'
});

const NonEmptyStringSchema = z.string().min(1);

export const SearchIndexFileDescriptorSchema = z.object({
  path: NonEmptyStringSchema,
  sha256: NonEmptyStringSchema.optional(),
  size: z.number().int().nonnegative().optional(),
  fileCount: z.number().int().nonnegative().optional(),
  compression: z.string().optional()
});

export const SearchIndexBranchMetadataSchema = z.object({
  coverage: z.string().optional(),
  notes: z.string().optional()
}).partial();

export const SearchIndexBranchEntrySchema = z.object({
  latestCommit: z.string().length(40, { message: 'latestCommit must be a 40-character SHA' }),
  shortCommit: NonEmptyStringSchema,
  updatedAt: IsoDateStringSchema,
  indexFiles: z.array(SearchIndexFileDescriptorSchema).min(1),
  metadata: SearchIndexBranchMetadataSchema.optional()
});

export const SearchIndexManifestSchema = z.object({
  schemaVersion: NonEmptyStringSchema,
  generatedAt: IsoDateStringSchema,
  generator: z.object({
    name: NonEmptyStringSchema,
    version: z.string().optional()
  }).optional(),
  repository: z.object({
    owner: NonEmptyStringSchema,
    name: NonEmptyStringSchema,
    defaultBranch: NonEmptyStringSchema
  }),
  branches: z.record(z.string(), SearchIndexBranchEntrySchema),
  retention: z.record(z.string(), z.unknown()).optional()
});

const SearchIndexFragmentSchema = z.object({
  offset: z.number().int().nonnegative(),
  length: z.number().int().nonnegative(),
  snippet: z.string(),
  hash: z.string().optional()
});

export const SearchIndexFileEntrySchema = z.object({
  path: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
  type: z.enum(['file', 'dir', 'symlink']).default('file'),
  size: z.number().int().nonnegative().optional(),
  sha: NonEmptyStringSchema,
  extension: z.string().optional(),
  language: z.string().optional(),
  binary: z.boolean().optional(),
  lastModified: IsoDateStringSchema.optional(),
  downloadUrl: z.url().optional(),
  htmlUrl: z.url().optional(),
  fragments: z.array(SearchIndexFragmentSchema).optional(),
  tokens: z.array(z.string()).optional(),
  scoreBoost: z.number().optional()
});

export const SearchIndexStatsSchema = z.object({
  fileCount: z.number().int().nonnegative(),
  textCount: z.number().int().nonnegative().optional(),
  binaryCount: z.number().int().nonnegative().optional(),
  totalSize: z.number().int().nonnegative().optional()
}).partial().refine((value) => Object.keys(value).length > 0, {
  message: 'stats must contain at least one field'
}).optional();

export const SearchIndexDocumentSchema = z.object({
  schemaVersion: NonEmptyStringSchema,
  branch: NonEmptyStringSchema,
  commit: NonEmptyStringSchema,
  shortCommit: NonEmptyStringSchema,
  generatedAt: IsoDateStringSchema,
  generator: z.object({
    name: NonEmptyStringSchema,
    version: z.string().optional()
  }).optional(),
  stats: SearchIndexStatsSchema,
  files: z.array(SearchIndexFileEntrySchema)
});

export type SearchIndexManifest = z.infer<typeof SearchIndexManifestSchema>;
export type SearchIndexBranchEntry = z.infer<typeof SearchIndexBranchEntrySchema>;
export type SearchIndexFileDescriptor = z.infer<typeof SearchIndexFileDescriptorSchema>;
export type SearchIndexDocument = z.infer<typeof SearchIndexDocumentSchema>;
export type SearchIndexFileEntry = z.infer<typeof SearchIndexFileEntrySchema>;

export function safeValidateSearchIndexManifest(data: unknown): {
  success: true;
  data: SearchIndexManifest;
} | {
  success: false;
  error: string;
} {
  try {
    const manifest = SearchIndexManifestSchema.parse(data);
    return { success: true, data: manifest };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown manifest validation error';
    return { success: false, error: message };
  }
}

export function safeValidateSearchIndexDocument(data: unknown): {
  success: true;
  data: SearchIndexDocument;
} | {
  success: false;
  error: string;
} {
  try {
    const document = SearchIndexDocumentSchema.parse(data);
    return { success: true, data: document };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown index validation error';
    return { success: false, error: message };
  }
}
