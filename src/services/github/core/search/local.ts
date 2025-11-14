import type { GitHubContent } from '@/types';
import { logger } from '@/utils';

import { GITHUB_REPO_NAME, GITHUB_REPO_OWNER } from '../Config';
import type { GitTreeItem } from './trees';

async function loadDirectoryContents(path: string): Promise<GitHubContent[]> {
  const { getContents } = await import('../content');
  return getContents(path);
}

function matchesFileType(file: GitHubContent, fileTypeFilter?: string): boolean {
  if (fileTypeFilter === undefined || fileTypeFilter === '' || file.type !== 'file') {
    return true;
  }

  const extension = file.name.split('.').pop()?.toLowerCase();
  return extension === fileTypeFilter.toLowerCase();
}

function filterFilesByName(
  contents: GitHubContent[],
  searchTerm: string,
  fileTypeFilter?: string
): GitHubContent[] {
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  return contents.filter(item => {
    if (!matchesFileType(item, fileTypeFilter)) {
      return false;
    }

    const fileName = item.name.toLowerCase();
    return fileName.includes(normalizedSearchTerm);
  });
}

async function searchSubdirectories(
  directories: GitHubContent[],
  searchTerm: string,
  fileTypeFilter?: string
): Promise<GitHubContent[]> {
  if (directories.length === 0) {
    return [];
  }

  logger.debug(`并行搜索 ${directories.length.toString()} 个子目录（无深度限制）`);

  const searchPromises = directories.map(dir =>
    searchFiles(searchTerm, dir.path, true, fileTypeFilter).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : '未知错误';
      logger.warn(`搜索目录 ${dir.path} 失败: ${message}`);
      return [] as GitHubContent[];
    })
  );

  const subResults = await Promise.all(searchPromises);
  return subResults.flat();
}

export async function searchFiles(
  searchTerm: string,
  currentPath = '',
  recursive = false,
  fileTypeFilter?: string
): Promise<GitHubContent[]> {
  if (searchTerm.trim() === '') {
    return [];
  }

  try {
    const contents = await loadDirectoryContents(currentPath);
    let results = filterFilesByName(contents, searchTerm, fileTypeFilter);

    if (recursive) {
      const directories = contents.filter(item => item.type === 'dir');
      const subdirectoryResults = await searchSubdirectories(directories, searchTerm, fileTypeFilter);
      results = results.concat(subdirectoryResults);
    }

    logger.debug(`搜索结果: 找到 ${results.length.toString()} 个匹配项（仅匹配文件名）`);
    return results;
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    logger.error(`搜索文件失败: ${message}`);
    throw new Error(`搜索文件失败: ${message}`);
  }
}

export async function searchMultipleBranchesWithTreesApi(
  searchTerm: string,
  branches: string[],
  pathPrefix = '',
  fileTypeFilter?: string
): Promise<{ branch: string; results: GitHubContent[] }[]> {
  const searchPromises = branches.map(async branch => ({
    branch,
    results: await searchBranchWithTreesApi(searchTerm, branch, pathPrefix, fileTypeFilter)
  }));

  return Promise.all(searchPromises);
}

async function searchBranchWithTreesApi(
  searchTerm: string,
  branch: string,
  pathPrefix = '',
  fileTypeFilter?: string
): Promise<GitHubContent[]> {
  try {
    const { getBranchTree } = await import('./trees');
    const tree = await getBranchTree(branch);

    if (tree === null) {
      return [];
    }

    const normalizedSearchTerm = searchTerm.trim().toLowerCase();
    const normalizedPrefix = pathPrefix.trim().toLowerCase();

    return tree
      .filter((item: GitTreeItem) => item.type === 'blob')
      .filter(item => {
        const itemPath = item.path ?? '';
        const fileName = itemPath.includes('/') ? itemPath.slice(itemPath.lastIndexOf('/') + 1) : itemPath;

        if (!fileName.toLowerCase().includes(normalizedSearchTerm)) {
          return false;
        }

        if (normalizedPrefix.length > 0 && !itemPath.toLowerCase().startsWith(normalizedPrefix)) {
          return false;
        }

        if (fileTypeFilter !== undefined && fileTypeFilter !== '') {
          const ext = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase() : '';
          if (ext !== fileTypeFilter.toLowerCase()) {
            return false;
          }
        }

        return true;
      })
      .map(item => {
        const itemPath = item.path ?? '';
        const fileName = itemPath.includes('/') ? itemPath.slice(itemPath.lastIndexOf('/') + 1) : itemPath;

        const result: GitHubContent = {
          name: fileName,
          path: itemPath,
          type: 'file',
          sha: item.sha ?? '',
          url: item.url ?? '',
          html_url: `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/blob/${branch}/${itemPath}`,
          download_url: `https://raw.githubusercontent.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/${branch}/${itemPath}`
        };

        if (item.size !== undefined) {
          result.size = item.size;
        }

        return result;
      });
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    logger.warn(`使用 Trees API 搜索分支 ${branch} 失败`, message);
    return [];
  }
}

