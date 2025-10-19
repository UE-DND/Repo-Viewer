/**
 * 哈希工具模块
 * 
 * 提供基于 Web Crypto API 的标准哈希算法实现。
 * 用于生成可靠的缓存键、数据指纹等。
 */

/**
 * 哈希算法类型
 */
export type HashAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';

/**
 * 使用 Web Crypto API 生成字符串的哈希值
 * 
 * @param input - 要哈希的字符串
 * @param algorithm - 哈希算法，默认为 SHA-256
 * @param length - 返回的哈希长度（字符数），默认为16
 * @returns Promise，解析为十六进制格式的哈希字符串
 * 
 * @example
 * const hash = await hashString('my-data', 'SHA-256', 16);
 * // 返回: 'a3f2d9e8b1c4f7a0'
 */
export async function hashString(
  input: string,
  algorithm: HashAlgorithm = 'SHA-256',
  length = 16
): Promise<string> {
  // 将字符串编码为 Uint8Array
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  
  // 使用 Web Crypto API 计算哈希
  const hashBuffer = await crypto.subtle.digest(algorithm, data);
  
  // 转换为十六进制字符串
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
  
  // 返回指定长度的哈希
  return hashHex.substring(0, length);
}

/**
 * 同步哈希函数（使用快速非加密哈希）
 * 
 * 适用于不需要加密安全性的场景，如缓存键生成。
 * 使用改进的 cyrb53 算法，提供良好的分布性和低冲突率。
 * 
 * @param str - 要哈希的字符串
 * @param seed - 可选的种子值，默认为0
 * @returns 十六进制格式的哈希字符串
 * 
 * @example
 * const hash = hashStringSync('my-data');
 * // 返回: 'a3f2d9e8b1c4f7'
 */
export function hashStringSync(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  
  const hash = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return hash.toString(16).padStart(14, '0');
}

/**
 * 生成缓存键
 * 
 * 为给定的组件生成一个优化的缓存键。
 * 优先使用同步哈希以提高性能，仅在需要时使用加密哈希。
 * 
 * @param components - 缓存键的组成部分
 * @param prefix - 可选的前缀，默认为空
 * @param useSecure - 是否使用加密安全的哈希，默认为 false
 * @returns Promise，解析为缓存键字符串
 * 
 * @example
 * // 同步哈希（默认）
 * const key = await generateCacheKey(['branch', 'path'], 'c_');
 * // 返回: 'c_a3f2d9e8b1c4f7'
 * 
 * // 加密哈希
 * const secureKey = await generateCacheKey(['sensitive', 'data'], 'sk_', true);
 * // 返回: 'sk_a3f2d9e8b1c4f7a0'
 */
export async function generateCacheKey(
  components: string[],
  prefix = '',
  useSecure = false
): Promise<string> {
  const keyString = components.join(':');
  
  if (useSecure) {
    // 使用加密安全的哈希
    const hash = await hashString(keyString, 'SHA-256', 16);
    return `${prefix}${hash}`;
  } else {
    // 使用快速同步哈希
    const hash = hashStringSync(keyString);
    return `${prefix}${hash}`;
  }
}

/**
 * 生成数据指纹
 * 
 * 为数据对象生成一个唯一的指纹，用于版本控制或变更检测。
 * 
 * @param data - 要生成指纹的数据对象
 * @param algorithm - 哈希算法，默认为 SHA-256
 * @returns Promise，解析为指纹字符串
 * 
 * @example
 * const fingerprint = await generateDataFingerprint({ 
 *   files: [...], 
 *   timestamp: Date.now() 
 * });
 */
export async function generateDataFingerprint(
  data: unknown,
  algorithm: HashAlgorithm = 'SHA-256'
): Promise<string> {
  // 将数据序列化为规范化的 JSON 字符串
  const jsonString = JSON.stringify(data, Object.keys(data as object).sort());
  return hashString(jsonString, algorithm, 32);
}

/**
 * 批量生成缓存键
 * 
 * 为多个项目批量生成缓存键，提高性能。
 * 
 * @param items - 项目数组，每项包含缓存键的组成部分
 * @param prefix - 可选的前缀
 * @returns 缓存键数组
 * 
 * @example
 * const keys = batchGenerateCacheKeys([
 *   ['branch1', 'path1'],
 *   ['branch1', 'path2'],
 *   ['branch2', 'path1']
 * ], 'c_');
 */
export function batchGenerateCacheKeys(
  items: string[][],
  prefix = ''
): string[] {
  // 使用同步哈希以提高批量处理性能
  return items.map(components => {
    const keyString = components.join(':');
    const hash = hashStringSync(keyString);
    return `${prefix}${hash}`;
  });
}

/**
 * 哈希工具命名空间
 */
export const HashUtils = {
  hashString,
  hashStringSync,
  generateCacheKey,
  generateDataFingerprint,
  batchGenerateCacheKeys
} as const;
