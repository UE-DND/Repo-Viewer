import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface InitialContentHydrationPayload {
  version: number;
  generatedAt: string;
  branch: string;
  repo: {
    owner: string;
    name: string;
  };
  directories: Array<{
    path: string;
    contents: JsonValue[];
  }>;
  files: Array<{
    path: string;
    downloadUrl?: string | null;
    sha?: string;
    content: string;
    encoding?: "utf-8" | "base64";
  }>;
  metadata?: Record<string, JsonValue>;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.basename(__dirname) === "dist"
  ? path.resolve(__dirname, "..", "..")
  : path.resolve(__dirname, "..");
const outputPath = path.join(rootDir, "src", "generated", "initialContent.ts");

const loadEnvFile = (fileName: string): void => {
  const fullPath = path.join(rootDir, fileName);
  if (fs.existsSync(fullPath)) {
    dotenv.config({ path: fullPath, override: true });
  }
};

const envFiles = [".env", ".env.local", ".env.production", ".env.production.local"];
envFiles.forEach(loadEnvFile);

const resolveEnvValue = (keys: string[], fallback = ""): string => {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return fallback;
};

const collectTokens = (): string[] => {
  const tokens: string[] = [];
  const keys = Object.keys(process.env)
    .filter((key) => key.startsWith("GITHUB_PAT") || key.startsWith("VITE_GITHUB_PAT"))
    .sort((a, b) => a.localeCompare(b, "en"));

  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim().length > 0) {
      tokens.push(value.trim());
    }
  }

  return tokens;
};

const owner = resolveEnvValue(["VITE_GITHUB_REPO_OWNER", "GITHUB_REPO_OWNER"]);
const repo = resolveEnvValue(["VITE_GITHUB_REPO_NAME", "GITHUB_REPO_NAME"]);
const branch = resolveEnvValue(["VITE_GITHUB_REPO_BRANCH", "GITHUB_REPO_BRANCH"], "main");
const tokens = collectTokens();

const buildHeaders = (token: string, accept: string): Record<string, string> => {
  const headers: Record<string, string> = {
    Accept: accept,
    "User-Agent": "Repo-Viewer"
  };

  if (token.length > 0) {
    headers.Authorization = `token ${token}`;
  }

  return headers;
};

const fetchWithTokens = async (url: string, accept: string): Promise<Response> => {
  const candidates = tokens.length > 0 ? tokens : [""];
  let lastResponse: Response | null = null;

  for (const token of candidates) {
    const response = await fetch(url, {
      method: "GET",
      headers: buildHeaders(token, accept)
    });
    lastResponse = response;

    if (response.status !== 401 && response.status !== 403) {
      return response;
    }
  }

  if (lastResponse === null) {
    throw new Error("No response received");
  }

  return lastResponse;
};

const fetchJson = async <T>(url: string): Promise<T> => {
  const response = await fetchWithTokens(url, "application/vnd.github.v3+json");
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
};

const fetchText = async (url: string): Promise<string> => {
  const response = await fetchWithTokens(url, "application/vnd.github.v3.raw");
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }
  return response.text();
};

const encodePathSegments = (input: string): string =>
  input.split("/").map((segment) => encodeURIComponent(segment)).join("/");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readString = (record: Record<string, unknown>, key: string): string => {
  const value = record[key];
  return typeof value === "string" ? value : "";
};

const readOptionalString = (record: Record<string, unknown>, key: string): string | null => {
  const value = record[key];
  return typeof value === "string" ? value : null;
};

const buildOutput = (payload: InitialContentHydrationPayload | null): string => {
  const serialize = (value: InitialContentHydrationPayload | null): string =>
    JSON.stringify(value, null, 2)
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029");

  const content = payload ? serialize(payload) : "null";

  return [
    "import type { InitialContentHydrationPayload } from \"@/types\";",
    "",
    `export const initialContentPayload: InitialContentHydrationPayload | null = ${content};`,
    ""
  ].join("\n");
};

const writeOutput = async (payload: InitialContentHydrationPayload | null): Promise<void> => {
  const output = buildOutput(payload);
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.promises.writeFile(outputPath, output, "utf8");
};

const run = async (): Promise<void> => {
  if (owner.length === 0 || repo.length === 0) {
    console.warn("[hydration] Missing repo envs, writing null payload.");
    await writeOutput(null);
    return;
  }

  try {
    const contentsUrl = `https://api.github.com/repos/${owner}/${repo}/contents?ref=${encodeURIComponent(branch)}`;
    const contents = await fetchJson<unknown>(contentsUrl);

    if (!Array.isArray(contents)) {
      throw new Error("Unexpected contents response");
    }

    const contentItems = contents.filter(isRecord);
    const readmeItem = contentItems.find((item) => {
      const type = readString(item, "type");
      const name = readString(item, "name");
      if (type !== "file" || name.length === 0) {
        return false;
      }
      const lower = name.toLowerCase();
      return lower.includes("readme") && lower.endsWith(".md");
    });

    let readmeContent: string | null = null;
    let readmePath = "";
    let readmeSha = "";
    let readmeDownloadUrl: string | null = null;

    if (readmeItem) {
      readmePath = readString(readmeItem, "path");
      readmeSha = readString(readmeItem, "sha");
      readmeDownloadUrl = readOptionalString(readmeItem, "download_url");

      if (readmePath.length > 0) {
        const readmeApiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodePathSegments(readmePath)}?ref=${encodeURIComponent(branch)}`;
        try {
          readmeContent = await fetchText(readmeApiUrl);
        } catch (error) {
          console.warn("[hydration] README fetch failed, skipping.", error);
        }
      }
    }

    const payload: InitialContentHydrationPayload = {
      version: 1,
      generatedAt: new Date().toISOString(),
      branch,
      repo: {
        owner,
        name: repo
      },
      directories: [
        {
          path: "",
          contents: contents as JsonValue[]
        }
      ],
      files: readmeContent && readmePath.length > 0
        ? [
            {
              path: readmePath,
              downloadUrl: readmeDownloadUrl,
              sha: readmeSha,
              content: readmeContent,
              encoding: "utf-8"
            }
          ]
        : [],
      metadata: {
        allowReadmeHydration: true,
        readmePath,
        readmeSha
      }
    };

    await writeOutput(payload);
    console.log("[hydration] Initial content generated.");
  } catch (error) {
    console.warn("[hydration] Generation failed, writing null payload.", error);
    await writeOutput(null);
  }
};

void run();
