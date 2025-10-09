const normalizeString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const parseBoolean = (value: string | undefined): boolean => value === 'true';

export const parseStringArray = (value: string | undefined): string[] => {
  const normalized = normalizeString(value);
  if (normalized === undefined) {
    return [];
  }
  return normalized
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0);
};

export const validateToken = (token: unknown): token is string => {
  const normalized = normalizeString(token);
  if (normalized === undefined) {
    return false;
  }
  if (normalized === 'your_token_here' || normalized.includes('placeholder')) {
    return false;
  }
  return true;
};

export const EnvParser = {
  parseBoolean,
  parseStringArray,
  validateToken
} as const;
