import { useState, useEffect, useCallback, useRef } from 'react';
import { GitHubContent } from '../types';
import { GitHubService } from '../services/github';
import { logger } from '../utils';
import { getPathFromUrl, updateUrlWithHistory, updateUrlWithoutHistory } from '../utils/urlManager';

// 配置
const HOMEPAGE_FILTER_ENABLED = (import.meta.env.HOMEPAGE_FILTER_ENABLED || import.meta.env.VITE_HOMEPAGE_FILTER_ENABLED) === 'true';
const HOMEPAGE_ALLOWED_FILETYPES = (import.meta.env.HOMEPAGE_ALLOWED_FILETYPES || import.meta.env.VITE_HOMEPAGE_ALLOWED_FILETYPES || '')
  .split(',')
  .filter(Boolean)
  .map((type: string) => type.trim().toLowerCase());
const HOMEPAGE_ALLOWED_FOLDERS = (import.meta.env.HOMEPAGE_ALLOWED_FOLDERS || import.meta.env.VITE_HOMEPAGE_ALLOWED_FOLDERS || '')
  .split(',')
  .filter(Boolean)
  .map((folder: string) => folder.trim());

// 状态持久化键
const STORAGE_KEY_CURRENT_PATH = 'repo_viewer_current_path';
const STORAGE_KEY_PATH_TIMESTAMP = 'repo_viewer_path_timestamp';
const PATH_CACHE_TTL = 300000; // 路径缓存有效期，5分钟（单位：毫秒）

// 自定义Hook，管理GitHub内容获取
export const useGitHubContent = () => {
  // 尝试从URL或localStorage恢复路径
  const getSavedPath = (): string => {
    try {
      // 首先尝试从URL获取路径
      const urlPath = getPathFromUrl();
      if (urlPath) {
        logger.debug(`从URL获取路径: ${urlPath}`);
        return urlPath;
      }
      
      // 如果URL中没有路径，尝试从localStorage获取
      if (typeof localStorage !== 'undefined') {
        const savedPath = localStorage.getItem(STORAGE_KEY_CURRENT_PATH);
        const savedTimestamp = localStorage.getItem(STORAGE_KEY_PATH_TIMESTAMP);
        
        // 检查路径是否存在
        if (!savedPath) return '';
        
        // 检查时间戳
        if (savedTimestamp) {
          const timestamp = parseInt(savedTimestamp, 10);
          const now = Date.now();
          
          // 如果路径超过有效期，则清除
          if (now - timestamp > PATH_CACHE_TTL) {
            localStorage.removeItem(STORAGE_KEY_CURRENT_PATH);
            localStorage.removeItem(STORAGE_KEY_PATH_TIMESTAMP);
            logger.debug('路径缓存已过期，已重置');
            return '';
          }
        }
        
        logger.debug(`从localStorage获取路径: ${savedPath}`);
        return savedPath || '';
      }
    } catch (e) {
      logger.error('获取保存的路径失败', e);
    }
    return '';
  };

  const [currentPath, setCurrentPath] = useState<string>(getSavedPath());
  const [contents, setContents] = useState<GitHubContent[]>([]);
  const [readmeContent, setReadmeContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingReadme, setLoadingReadme] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  
  // 使用ref跟踪初始加载状态，避免重复更新URL
  const isInitialLoad = useRef<boolean>(true);
  
  // 保存当前路径到localStorage
  const savePathToStorage = useCallback((path: string) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_CURRENT_PATH, path);
        localStorage.setItem(STORAGE_KEY_PATH_TIMESTAMP, Date.now().toString());
        logger.debug(`保存当前路径到localStorage: ${path}`);
      }
    } catch (e) {
      logger.error('无法保存路径到localStorage', e);
    }
  }, []);

  // 处理错误显示
  const displayError = useCallback((message: string) => {
    setError(message);
    logger.error(message);
  }, []);

  // 加载目录内容
  const loadContents = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    
    try {
      logger.time(`加载目录: ${path}`);
      const data = await GitHubService.getContents(path);
      
      // 按类型和名称排序
      const sortedData = [...data].sort((a, b) => {
        // 目录优先
        if (a.type !== b.type) {
          return a.type === 'dir' ? -1 : 1;
        }
        // 按名称字母顺序
        return a.name.localeCompare(b.name, 'zh-CN');
      });
      
      // 在首页根据文件类型进行过滤
      let filteredData = [...sortedData];
      if (path === '' && HOMEPAGE_FILTER_ENABLED) {
        filteredData = sortedData.filter(item => {
          // 过滤文件夹
          if (item.type === 'dir') {
            return HOMEPAGE_ALLOWED_FOLDERS.length === 0 || HOMEPAGE_ALLOWED_FOLDERS.includes(item.name);
          }
          
          // 过滤文件
          if (HOMEPAGE_ALLOWED_FILETYPES.length === 0) {
            return true; // 如果没有指定允许的文件类型，则显示所有文件
          }
          
          const extension = item.name.split('.').pop()?.toLowerCase();
          return extension && HOMEPAGE_ALLOWED_FILETYPES.includes(extension);
        });
        
        logger.debug(`过滤后剩余 ${filteredData.length} 个文件/目录（过滤前 ${sortedData.length} 个）`);
        logger.debug(`允许的文件夹: ${HOMEPAGE_ALLOWED_FOLDERS.join(', ')}`);
        logger.debug(`允许的文件类型: ${HOMEPAGE_ALLOWED_FILETYPES.join(', ')}`);
      }
      
      setContents(filteredData);
      logger.debug(`获取到 ${filteredData.length} 个文件/目录`);
      
      // 查找README文件
      const readmeItem = sortedData.find(item => 
        item.type === 'file' && 
        item.name.toLowerCase().includes('readme') && 
        item.name.toLowerCase().endsWith('.md')
      );
      
      if (readmeItem) {
        await loadReadmeContent(readmeItem);
      } else {
        setReadmeContent(null);
      }
      
      setLoading(false);
    } catch (e: any) {
      logger.error('获取内容失败:', e);
      displayError(`获取目录内容失败: ${e.message}`);
      setContents([]);
      setLoading(false);
    } finally {
      logger.timeEnd(`加载目录: ${path}`);
    }
  }, [displayError]);

  // 加载README内容
  const loadReadmeContent = useCallback(async (readmeItem: GitHubContent) => {
    if (!readmeItem || !readmeItem.download_url) return;
    
    setLoadingReadme(true);
    setReadmeContent(null);
    
    try {
      logger.time('加载README');
      const content = await GitHubService.getFileContent(readmeItem.download_url);
      logger.debug(`README加载成功: ${readmeItem.path}，内容长度: ${content.length} 字节`);
      setReadmeContent(content);
    } catch (e: any) {
      logger.error(`加载README失败:`, e);
      displayError(`加载 README 失败: ${e.message}`);
      setReadmeContent(null);
    } finally {
      setLoadingReadme(false);
      logger.timeEnd('加载README');
    }
  }, [displayError]);

  // 处理路径变化
  useEffect(() => {
    if (currentPath !== null) {
      // 检查是否是仅主题切换的操作，如果是则不重新加载内容
      const isThemeChangeOnly = document.documentElement.getAttribute('data-theme-change-only') === 'true';
      
      if (!isThemeChangeOnly) {
        loadContents(currentPath);
        savePathToStorage(currentPath);
        
        // 只有在非初始加载时更新URL
        if (!isInitialLoad.current) {
          // 使用历史API更新URL，并添加历史记录
          updateUrlWithHistory(currentPath);
        } else {
          // 初始加载时，如果URL中已有path参数，则不需要更新URL
          const urlPath = getPathFromUrl();
          if (currentPath !== urlPath) {
            // 如果初始加载的路径与URL中的路径不同，更新URL（但不添加历史记录）
            updateUrlWithoutHistory(currentPath);
          }
          isInitialLoad.current = false;
        }
      } else {
        logger.debug('仅主题切换操作，跳过内容重新加载');
      }
    }
  }, [currentPath, refreshTrigger, loadContents, savePathToStorage]);
  
  // 监听浏览器历史导航事件
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      logger.debug('内容管理器: 检测到历史导航事件');
      
      // 从历史状态中获取路径
      const state = event.state as { path?: string; preview?: string } | null;
      logger.debug(`历史状态: ${JSON.stringify(state)}`);
      
      if (state && state.path !== undefined) {
        logger.debug(`历史导航事件，路径: ${state.path}`);
        // 更新当前路径，但不添加新的历史记录
        setCurrentPath(state.path);
      } else {
        // 如果没有state或path未定义，尝试从 URL 获取路径
        const urlPath = getPathFromUrl();
        if (urlPath) {
          logger.debug(`历史导航事件，从URL获取路径: ${urlPath}`);
          setCurrentPath(urlPath);
        } else {
          // 如果URL中也没有路径，重置为根路径
          logger.debug('历史导航事件，无路径状态，重置为根路径');
          setCurrentPath('');
        }
      }
    };
    
    // 添加历史导航事件监听器
    window.addEventListener('popstate', handlePopState);
    
    // 组件卸载时移除监听器
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // 重试加载
  const handleRetry = useCallback(() => {
    setError(null);
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // 强制刷新
  const refresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // 导航到指定路径
  const navigateTo = useCallback((path: string) => {
    setCurrentPath(path);
  }, []);

  return {
    currentPath,
    contents,
    readmeContent,
    loading,
    loadingReadme,
    error,
    navigateTo,
    refresh,
    handleRetry,
    setCurrentPath,
  };
};