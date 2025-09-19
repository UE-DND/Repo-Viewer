import axios from "axios";
import { getFeaturesConfig, getGithubConfig } from "../config/ConfigManager";
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

  const preparedFiles: PreparedSearchIndexFile[] = files.map((file) => {
    const nameLower = file.name.toLowerCase();
    const pathLower = file.path.toLowerCase();
    const directoryLower = (file.directory || "").toLowerCase();
    const stemLower = file.stem.toLowerCase();
    const tokens = tokenize(file.name, file.directory, file.stem, file.extension, ...file.segments);

    return {
      ...file,
      nameLower,
      pathLower,
      directoryLower,
      stemLower,
      tokens,
    };
  });

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
