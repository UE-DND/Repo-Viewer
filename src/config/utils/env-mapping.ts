/**
 * 环境变量映射工具
 * 处理环境变量的自动映射和同步
 */

import { ENV_MAPPING, CONFIG_DEFAULTS } from '../constants';
import type { EnvMappingOptions } from '../types';

const runtimeProcessEnv: Record<string, string | undefined> | undefined =
  typeof process !== 'undefined' && process.env ? process.env : undefined;

/**
 * 标准化环境变量值
 */
const normalizeEnvValue = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

/**
 * Vite 构建侧辅助：
 * - 将无前缀环境变量按 ENV_MAPPING 注入为对应的 VITE_ 前缀变量，供前端 import.meta.env 使用
 * - 在开发环境可选地将 GITHUB_PAT* 同步为 VITE_GITHUB_PAT*，避免令牌在生产构建中被暴露
 */
export function applyEnvMappingForVite(
  env: Record<string, string | undefined>,
  options: EnvMappingOptions = {}
): void {
  const { isProdLike = false } = options;

  // 1) 通用映射：无前缀 -> VITE_
  Object.entries(ENV_MAPPING).forEach(([plainKey, viteKey]) => {
    const viteValue = normalizeEnvValue(env[viteKey] ?? runtimeProcessEnv?.[viteKey]);
    const plainValue = normalizeEnvValue(env[plainKey] ?? runtimeProcessEnv?.[plainKey]);
    if (!viteValue && plainValue) {
      // 写回到两处，确保 Vite dev/build 与后续 import.meta.env 都可见
      env[viteKey] = plainValue;
      if (typeof process !== 'undefined' && process.env) {
        process.env[viteKey] = plainValue;
      }
    }
  });

  // 2) PAT 同步（仅在非生产模式下），避免生产构建把令牌注入前端
  if (!isProdLike) {
    const plainPrefix = 'GITHUB_PAT';
    const vitePrefix = 'VITE_GITHUB_PAT';

    // 基础（无数字后缀）
    const basePlain = normalizeEnvValue(env[plainPrefix] ?? runtimeProcessEnv?.[plainPrefix]);
    const baseVite = normalizeEnvValue(env[vitePrefix] ?? runtimeProcessEnv?.[vitePrefix]);
    if (basePlain && !baseVite) {
      env[vitePrefix] = basePlain;
      if (typeof process !== 'undefined' && process.env) {
        process.env[vitePrefix] = basePlain;
      }
    }

    // 带数字后缀 1..MAX
    for (let i = 1; i <= CONFIG_DEFAULTS.MAX_PAT_NUMBER; i++) {
      const pKey = `${plainPrefix}${i}`;
      const vKey = `${vitePrefix}${i}`;
      const pVal = normalizeEnvValue(env[pKey] ?? runtimeProcessEnv?.[pKey]);
      const vVal = normalizeEnvValue(env[vKey] ?? runtimeProcessEnv?.[vKey]);
      if (pVal && !vVal) {
        env[vKey] = pVal;
        if (typeof process !== 'undefined' && process.env) {
          process.env[vKey] = pVal;
        }
      }
    }
  }
}

/**
 * 支持从无前缀变量自动映射到VITE_前缀变量的解析函数
 */
export const resolveEnvWithMapping = (env: Record<string, any>, plainKey: string, fallback: string): string => {
  // 优先使用VITE_前缀的变量（如果存在）
  const viteKey = ENV_MAPPING[plainKey as keyof typeof ENV_MAPPING];
  if (viteKey) {
    const viteValue = normalizeEnvValue(env[viteKey]);
    if (viteValue) {
      return viteValue;
    }

    // 如果VITE_变量不存在，尝试使用无前缀变量
    const plainValue = normalizeEnvValue(env[plainKey]);
    if (plainValue) {
      return plainValue;
    }

    // 检查runtime环境变量
    if (runtimeProcessEnv) {
      const runtimeViteValue = normalizeEnvValue(runtimeProcessEnv[viteKey]);
      if (runtimeViteValue) {
        return runtimeViteValue;
      }

      const runtimePlainValue = normalizeEnvValue(runtimeProcessEnv[plainKey]);
      if (runtimePlainValue) {
        return runtimePlainValue;
      }
    }
  }

  return fallback;
};

/**
 * 检查环境变量是否有值
 */
export const hasEnvValue = (env: Record<string, any>, keys: string[]): boolean => {
  for (const key of keys) {
    if (normalizeEnvValue(env[key])) {
      return true;
    }
  }

  if (runtimeProcessEnv) {
    for (const key of keys) {
      if (normalizeEnvValue(runtimeProcessEnv[key])) {
        return true;
      }
    }
  }

  return false;
};