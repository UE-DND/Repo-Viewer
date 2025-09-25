import { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";
import {
  safeValidateGitHubContentsResponse,
  safeValidateGitHubSearchResponse,
} from "../src/services/github/schemas/apiSchemas";
import { CONFIG_DEFAULTS } from "../src/config/constants";

// GitHub API 常量
const GITHUB_API_BASE = "https://api.github.com";

const parseBooleanFlag = (value?: string | null): boolean => {
  if (typeof value !== "string") {
    return false;
  }
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
};

const resolveBooleanFlag = (keys: string[]): boolean =>
  keys.some((key) => parseBooleanFlag(process.env[key]));

const developerModeEnabled = resolveBooleanFlag(["DEVELOPER_MODE", "VITE_DEVELOPER_MODE"]);
const consoleLoggingEnabled = resolveBooleanFlag(["CONSOLE_LOGGING", "VITE_CONSOLE_LOGGING"]);

type LogLevel = "info" | "warn" | "error";

const shouldLog = (level: LogLevel): boolean => {
  switch (level) {
    case "info":
      return developerModeEnabled;
    case "warn":
    case "error":
      return developerModeEnabled || consoleLoggingEnabled;
    default:
      return developerModeEnabled;
  }
};

const apiLogger = {
  info: (...args: unknown[]) => {
    if (shouldLog("info")) {
      console.log("[API]", ...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (shouldLog("warn")) {
      console.warn("[API]", ...args);
    }
  },
  error: (...args: unknown[]) => {
    if (shouldLog("error")) {
      console.error("[API]", ...args);
    }
  },
};

// GitHub Token 管理器
class GitHubTokenManager {
  private tokens: string[] = [];
  private currentIndex = 0;
  private failedTokens: Set<string> = new Set();

  constructor() {
    this.loadTokensFromEnv();
  }

  private loadTokensFromEnv(): void {
    this.tokens = [];

    try {
      const envKeys = Object.keys(process.env);
      const patKeys = envKeys.filter((key) => {
        if (!(key.startsWith("GITHUB_PAT") || key.startsWith("VITE_GITHUB_PAT"))) {
          return false;
        }
        const value = process.env[key];
        return typeof value === "string" && value.trim().length > 0;
      });

      const tokens = patKeys
        .map((key) => process.env[key])
        .filter((token): token is string => typeof token === "string" && token.trim().length > 0);

      this.tokens = tokens;
      apiLogger.info(`已加载 ${this.tokens.length} 个 GitHub 令牌`);
    } catch (error) {
      apiLogger.error("加载 GitHub token 失败:", error);
    }
  }

  public getCurrentToken(): string {
    if (this.tokens.length === 0) return "";
    return this.tokens[this.currentIndex] ?? "";
  }

  public getNextToken(): string {
    if (this.tokens.length === 0) return "";

    let attempts = 0;
    while (attempts < this.tokens.length) {
      this.currentIndex = (this.currentIndex + 1) % this.tokens.length;
      const token = this.tokens[this.currentIndex];

      if (token && this.failedTokens.has(token)) {
        attempts += 1;
        continue;
      }

      return token ?? "";
    }

    this.failedTokens.clear();
    this.currentIndex = 0;
    return this.tokens[0] ?? "";
  }

  public markTokenFailed(token: string): void {
    this.failedTokens.add(token);
  }

  public hasTokens(): boolean {
    return this.tokens.length > 0;
  }

  public getTokenCount(): number {
    return this.tokens.length;
  }

  public getTokenStatus(): { hasTokens: boolean; count: number } {
    return {
      hasTokens: this.hasTokens(),
      count: this.getTokenCount(),
    };
  }
}

const tokenManager = new GitHubTokenManager();

const normalizeEnvValue = (value?: string | null): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const resolveEnvValue = (keys: string[], fallback = ""): string => {
  for (const key of keys) {
    const value = normalizeEnvValue(process.env[key]);
    if (value) {
      return value;
    }
  }
  return fallback;
};

interface RepoEnvConfig {
  repoOwner: string;
  repoName: string;
  repoBranch: string;
}

const getRepoEnvConfig = (): RepoEnvConfig => ({
  repoOwner: resolveEnvValue(
    ["GITHUB_REPO_OWNER", "VITE_GITHUB_REPO_OWNER"],
    CONFIG_DEFAULTS.GITHUB_REPO_OWNER,
  ),
  repoName: resolveEnvValue(
    ["GITHUB_REPO_NAME", "VITE_GITHUB_REPO_NAME"],
    CONFIG_DEFAULTS.GITHUB_REPO_NAME,
  ),
  repoBranch:
    resolveEnvValue(
      ["GITHUB_REPO_BRANCH", "VITE_GITHUB_REPO_BRANCH"],
      CONFIG_DEFAULTS.GITHUB_REPO_BRANCH || "main",
    ) || "main",
});

function getAuthHeaders(): Record<string, string> {
  const token = tokenManager.getCurrentToken();
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "Repo-Viewer",
  };

  if (token) {
    headers.Authorization = `token ${token}`;
  }

  return headers;
}

async function handleRequestWithRetry<T>(requestFn: () => Promise<T>): Promise<T> {
  try {
    return await requestFn();
  } catch (error: any) {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      apiLogger.warn("令牌认证失败或达到限制，尝试轮换令牌...");
      const currentToken = tokenManager.getCurrentToken();
      if (currentToken) {
        tokenManager.markTokenFailed(currentToken);
      }

      const newToken = tokenManager.getNextToken();
      if (newToken && newToken !== currentToken) {
        apiLogger.info("已轮换到新令牌");
        return await requestFn();
      }
    }

    throw error;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { action, path, url } = req.query;
    const actionParam = Array.isArray(action) ? action[0] : action;

    if (!actionParam || typeof actionParam !== "string") {
      return res.status(400).json({ error: "缺少action参数" });
    }

    if (actionParam === "getConfig") {
      const { repoOwner, repoName, repoBranch } = getRepoEnvConfig();
      return res.status(200).json({
        status: "success",
        data: {
          repoOwner,
          repoName,
          repoBranch,
        },
      });
    }

    if (actionParam === "getTokenStatus") {
      return res.status(200).json({
        status: "success",
        data: tokenManager.getTokenStatus(),
      });
    }

    if (actionParam === "getContents") {
      if (typeof path !== "string") {
        return res.status(400).json({ error: "缺少path参数" });
      }

      const { repoOwner, repoName, repoBranch } = getRepoEnvConfig();

      if (!repoOwner || !repoName) {
        return res.status(500).json({
          error: "仓库配置缺失",
          message: "缺少 GITHUB_REPO_OWNER 或 GITHUB_REPO_NAME 环境变量",
        });
      }

      const branch = repoBranch || "main";
      const pathSegment = path === "" ? "" : `/${path}`;
      const apiPath = `/repos/${repoOwner}/${repoName}/contents${pathSegment}?ref=${branch}`;

      try {
        const response = await handleRequestWithRetry(() =>
          axios.get(`${GITHUB_API_BASE}${apiPath}`, {
            headers: getAuthHeaders(),
          }),
        );

        const validation = safeValidateGitHubContentsResponse(response.data);
        if (!validation.success) {
          apiLogger.error("GitHub 内容响应验证失败:", validation.error);
          return res.status(500).json({
            error: "获取内容失败",
            message: `响应格式错误: ${validation.error}`,
          });
        }

        return res.status(200).json(validation.data);
      } catch (error: any) {
        apiLogger.error("GitHub API 请求失败:", error.message);

        return res.status(error.response?.status || 500).json({
          error: "获取内容失败",
          message: error.message,
        });
      }
    }

    if (actionParam === "getFileContent") {
      const urlParam = Array.isArray(url) ? (url.length > 0 ? url[0] : undefined) : url;
      if (typeof urlParam !== "string" || urlParam.trim() === "") {
        return res.status(400).json({ error: "缺少url参数" });
      }

      try {
        const urlString = urlParam;
        const isBinaryFile = /\.(png|jpe?g|gif|pdf|docx|xlsx|pptx|zip|rar|7z|exe|dll|so|dylib|bin)$/i.test(urlString);

        if (isBinaryFile) {
          const fileExtension = urlString.split(".").pop()?.toLowerCase();

          if (fileExtension) {
            const contentTypeMap: Record<string, string> = {
              pdf: "application/pdf",
              png: "image/png",
              jpg: "image/jpeg",
              jpeg: "image/jpeg",
              gif: "image/gif",
              docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
              zip: "application/zip",
              rar: "application/x-rar-compressed",
              "7z": "application/x-7z-compressed",
            };

            const contentType = contentTypeMap[fileExtension] || "application/octet-stream";
            res.setHeader("Content-Type", contentType);
          } else {
            res.setHeader("Content-Type", "application/octet-stream");
          }

          const response = await handleRequestWithRetry(() =>
            axios.get(urlString, {
              headers: getAuthHeaders(),
              responseType: "arraybuffer",
            }),
          );

          return res.status(200).send(response.data);
        }

        res.setHeader("Content-Type", "text/plain; charset=utf-8");

        const response = await handleRequestWithRetry(() =>
          axios.get(urlString, {
            headers: getAuthHeaders(),
          }),
        );

        return res.status(200).send(response.data);
      } catch (error: any) {
        apiLogger.error("获取文件内容失败:", error.message);
        return res.status(error.response?.status || 500).json({
          error: "获取文件内容失败",
          message: error.message,
        });
      }
    }

    if (actionParam === "search") {
      const { q, sort, order } = req.query;
      const qParam = Array.isArray(q) ? (q.length > 0 ? q[0] : "") : (q ?? "");

      if (typeof qParam !== "string" || qParam.trim() === "") {
        return res.status(400).json({ error: "缺少搜索参数" });
      }

      const { repoOwner, repoName } = getRepoEnvConfig();

      if (!repoOwner || !repoName) {
        return res.status(500).json({
          error: "仓库配置缺失",
          message: "缺少 GITHUB_REPO_OWNER 或 GITHUB_REPO_NAME 环境变量",
        });
      }

      const searchQuery = `repo:${repoOwner}/${repoName} ${qParam}`;

      try {
        const response = await handleRequestWithRetry(() =>
          axios.get(`${GITHUB_API_BASE}/search/code`, {
            headers: getAuthHeaders(),
            params: {
              q: searchQuery,
              sort: (Array.isArray(sort) ? sort[0] : sort) || "best-match",
              order: (Array.isArray(order) ? order[0] : order) || "desc",
            },
          }),
        );

        const validation = safeValidateGitHubSearchResponse(response.data);
        if (!validation.success) {
          apiLogger.error("GitHub 搜索响应验证失败:", validation.error);
          return res.status(500).json({
            error: "搜索失败",
            message: `搜索响应格式错误: ${validation.error}`,
          });
        }

        return res.status(200).json(validation.data);
      } catch (error: any) {
        apiLogger.error("GitHub 搜索 API 请求失败:", error.message);
        return res.status(error.response?.status || 500).json({
          error: "搜索失败",
          message: error.message,
        });
      }
    }

    return res.status(400).json({ error: "不支持的操作" });
  } catch (error: any) {
    apiLogger.error("API 请求处理错误:", error);
    let message = "处理请求时发生错误";

    if (error.response) {
      const status = error.response.status;
      message = `GitHub API错误 (${status}): ${error.response.data?.message || "未知错误"}`;
    } else if (error.message) {
      message = error.message;
    }

    return res.status(500).json({ error: message });
  }
}
