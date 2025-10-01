import { logger } from '../../../utils';
import type { CacheConfig, CacheItemMeta } from './CacheTypes';

export interface PersistenceHandles {
  dbName: string;
  db: IDBDatabase | null;
}

export const buildDbName = (storageKey: string) => `RepoViewerCache_${storageKey.replace(/[^a-zA-Z0-9]/g, '_')}`;

const ensureObjectStore = (db: IDBDatabase, storageKey: string) => {
  if (db.objectStoreNames.contains(storageKey)) return;
  const store = db.createObjectStore(storageKey, { keyPath: 'key' });
  store.createIndex('timestamp', 'timestamp', { unique: false });
  store.createIndex('lastAccess', 'lastAccess', { unique: false });
  logger.debug(`创建IndexedDB object store: ${storageKey}`);
};

const withObjectStore = <T>(
  db: IDBDatabase | null,
  config: CacheConfig,
  mode: IDBTransactionMode,
  fallback: T,
  executor: (store: IDBObjectStore, resolve: (value: T) => void, transaction: IDBTransaction) => void,
): Promise<T> => {
  return new Promise((resolve) => {
    if (!db) return resolve(fallback);
    try {
      if (!db.objectStoreNames.contains(config.storageKey)) return resolve(fallback);
      const transaction = db.transaction([config.storageKey], mode);
      const store = transaction.objectStore(config.storageKey);
      const resolveWithFallback = () => resolve(fallback);
      transaction.onerror = resolveWithFallback;
      transaction.onabort = resolveWithFallback;
      executor(store, resolve, transaction);
    } catch {
      resolve(fallback);
    }
  });
};

export async function initIndexedDB(handles: PersistenceHandles, config: CacheConfig): Promise<void> {
  return new Promise((resolve, reject) => {
    const versionRequest = indexedDB.open(handles.dbName);
    versionRequest.onsuccess = () => {
      const currentDb = versionRequest.result;
      const needsUpgrade = !currentDb.objectStoreNames.contains(config.storageKey);
      const currentVersion = currentDb.version;
      currentDb.close();
      const targetVersion = needsUpgrade ? currentVersion + 1 : currentVersion;
      const request = indexedDB.open(handles.dbName, targetVersion);
      request.onerror = () => {
        logger.warn('IndexedDB打开失败', request.error);
        reject(request.error);
      };
      request.onsuccess = () => {
        handles.db = request.result;
        handles.db.onerror = (event) => logger.warn('IndexedDB运行时错误', event);
        handles.db.onversionchange = () => {
          logger.info('IndexedDB版本变更，关闭连接');
          handles.db?.close();
          handles.db = null;
        };
        resolve();
      };
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        try {
          ensureObjectStore(db, config.storageKey);
        } catch (error) {
          logger.warn('创建IndexedDB object store失败', error);
          throw error;
        }
      };
      request.onblocked = () => {
        logger.warn('IndexedDB升级被阻塞，可能有其他标签页正在使用数据库');
        setTimeout(() => reject(new Error('IndexedDB升级被阻塞')), 5000);
      };
    };
    versionRequest.onerror = () => {
      logger.debug('无法获取IndexedDB版本，尝试创建新数据库');
      const request = indexedDB.open(handles.dbName, 1);
      request.onerror = () => {
        logger.warn('IndexedDB创建失败', request.error);
        reject(request.error);
      };
      request.onsuccess = () => {
        handles.db = request.result;
        resolve();
      };
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        try {
          ensureObjectStore(db, config.storageKey);
        } catch (error) {
          logger.warn('创建IndexedDB object store失败', error);
          throw error;
        }
      };
    };
  });
}

export async function deleteDatabase(dbName: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const deleteRequest = indexedDB.deleteDatabase(dbName);
      deleteRequest.onsuccess = () => {
        logger.debug(`删除IndexedDB数据库成功: ${dbName}`);
        resolve();
      };
      deleteRequest.onerror = () => {
        logger.warn(`删除IndexedDB数据库失败: ${dbName}`, deleteRequest.error);
        resolve();
      };
      deleteRequest.onblocked = () => {
        logger.warn(`删除IndexedDB数据库被阻塞: ${dbName}`);
        setTimeout(() => resolve(), 1000);
      };
    } catch (error) {
      logger.warn(`删除IndexedDB数据库异常: ${dbName}`, error);
      resolve();
    }
  });
}

export function loadItemFromIndexedDB(db: IDBDatabase | null, config: CacheConfig, key: string): Promise<CacheItemMeta | undefined> {
  return withObjectStore(db, config, 'readonly', undefined, (store, resolve) => {
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result ? request.result.data : undefined);
    request.onerror = () => resolve(undefined);
  });
}

export function saveItemToIndexedDB(db: IDBDatabase | null, config: CacheConfig, key: string, item: CacheItemMeta): Promise<void> {
  return withObjectStore(db, config, 'readwrite', undefined, (store, resolve) => {
    const request = store.put({ key, data: item, timestamp: item.timestamp, lastAccess: item.lastAccess });
    request.onsuccess = () => resolve(undefined);
    request.onerror = () => resolve(undefined);
  });
}

export function deleteItemFromIndexedDB(db: IDBDatabase | null, config: CacheConfig, key: string): Promise<void> {
  return withObjectStore(db, config, 'readwrite', undefined, (store, resolve) => {
    const request = store.delete(key);
    request.onsuccess = () => resolve(undefined);
    request.onerror = () => resolve(undefined);
  });
}

export function clearIndexedDB(db: IDBDatabase | null, config: CacheConfig): Promise<void> {
  return withObjectStore(db, config, 'readwrite', undefined, (store, resolve) => {
    const request = store.clear();
    request.onsuccess = () => resolve(undefined);
    request.onerror = () => resolve(undefined);
  });
}

export function loadAllFromIndexedDB(db: IDBDatabase | null, config: CacheConfig): Promise<Array<{ key: string; data: CacheItemMeta; timestamp: number }>> {
  return withObjectStore(db, config, 'readonly', [] as Array<{ key: string; data: CacheItemMeta; timestamp: number }>, (store, resolve) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => resolve([]);
  });
}

export function loadItemFromLocalStorage(config: CacheConfig, key: string): Promise<CacheItemMeta | undefined> {
  return new Promise((resolve) => {
    try {
      const item = localStorage.getItem(`${config.storageKey}_${key}`);
      resolve(item ? JSON.parse(item) : undefined);
    } catch (error) {
      logger.warn('从localStorage加载缓存项失败', error);
      resolve(undefined);
    }
  });
}

export function saveItemToLocalStorage(config: CacheConfig, key: string, item: CacheItemMeta): Promise<void> {
  return new Promise((resolve) => {
    try {
      localStorage.setItem(`${config.storageKey}_${key}`, JSON.stringify(item));
      resolve();
    } catch (error) {
      logger.warn('保存缓存项到localStorage失败', error);
      resolve();
    }
  });
}

export function deleteItemFromLocalStorage(config: CacheConfig, key: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      localStorage.removeItem(`${config.storageKey}_${key}`);
      resolve();
    } catch (error) {
      logger.warn('从localStorage删除缓存项失败', error);
      resolve();
    }
  });
}

export function clearLocalStorage(config: CacheConfig): Promise<void> {
  return new Promise((resolve) => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${config.storageKey}_`)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      resolve();
    } catch (error) {
      logger.warn('清除localStorage失败', error);
      resolve();
    }
  });
}
