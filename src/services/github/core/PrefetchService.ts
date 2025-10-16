import type { GitHubContent } from '@/types';
import { logger } from '@/utils';
import { CacheManager } from '../cache/CacheManager';
import { RequestBatcher } from '../RequestBatcher';
import { getAuthHeaders } from './Auth';

// GitHub预取服务，使用模块导出而非类
const batcher = new RequestBatcher();

/**
 * 智能预取目录内容
 * 
 * 根据优先级延迟预加载指定路径的内容，不阻塞用户操作。
 * 
 * @param path - 要预取的目录路径
 * @param priority - 预取优先级，默认为'low'
 * @returns void
 */
export function prefetchContents(path: string, priority: 'high' | 'medium' | 'low' = 'low'): void {
  // 使用低优先级预加载，不影响用户操作
  const delay = priority === 'high' ? 0 : priority === 'medium' ? 100 : 200;
  setTimeout(() => {
    // 动态导入避免循环依赖
    void import('./ContentService').then(({ getContents }) => {
      void getContents(path).catch(() => {
        // 忽略错误
      });
    });
  }, delay);
}

/**
 * 批量预加载多个路径
 * 
 * 并发预加载多个路径的内容，自动控制并发数量。
 * 
 * @param paths - 路径数组
 * @param maxConcurrency - 最大并发数，默认为3
 * @returns Promise，所有预加载完成后解析
 */
export async function batchPrefetchContents(paths: string[], maxConcurrency = 3): Promise<void> {
  if (paths.length === 0) {
    return;
  }

    // 动态导入避免循环依赖
  const { getContents } = await import('./ContentService');

  // 限制并发数量防止网络资源过耗
  for (let i = 0; i < paths.length; i += maxConcurrency) {
    const batch = paths.slice(i, i + maxConcurrency);
    const promises = batch.map(path =>
      getContents(path).catch(() => null)
    );

    await Promise.allSettled(promises);

    // 批次间稍微延迟
    if (i + maxConcurrency < paths.length) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
}

/**
 * 智能预加载相关内容
 * 
 * 根据内容类型和优先级智能预加载相关的目录和文件。
 * 
 * @param contents - GitHub内容数组
 * @returns Promise，预加载完成后解析
 */
export async function prefetchRelatedContent(contents: GitHubContent[]): Promise<void> {
    try {
      // 按类型和大小分组
      const directories = contents.filter(item => item.type === 'dir');
      const files = contents.filter(item => item.type === 'file');

      // 智能选择需要预加载的内容
      const priorityDirs = selectPriorityDirectories(directories);
      const priorityFiles = selectPriorityFiles(files);

      // 并行预加载目录和文件
      const prefetchPromises: Promise<void>[] = [];

      if (priorityDirs.length > 0) {
        const prefetchPromise = Promise.resolve()
          .then(() => {
            CacheManager.prefetchContent(priorityDirs.map(dir => dir.path));
          })
          .catch((error: unknown) => {
            logger.debug('预加载目录失败', error);
          });
        prefetchPromises.push(prefetchPromise);
      }

      if (priorityFiles.length > 0) {
        // 使用低优先级预加载文件
        const filesPrefetchPromise = prefetchFilesWithPriority(priorityFiles, 'low')
          .catch((error: unknown) => {
            logger.debug('预加载文件失败', error);
            return Promise.resolve();
          });
        prefetchPromises.push(filesPrefetchPromise);
      }

      // 等待所有预加载完成（但不阻塞主线程）
      await Promise.allSettled(prefetchPromises);

    } catch (error) {
      logger.debug('预加载相关内容失败', error);
    }
  }

// 选择优先目录（智能策略）
function selectPriorityDirectories(directories: GitHubContent[]): GitHubContent[] {
    // 按目录名重要性排序
    const importantDirNames = ['src', 'docs', 'components', 'pages', 'lib', 'utils', 'assets'];

    const prioritized = directories.sort((a, b) => {
      const aImportance = importantDirNames.findIndex(name =>
        a.name.toLowerCase().includes(name.toLowerCase())
      );
      const bImportance = importantDirNames.findIndex(name =>
        b.name.toLowerCase().includes(name.toLowerCase())
      );

      // 重要目录优先
      if (aImportance !== -1 && bImportance === -1) {
        return -1;
      }
      if (aImportance === -1 && bImportance !== -1) {
        return 1;
      }
      if (aImportance !== -1 && bImportance !== -1) {
        return aImportance - bImportance;
      }

      // 按字母顺序
      return a.name.localeCompare(b.name);
    });

    return prioritized.slice(0, 3); // 最多3个目录
  }

// 选择优先文件（智能策略）
function selectPriorityFiles(files: GitHubContent[]): GitHubContent[] {
    const importantExtensions = ['.md', '.txt', '.json', '.js', '.ts', '.tsx', '.jsx'];
    const maxFileSize = 100 * 1024; // 100KB

    // 过滤小文件和重要文件
    const candidates = files.filter(file => {
      if (file.size === undefined || file.size === 0 || file.size > maxFileSize) {
        return false;
      }

      const extension = file.name.substring(file.name.lastIndexOf('.'));
      return importantExtensions.includes(extension.toLowerCase());
    });

    // 按文件类型和大小排序
    const prioritized = candidates.sort((a, b) => {
      // README文件最高优先级
      if (a.name.toLowerCase().startsWith('readme')) {
        return -1;
      }
      if (b.name.toLowerCase().startsWith('readme')) {
        return 1;
      }

      // 按文件大小排序（小文件优先）
      return (a.size ?? 0) - (b.size ?? 0);
    });

    return prioritized.slice(0, 5); // 最多5个文件
  }

// 使用优先级预加载文件
async function prefetchFilesWithPriority(
  files: GitHubContent[],
  priority: 'high' | 'medium' | 'low'
): Promise<void> {
    const fileUrls = files
      .map(file => file.download_url)
      .filter(Boolean) as string[];

    if (fileUrls.length === 0) {
      return;
    }

  // 动态导入避免循环依赖
  const { getFileContent } = await import('./ContentService');

  // 使用增强的批处理器预加载
  const prefetchPromises = fileUrls.map(url =>
    batcher.enqueue(`prefetch:${url}`, async () => {
      // 直接通过统一通道获取并写入缓存
      await getFileContent(url);
      return null;
    }, {
        priority,
        method: 'GET',
        headers: getAuthHeaders() as Record<string, string>,
        skipDeduplication: false
      }).catch(() => null) // 忽略预加载失败
    );

    await Promise.allSettled(prefetchPromises);
}

// 为了向后兼容，导出一个包含所有函数的对象
export const GitHubPrefetchService = {
  prefetchContents,
  batchPrefetchContents,
  prefetchRelatedContent
} as const;
