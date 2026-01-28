/**
 * 语言代码类型
 * 支持的语言代码，如 'zh-CN', 'en-US' 等
 */
export type Locale = string;

/**
 * 翻译资源接口
 * 键值对形式的翻译资源
 */
export interface ILocaleJSON {
  [key: string]: string | ILocaleJSON;
}

/**
 * 插值选项接口
 * 用于字符串插值，支持参数替换
 */
export interface InterpolationOptions {
  [key: string]: string | number | undefined;
  count?: number;
}

/**
 * 翻译器选项接口
 */
export interface TranslatorOptions {
  onMissingKeyFn?: (key: string) => string;
  onMissingInterpolationFn?: (key: string, interpolation: string) => void;
}

/**
 * 翻译器接口
 */
export interface ITranslator {
  translate(key: string, options?: InterpolationOptions): string;
}
