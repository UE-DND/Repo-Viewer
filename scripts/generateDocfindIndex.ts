import crypto from "crypto";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

import { collectTokens, loadEnvFiles, parseBoolean, parseList, resolveEnvValue } from "./utils/env.js";
import { resolveRepoRoot } from "./utils/paths.js";

interface DocfindManifestBranch {
  docfindPath: string;
  hash: string;
  fileCount: number;
  generatedAt: string;
}

interface DocfindManifest {
  schemaVersion: "docfind-1";
  generatedAt: string;
  branches: Record<string, DocfindManifestBranch>;
}

const DEFAULT_EXTENSION_WHITELIST = [
  "md",
  "markdown",
  "mdx",
  "txt",
  "js",
  "jsx",
  "ts",
  "tsx",
  "json",
  "jsonc",
  "css",
  "scss",
  "less",
  "html",
  "htm",
  "xml",
  "yaml",
  "yml",
  "toml",
  "ini",
  "cfg",
  "conf",
  "properties",
  "sql",
  "sh",
  "bash",
  "zsh",
  "ps1",
  "py",
  "go",
  "java",
  "kt",
  "kts",
  "cs",
  "c",
  "h",
  "cpp",
  "hpp",
  "rs",
  "rb",
  "php",
  "swift",
  "m",
  "mm",
  "scala",
  "lua"
];

const DEFAULT_MAX_FILE_SIZE = 512 * 1024;
const DOCFIND_SCHEMA_VERSION = "docfind-1" as const;

const runCommandText = (command: string, args: string[], cwd: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = Buffer.alloc(0);
    let stderr = Buffer.alloc(0);

    child.stdout.on("data", (chunk) => {
      stdout = Buffer.concat([stdout, chunk]);
    });

    child.stderr.on("data", (chunk) => {
      stderr = Buffer.concat([stderr, chunk]);
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.toString("utf8").trim());
      } else {
        const message = stderr.toString("utf8").trim();
        reject(new Error(message.length > 0 ? message : `${command} failed`));
      }
    });
  });

const runCommandBuffer = (command: string, args: string[], cwd: string): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = Buffer.alloc(0);
    let stderr = Buffer.alloc(0);

    child.stdout.on("data", (chunk) => {
      stdout = Buffer.concat([stdout, chunk]);
    });

    child.stderr.on("data", (chunk) => {
      stderr = Buffer.concat([stderr, chunk]);
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        const message = stderr.toString("utf8").trim();
        reject(new Error(message.length > 0 ? message : `${command} failed`));
      }
    });
  });

const runCommand = (command: string, args: string[], cwd: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code ?? "unknown"}`));
      }
    });
  });

const toPosixPath = (value: string): string => value.split(path.sep).join("/");

type GenerationMode = "build" | "action" | "off";

const normalizeGenerationMode = (value: string): GenerationMode => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "build" || normalized === "action" || normalized === "off") {
    return normalized;
  }
  return "build";
};

const resolveGenerationContext = (): "build" | "action" => {
  const isActions = parseBoolean(resolveEnvValue(["GITHUB_ACTIONS"], "false"));
  return isActions ? "action" : "build";
};

const shouldGenerateIndex = (mode: GenerationMode, context: "build" | "action"): boolean => {
  if (mode === "off") {
    return false;
  }
  return mode === context;
};

const computeDocfindAssetName = (): string => {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === "win32") {
    if (arch === "arm64") {
      return "docfind-aarch64-pc-windows-msvc.zip";
    }
    return "docfind-x86_64-pc-windows-msvc.zip";
  }

  if (platform === "darwin") {
    if (arch === "arm64") {
      return "docfind-aarch64-apple-darwin.tar.gz";
    }
    return "docfind-x86_64-apple-darwin.tar.gz";
  }

  if (platform === "linux") {
    if (arch === "arm64") {
      return "docfind-aarch64-unknown-linux-musl.tar.gz";
    }
    return "docfind-x86_64-unknown-linux-musl.tar.gz";
  }

  throw new Error(`Unsupported platform: ${platform} (${arch})`);
};

const extractDocfindArchive = async (archivePath: string, destDir: string, rootDir: string): Promise<void> => {
  if (archivePath.endsWith(".zip")) {
    const archiveArg = toPosixPath(archivePath);
    const destArg = toPosixPath(destDir);
    const command = `Expand-Archive -Path "${archiveArg}" -DestinationPath "${destArg}" -Force`;
    await runCommand("powershell", ["-NoProfile", "-Command", command], rootDir);
    return;
  }

  await runCommand("tar", ["-xzf", archivePath, "-C", destDir], rootDir);
};

const findDocfindBinary = async (rootDir: string): Promise<string | null> => {
  const entries = await fs.promises.readdir(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const name = entry.name.toLowerCase();
    const fullPath = path.join(rootDir, entry.name);

    if (entry.isFile()) {
      if (process.platform === "win32") {
        if (name.startsWith("docfind") && name.endsWith(".exe")) {
          return fullPath;
        }
      } else if (name === "docfind" || name.startsWith("docfind-")) {
        return fullPath;
      }
      continue;
    }

    if (entry.isDirectory()) {
      const nested = await findDocfindBinary(fullPath);
      if (nested !== null) {
        return nested;
      }
    }
  }

  return null;
};

const ensureDocfindBinary = async (rootDir: string, explicitPath?: string): Promise<string> => {
  if (explicitPath && explicitPath.trim().length > 0) {
    return explicitPath.trim();
  }

  const assetName = computeDocfindAssetName();
  const targetName = process.platform === "win32" ? "docfind.exe" : "docfind";
  const binDir = path.join(rootDir, ".docfind", "bin");
  const binPath = path.join(binDir, targetName);

  if (fs.existsSync(binPath)) {
    return binPath;
  }

  const downloadDir = path.join(rootDir, ".docfind", "downloads");
  await fs.promises.mkdir(downloadDir, { recursive: true });
  await fs.promises.mkdir(binDir, { recursive: true });

  const downloadUrl = `https://github.com/microsoft/docfind/releases/latest/download/${assetName}`;
  console.log(`[docfind] Downloading ${assetName}...`);

  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`docfind download failed: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const archivePath = path.join(downloadDir, assetName);
  await fs.promises.writeFile(archivePath, buffer);

  await extractDocfindArchive(archivePath, binDir, rootDir);

  const extractedPath = await findDocfindBinary(binDir);
  if (extractedPath === null) {
    throw new Error("docfind binary not found after extraction");
  }

  if (extractedPath !== binPath) {
    await fs.promises.copyFile(extractedPath, binPath);
  }

  if (process.platform !== "win32") {
    await fs.promises.chmod(binPath, 0o755);
  }

  return binPath;
};

const resolveExtension = (filePath: string): string => {
  const ext = path.posix.extname(filePath);
  return ext.startsWith(".") ? ext.slice(1).toLowerCase() : ext.toLowerCase();
};

const isBinaryBuffer = (buffer: Buffer): boolean => {
  const sample = buffer.subarray(0, Math.min(buffer.length, 8000));
  return sample.includes(0);
};

const hashFile = async (filePath: string): Promise<string> => {
  const hash = crypto.createHash("sha256");
  const stream = fs.createReadStream(filePath);
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => {
      hash.update(chunk);
    });
    stream.on("error", reject);
    stream.on("end", () => {
      resolve(hash.digest("hex"));
    });
  });
};

const ensureTempRepo = async (
  rootDir: string,
  repoOwner: string,
  repoName: string,
  token: string | undefined
): Promise<string> => {
  const tempRoot = path.join(rootDir, ".docfind", "tmp");
  await fs.promises.mkdir(tempRoot, { recursive: true });
  const repoPath = await fs.promises.mkdtemp(path.join(tempRoot, "repo-"));

  const safeOwner = encodeURIComponent(repoOwner);
  const safeName = encodeURIComponent(repoName);
  const remoteUrl = token && token.trim().length > 0
    ? `https://${encodeURIComponent("x-access-token")}:${encodeURIComponent(token)}@github.com/${safeOwner}/${safeName}.git`
    : `https://github.com/${safeOwner}/${safeName}.git`;

  await runCommandText("git", ["init", repoPath], rootDir);
  await runCommandText("git", ["remote", "add", "origin", remoteUrl], repoPath);

  return repoPath;
};

const fetchBranch = async (repoPath: string, branch: string): Promise<string | null> => {
  const remoteRef = `refs/remotes/origin/${branch}`;
  try {
    console.log(`[docfind] Fetching ${branch}...`);
    await runCommand(
      "git",
      ["fetch", "--depth", "1", "--no-tags", "--progress", "origin", `${branch}:${remoteRef}`],
      repoPath
    );
    console.log(`[docfind] Fetched ${branch}`);
    return remoteRef;
  } catch (error) {
    console.warn(`[docfind] Failed to fetch branch ${branch}:`, error);
    return null;
  }
};

const resolveBranchRef = async (repoPath: string, branch: string): Promise<string | null> => {
  const candidates = [branch, `refs/heads/${branch}`, `refs/remotes/origin/${branch}`];
  for (const candidate of candidates) {
    try {
      await runCommandText("git", ["rev-parse", "--verify", candidate], repoPath);
      return candidate;
    } catch {
      continue;
    }
  }
  return null;
};

const checkoutBranch = async (repoPath: string, branchRef: string): Promise<void> => {
  await runCommand("git", ["checkout", "--force", "--detach", branchRef], repoPath);
};

const listTrackedFiles = async (repoPath: string): Promise<string[]> => {
  const output = await runCommandBuffer("git", ["ls-files", "-z"], repoPath);
  return output
    .toString("utf8")
    .split("\0")
    .filter((entry: string) => entry.length > 0);
};

const buildDocumentsForBranch = async (
  repoPath: string,
  branchRef: string,
  branchName: string,
  extensionWhitelist: Set<string>,
  maxFileSize: number
): Promise<{ documents: Record<string, unknown>[]; skipped: number }> => {
  console.log(`[docfind] Checking out ${branchName}...`);
  await checkoutBranch(repoPath, branchRef);

  console.log(`[docfind] Collecting files for ${branchName}...`);
  const filePaths = await listTrackedFiles(repoPath);
  console.log(`[docfind] ${branchName}: ${filePaths.length} tracked files`);

  const documents: Record<string, unknown>[] = [];
  let skipped = 0;

  for (const filePath of filePaths) {
    const normalizedPath = toPosixPath(filePath);
    const extension = resolveExtension(normalizedPath);

    const absolutePath = path.join(repoPath, filePath);
    let stats: fs.Stats;
    try {
      stats = await fs.promises.stat(absolutePath);
    } catch (error) {
      console.warn(`[docfind] Failed to stat ${branchName}:${normalizedPath}`, error);
      skipped += 1;
      continue;
    }
    if (!stats.isFile()) {
      skipped += 1;
      continue;
    }

    const fileName = path.posix.basename(normalizedPath);
    let body = normalizedPath;

    if (extensionWhitelist.has(extension) && stats.size <= maxFileSize) {
      let contentBuffer: Buffer;
      try {
        contentBuffer = await fs.promises.readFile(absolutePath);
      } catch (error) {
        console.warn(`[docfind] Failed to read ${branchName}:${normalizedPath}`, error);
        documents.push({
          title: fileName,
          category: extension,
          href: normalizedPath,
          path: normalizedPath,
          branch: branchName,
          extension,
          body
        });
        continue;
      }

      if (!isBinaryBuffer(contentBuffer)) {
        const contentText = contentBuffer.toString("utf8");
        body = `${normalizedPath}\n${contentText}`;
      }
    }

    documents.push({
      title: fileName,
      category: extension,
      href: normalizedPath,
      path: normalizedPath,
      branch: branchName,
      extension,
      body
    });
  }

  return { documents, skipped };
};

const ensureEmptyDir = async (targetDir: string): Promise<void> => {
  await fs.promises.rm(targetDir, { recursive: true, force: true });
  await fs.promises.mkdir(targetDir, { recursive: true });
};

const patchDocfindInit = async (branchDir: string): Promise<void> => {
  const docfindJsPath = path.join(branchDir, "docfind.js");
  if (!fs.existsSync(docfindJsPath)) {
    return;
  }

  const content = await fs.promises.readFile(docfindJsPath, "utf8");
  const patched = content.replace("function U(){return y()}", "function U(e){return y(e)}");
  if (patched === content) {
    console.warn("[docfind] Failed to patch init signature in docfind.js");
    return;
  }
  await fs.promises.writeFile(docfindJsPath, patched, "utf8");
};

const run = async (): Promise<void> => {
  const rootDir = resolveRepoRoot(import.meta.url);
  loadEnvFiles(rootDir);

  const generationMode = normalizeGenerationMode(resolveEnvValue(["SEARCH_INDEX_GENERATION_MODE"], "build"));
  const generationContext = resolveGenerationContext();
  if (!shouldGenerateIndex(generationMode, generationContext)) {
    console.log(`[docfind] Generation mode is ${generationMode}, skip in ${generationContext} context.`);
    return;
  }

  const enabled = parseBoolean(resolveEnvValue(["ENABLED_SEARCH_INDEX", "VITE_ENABLED_SEARCH_INDEX"], "false"));
  if (!enabled) {
    console.log("[docfind] Search index disabled, skip generation.");
    return;
  }

  const repoOwner = resolveEnvValue(["GITHUB_REPO_OWNER", "VITE_GITHUB_REPO_OWNER"]);
  const repoName = resolveEnvValue(["GITHUB_REPO_NAME", "VITE_GITHUB_REPO_NAME"]);
  if (repoOwner.length === 0 || repoName.length === 0) {
    console.warn("[docfind] Missing repo owner/name, skip generation.");
    return;
  }

  const defaultBranch = resolveEnvValue(
    ["GITHUB_REPO_BRANCH", "VITE_GITHUB_REPO_BRANCH"],
    "main"
  );
  const branchList = parseList(resolveEnvValue(["SEARCH_INDEX_BRANCHES"], ""));
  const branches = branchList.length > 0 ? branchList : [defaultBranch];

  const basePath = "/search-index";
  const manifestUrlPath = `${basePath}/manifest.json`;

  const safeMaxFileSize = DEFAULT_MAX_FILE_SIZE;

  const extensionOverride = parseList(resolveEnvValue(["SEARCH_INDEX_EXTENSIONS"], ""));
  const extensionWhitelist = new Set<string>(
    (extensionOverride.length > 0 ? extensionOverride : DEFAULT_EXTENSION_WHITELIST)
      .map((ext: string) => ext.trim().toLowerCase().replace(/^\./, ""))
      .filter((ext: string) => ext.length > 0)
  );

  const outputRoot = path.join(rootDir, "public", basePath.replace(/^\//, ""));
  const manifestOutputPath = path.join(rootDir, "public", manifestUrlPath.replace(/^\//, ""));

  const docfindBin = await ensureDocfindBinary(rootDir, resolveEnvValue(["DOCFIND_BIN"], ""));

  const repoPath = resolveEnvValue(["DOCFIND_REPO_PATH"], "");
  const tokens = collectTokens();
  const tempRepoPath = repoPath.length > 0
    ? path.resolve(rootDir, repoPath)
    : await ensureTempRepo(rootDir, repoOwner, repoName, tokens[0]);

  if (repoPath.length === 0) {
    console.log(`[docfind] Temporary repo at ${tempRepoPath}`);
  }

  const manifest: DocfindManifest = {
    schemaVersion: DOCFIND_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    branches: {}
  };

  for (const branch of branches) {
    const branchRef = repoPath.length > 0
      ? await resolveBranchRef(tempRepoPath, branch)
      : await fetchBranch(tempRepoPath, branch);

    if (!branchRef) {
      console.warn(`[docfind] Skip missing branch: ${branch}`);
      continue;
    }

    const { documents, skipped } = await buildDocumentsForBranch(
      tempRepoPath,
      branchRef,
      branch,
      extensionWhitelist,
      safeMaxFileSize
    );

    if (documents.length === 0) {
      console.warn(`[docfind] Skip branch with no documents: ${branch} (skipped ${skipped})`);
      continue;
    }

    const branchSegments = branch.split("/").filter((segment: string) => segment.length > 0);
    const branchDir = path.join(outputRoot, ...branchSegments);
    await ensureEmptyDir(branchDir);

    const tempDir = path.join(rootDir, ".docfind", "payloads");
    await fs.promises.mkdir(tempDir, { recursive: true });
    const payloadPath = path.join(tempDir, `${branchSegments.join("-") || "default"}.json`);
    await fs.promises.writeFile(payloadPath, `${JSON.stringify(documents, null, 2)}\n`, "utf8");

    console.log(`[docfind] Running docfind for ${branch}...`);
    await runCommand(docfindBin, [payloadPath, branchDir], rootDir);
    await patchDocfindInit(branchDir);

    const wasmPath = path.join(branchDir, "docfind_bg.wasm");
    const hash = await hashFile(wasmPath);
    const branchUrlPath = branchSegments.map((segment: string) => encodeURIComponent(segment)).join("/");
    const docfindPath = `${basePath}/${branchUrlPath}/docfind.js`;

    manifest.branches[branch] = {
      docfindPath,
      hash,
      fileCount: documents.length,
      generatedAt: new Date().toISOString()
    };

    console.log(`[docfind] Built ${branch}: ${documents.length} documents (${skipped} skipped)`);
  }

  await fs.promises.mkdir(path.dirname(manifestOutputPath), { recursive: true });
  await fs.promises.writeFile(manifestOutputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`[docfind] Manifest written to ${toPosixPath(manifestOutputPath)}`);
};

void run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[docfind] Generation failed: ${message}`);
  process.exitCode = 1;
});
