import axios from "axios";
import { getFeaturesConfig, getGithubConfig } from "../config";
import { logger } from "../utils";
import {
  PreparedSearchIndex,
  PreparedSearchIndexFile,
  SearchIndexData,
  SearchIndexManifest,
  SearchIndexManifestEntry,
  SearchIndexMetadata,
} from "../types";

const ABSOLUTE_URL_REGEX = /^https?:\/\//i;

type RawSearchIndexFile = Partial<PreparedSearchIndexFile> & Record<string, unknown>;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const sanitizePath = (value: unknown): string => {
  if (!isNonEmptyString(value)) {
    return "";
  }
  return value.trim().replace(/^\/+/, "");
};

const deriveSegmentsFromPath = (path: string): string[] =>
  path
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

const deriveExtensionFromName = (name: string): string => {
  const lastDotIndex = name.lastIndexOf(".");
  if (lastDotIndex <= 0 || lastDotIndex === name.length - 1) {
    return "";
  }
  return name.slice(lastDotIndex + 1).toLowerCase();
};

const deriveStemFromName = (name: string, extension: string): string => {
  if (!extension) {
    return name;
  }
  const suffix = `.${extension}`.toLowerCase();
  if (name.toLowerCase().endsWith(suffix)) {
    return name.slice(0, -suffix.length) || name;
  }
  return name;
};

const normalizeSearchIndexFile = (rawFile: RawSearchIndexFile): PreparedSearchIndexFile => {
  const path = sanitizePath((rawFile.path as string | undefined) ?? "");
  const rawSegments: string[] = Array.isArray(rawFile.segments)
    ? (rawFile.segments as unknown[]).filter((segment): segment is string => isNonEmptyString(segment))
    : deriveSegmentsFromPath(path);

  const fallbackSegment = rawSegments.length > 0 ? rawSegments[rawSegments.length - 1] : "";
  const name: string = isNonEmptyString(rawFile.name)
    ? rawFile.name.trim()
    : fallbackSegment || path || "unknown";

  if (!name && !path) {
    throw new Error("索引条目缺少必要的路径信息");
  }

  const directory: string = isNonEmptyString(rawFile.directory)
    ? rawFile.directory.trim()
    : rawSegments.length > 1
      ? rawSegments.slice(0, -1).join("/")
      : "";

  const rawExtensionValue = isNonEmptyString(rawFile.extension)
    ? rawFile.extension.replace(/^\./, "").toLowerCase()
    : "";
  const extension: string = rawExtensionValue || deriveExtensionFromName(name);

  const stemFromField = isNonEmptyString(rawFile.stem) ? rawFile.stem.trim() : "";
  const stem: string = stemFromField || deriveStemFromName(name, extension);

  const lastModifiedValue = isNonEmptyString(rawFile.lastModified) ? rawFile.lastModified : "";
  const lastModified: string = lastModifiedValue || "";

  const sizeValue = (rawFile as { size?: unknown }).size;
  const size: number =
    typeof sizeValue === "number" && Number.isFinite(sizeValue)
      ? sizeValue
      : Number.parseInt(String(sizeValue ?? "0"), 10) || 0;

  const segments: string[] = rawSegments.length > 0 ? rawSegments : deriveSegmentsFromPath(name);

  const hadMissingFields =
    !rawFile.name || !rawFile.directory || !rawFile.extension || !rawFile.stem || !rawFile.segments;

  if (hadMissingFields) {
    logger.debug(
      `[SearchIndexService] 自动填充缺失的索引字段: ${name || path}`,
      {
        hasName: Boolean(rawFile.name),
        hasDirectory: Boolean(rawFile.directory),
        hasExtension: Boolean(rawFile.extension),
        hasStem: Boolean(rawFile.stem),
        hasSegments: Array.isArray(rawFile.segments),
      },
    );
  }

  const tokens = tokenize(name, directory, stem, extension, ...segments);

  const resolvedPath = path || name;

  return {
    ...(rawFile as PreparedSearchIndexFile),
    path: resolvedPath,
    name,
    directory,
    extension,
    stem,
    segments,
    size,
    lastModified,
    nameLower: name.toLowerCase(),
    pathLower: resolvedPath.toLowerCase(),
    directoryLower: directory.toLowerCase(),
    stemLower: stem.toLowerCase(),
    tokens,
  };
};



let cachedIndex: PreparedSearchIndex | null = null;
let loadingPromise: Promise<PreparedSearchIndex> | null = null;
let cachedManifest: SearchIndexManifest | null = null;
let manifestPromise: Promise<SearchIndexManifest> | null = null;

const sanitizeBranch = (branch: string): string =>
  branch.replace(/[\/]/g, "_") || "unknown-branch";

const normalizeBase = (base?: string | null): string | null => {
  if (!base) {
    return null;
  }
  const trimmed = base.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.replace(/\/+$/, "");
};

const buildRawUrl = (branch: string, path: string): string => {
  const { repoOwner, repoName } = getGithubConfig();
  const normalizedPath = path.replace(/^\/+/, "");
  return `https://raw.githubusercontent.com/${repoOwner}/${repoName}/${branch}/${normalizedPath}`;
};

const fetchJson = async <T>(url: string): Promise<T> => {
  const response = await axios.get<T>(url, {
    headers: {
      Accept: "application/json",
    },
  });
  return response.data;
};

const fetchWithFallback = async <T>(urls: string[]): Promise<T> => {
  let lastError: unknown = null;

  for (const url of urls) {
    try {
      const data = await fetchJson<T>(url);
      logger.debug(`[SearchIndexService] 已加载资源: ${url}`);
      return data;
    } catch (error) {
      lastError = error;
      logger.warn(`[SearchIndexService] 资源加载失败: ${url}`, error);
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new Error("无法加载搜索索引资源");
};

const fetchManifest = async (force = false): Promise<SearchIndexManifest> => {
  if (cachedManifest && !force) {
    return cachedManifest;
  }

  if (manifestPromise && !force) {
    return manifestPromise;
  }

  const featuresConfig = getFeaturesConfig();

  const indexBranch = featuresConfig.search?.branch ?? "RV-Index";
  const manifestPath = featuresConfig.search?.manifestPath ?? "manifest.json";
  const fallbackBase = normalizeBase(featuresConfig.search?.fallbackRawUrl);

  const urls: string[] = [buildRawUrl(indexBranch, manifestPath)];

  if (fallbackBase) {
    const normalizedPath = manifestPath.replace(/^\/+/, "");
    urls.push(`${fallbackBase}/${normalizedPath}`);
  }

  const promise = fetchWithFallback<SearchIndexManifest>(urls)
    .then((manifest) => {
      cachedManifest = manifest;
      return manifest;
    })
    .finally(() => {
      manifestPromise = null;
    });

  manifestPromise = promise;
  return promise;
};

const resolveManifestEntry = async (force = false): Promise<SearchIndexManifestEntry> => {
  const manifest = await fetchManifest(force);
  const githubConfig = getGithubConfig();
  const branch = githubConfig.repoBranch || "main";
  const key = sanitizeBranch(branch);
  const entry = manifest[key];

  if (!entry) {
    throw new Error(`未在 RV-Index 分支中找到与分支 ${branch} 对应的索引文件`);
  }

  return entry;
};

const tokenize = (...values: string[]): string[] => {
  const tokenSet = new Set<string>();

  values
    .filter(Boolean)
    .map((value) => value.toLowerCase())
    .forEach((value) => {
      value
        .split(/[^a-z0-9\u4e00-\u9fa5]+/i)
        .map((token) => token.trim())
        .filter(Boolean)
        .forEach((token) => tokenSet.add(token));
    });

  return Array.from(tokenSet);
};

const prepareIndex = (data: SearchIndexData): PreparedSearchIndex => {
  const { files, version, generatedAt, branch, repository, summary, source } = data;

  const metadata: SearchIndexMetadata = {
    version,
    generatedAt,
    branch,
    repository,
    summary,
    ...(source ? { source } : {}),
  };

  const rawFiles = files as RawSearchIndexFile[];
  const preparedFiles: PreparedSearchIndexFile[] = rawFiles.map(normalizeSearchIndexFile);

  return {
    metadata,
    files: preparedFiles,
  };
};

const fetchIndex = async (force = false): Promise<PreparedSearchIndex> => {
  const featuresConfig = getFeaturesConfig();
  const indexBranch = featuresConfig.search?.branch ?? "RV-Index";
  const fallbackBase = normalizeBase(featuresConfig.search?.fallbackRawUrl);

  const entry = await resolveManifestEntry(force);
  const filePath = entry.file;
  const urls: string[] = [];

  if (ABSOLUTE_URL_REGEX.test(filePath)) {
    urls.push(filePath);
  } else {
    let normalizedPath = filePath.replace(/^\/+/, "");
    const basePath = featuresConfig.search?.basePath ?? "indexes";
    if (!normalizedPath.includes("/") && basePath) {
      const normalizedBase = basePath.replace(/^\/+|\/+$/g, "");
      normalizedPath = normalizedBase ? `${normalizedBase}/${normalizedPath}` : normalizedPath;
    }

    urls.push(buildRawUrl(indexBranch, normalizedPath));
    if (fallbackBase) {
      urls.push(`${fallbackBase}/${normalizedPath}`);
    }
  }

  const data = await fetchWithFallback<SearchIndexData>(urls);
  return prepareIndex(data);
};

export const SearchIndexService = {
  async getIndex(force = false): Promise<PreparedSearchIndex> {
    if (!force && cachedIndex) {
      return cachedIndex;
    }

    if (!force && loadingPromise) {
      return loadingPromise;
    }

    if (force) {
      cachedIndex = null;
      cachedManifest = null;
      manifestPromise = null;
    }

    const promise = fetchIndex(force)
      .then((result) => {
        cachedIndex = result;
        return result;
      })
      .finally(() => {
        loadingPromise = null;
      });

    loadingPromise = promise;
    return promise;
  },

  clearCache(): void {
    cachedIndex = null;
    cachedManifest = null;
    loadingPromise = null;
    manifestPromise = null;
  },
};
