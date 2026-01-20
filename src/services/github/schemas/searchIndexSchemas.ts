import { z } from "zod";

const IsoDateStringSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "Invalid ISO date string"
});

const NonEmptyStringSchema = z.string().min(1);

export const SearchIndexBranchEntrySchema = z.object({
  docfindPath: NonEmptyStringSchema,
  hash: NonEmptyStringSchema,
  fileCount: z.number().int().nonnegative().optional(),
  generatedAt: IsoDateStringSchema.optional()
});

export const SearchIndexManifestSchema = z.object({
  schemaVersion: z.literal("docfind-1"),
  generatedAt: IsoDateStringSchema,
  branches: z.record(z.string(), SearchIndexBranchEntrySchema)
});

export type SearchIndexManifest = z.infer<typeof SearchIndexManifestSchema>;
export type SearchIndexBranchEntry = z.infer<typeof SearchIndexBranchEntrySchema>;

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
    const message = error instanceof Error ? error.message : "Unknown manifest validation error";
    return { success: false, error: message };
  }
}
