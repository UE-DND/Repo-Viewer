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
  schemaVersion: z.literal('2.0'),
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

export const SearchIndexFileEntrySchema = NonEmptyStringSchema;

const SearchIndexInvertedIndexSchema = z.object({
  tokens: z.record(z.string(), z.array(z.number().int().nonnegative()))
});

export const SearchIndexStatsSchema = z.object({
  fileCount: z.number().int().nonnegative()
});

export const SearchIndexDocumentSchema = z.object({
  schemaVersion: z.literal('2.0'),
  branch: NonEmptyStringSchema,
  commit: NonEmptyStringSchema,
  shortCommit: NonEmptyStringSchema,
  generatedAt: IsoDateStringSchema,
  generator: z.object({
    name: NonEmptyStringSchema,
    version: z.string().optional()
  }).optional(),
  baseUrls: z.object({
    raw: z.url(),
    html: z.url()
  }).optional(),
  invertedIndex: SearchIndexInvertedIndexSchema,
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
