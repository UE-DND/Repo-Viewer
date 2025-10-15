import { ENV_MAPPING, CONFIG_DEFAULTS } from '../constants';
import type { EnvMappingOptions } from '../types';

type MutableEnvRecord = Record<string, string | undefined>;
type EnvLookupRecord = Record<string, unknown>;

const getProcessEnvRecord = (): MutableEnvRecord | undefined => {
  const globalProcess = (globalThis as { process?: { env?: unknown } }).process;
  if (globalProcess !== undefined && typeof globalProcess.env === 'object' && globalProcess.env !== null) {
    return globalProcess.env as MutableEnvRecord;
  }
  return undefined;
};

const runtimeProcessEnv = getProcessEnvRecord();

const setProcessEnvValue = (key: string, value: string): void => {
  const processEnv = getProcessEnvRecord();
  if (processEnv !== undefined) {
    processEnv[key] = value;
  }
};

const normalizeEnvValue = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export function applyEnvMappingForVite(
  env: MutableEnvRecord,
  options: EnvMappingOptions = {}
): void {
  const { isProdLike = false } = options;

  // 1) 通用映射：无前缀 -> VITE_
  Object.entries(ENV_MAPPING).forEach(([plainKey, viteKey]) => {
    const viteValue = normalizeEnvValue(env[viteKey] ?? runtimeProcessEnv?.[viteKey]);
    const plainValue = normalizeEnvValue(env[plainKey] ?? runtimeProcessEnv?.[plainKey]);
    if (viteValue === undefined && plainValue !== undefined) {
      // 写回到两处，确保 Vite dev/build 与后续 import.meta.env 都可见
      env[viteKey] = plainValue;
      setProcessEnvValue(viteKey, plainValue);
    }
  });

  // 2) PAT 同步（仅在非生产模式下），避免生产构建把令牌注入前端
  if (!isProdLike) {
    const plainPrefix = 'GITHUB_PAT';
    const vitePrefix = 'VITE_GITHUB_PAT';

    // 基础（无数字后缀）
    const basePlain = normalizeEnvValue(env[plainPrefix] ?? runtimeProcessEnv?.[plainPrefix]);
    const baseVite = normalizeEnvValue(env[vitePrefix] ?? runtimeProcessEnv?.[vitePrefix]);
    if (basePlain !== undefined && baseVite === undefined) {
      env[vitePrefix] = basePlain;
      setProcessEnvValue(vitePrefix, basePlain);
    }

    // 带数字后缀 1..MAX
    for (let i = 1; i <= CONFIG_DEFAULTS.MAX_PAT_NUMBER; i++) {
      const suffix = String(i);
      const pKey = `${plainPrefix}${suffix}`;
      const vKey = `${vitePrefix}${suffix}`;
      const pVal = normalizeEnvValue(env[pKey] ?? runtimeProcessEnv?.[pKey]);
      const vVal = normalizeEnvValue(env[vKey] ?? runtimeProcessEnv?.[vKey]);
      if (pVal !== undefined && vVal === undefined) {
        env[vKey] = pVal;
        setProcessEnvValue(vKey, pVal);
      }
    }
  }
}

/**
 * 解析环境变量（支持映射）
 * 
 * 查找环境变量值，支持Vite前缀映射和后备值。
 * 
 * @param env - 环境变量记录
 * @param plainKey - 无前缀的键名
 * @param fallback - 后备值
 * @returns 解析后的环境变量值
 */
export const resolveEnvWithMapping = (
  env: EnvLookupRecord,
  plainKey: string,
  fallback: string
): string => {
  // 优先使用VITE_前缀的变量（如果存在）
  const viteKey = ENV_MAPPING[plainKey as keyof typeof ENV_MAPPING];
  if (typeof viteKey === 'string') {
    const viteValue = normalizeEnvValue(env[viteKey]);
    if (viteValue !== undefined) {
      return viteValue;
    }

    // 如果VITE_变量不存在，尝试使用无前缀变量
    const plainValue = normalizeEnvValue(env[plainKey]);
    if (plainValue !== undefined) {
      return plainValue;
    }

    // 检查runtime环境变量
    if (runtimeProcessEnv !== undefined) {
      const runtimeViteValue = normalizeEnvValue(runtimeProcessEnv[viteKey]);
      if (runtimeViteValue !== undefined) {
        return runtimeViteValue;
      }

      const runtimePlainValue = normalizeEnvValue(runtimeProcessEnv[plainKey]);
      if (runtimePlainValue !== undefined) {
        return runtimePlainValue;
      }
    }
  }

  return fallback;
};

export const hasEnvValue = (env: EnvLookupRecord, keys: string[]): boolean => {
  for (const key of keys) {
    if (normalizeEnvValue(env[key]) !== undefined) {
      return true;
    }
  }

  if (runtimeProcessEnv !== undefined) {
    for (const key of keys) {
      if (normalizeEnvValue(runtimeProcessEnv[key]) !== undefined) {
        return true;
      }
    }
  }

  return false;
};
