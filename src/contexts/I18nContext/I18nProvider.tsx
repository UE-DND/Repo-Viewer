import React, { useEffect, useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import I18N from '@/utils/i18n/i18n';
import type { Locale, ILocaleJSON } from '@/utils/i18n/types';
import { getBrowserLocale, getLocAttributes } from '@/utils/i18n/locale';
import { I18nContext, type I18nContextValue } from './context';
import { logger } from '@/utils';

/**
 * I18n Provider 组件属性
 */
interface I18nProviderProps {
  children: ReactNode;
  /** 初始语言代码，如果不提供则从浏览器获取 */
  initialLocale?: Locale;
}

/**
 * 动态导入翻译文件
 */
async function loadTranslations(locale: Locale): Promise<ILocaleJSON> {
  try {
    // 动态导入翻译文件
    const translations = await import(`@/locales/${locale}/translations.json`) as { default?: ILocaleJSON } & ILocaleJSON;
    return translations.default ?? translations;
  } catch (error) {
    logger.warn(`Failed to load translations for locale: ${locale}`, error);

    // 如果加载失败，尝试加载默认语言（中文）
    if (locale !== 'zh-CN') {
      try {
        const fallbackTranslations = await import('@/locales/zh-CN/translations.json') as { default?: ILocaleJSON } & ILocaleJSON;
        return fallbackTranslations.default ?? fallbackTranslations;
      } catch (fallbackError) {
        logger.error('Failed to load fallback translations', fallbackError);
      }
    }

    // 如果都失败了，返回空对象
    return {};
  }
}

/**
 * I18n Provider
 */
export function I18nProvider({ children, initialLocale }: I18nProviderProps): React.ReactElement {
  const [locale] = useState<Locale>(() => {
    return initialLocale ?? getBrowserLocale();
  });

  const [translations, setTranslations] = useState<ILocaleJSON>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 加载翻译资源
  useEffect(() => {
    let isMounted = true;

    async function loadLocaleTranslations(): Promise<void> {
      setIsLoading(true);
      try {
        const loadedTranslations = await loadTranslations(locale);
        if (isMounted) {
          setTranslations(loadedTranslations);
          setIsLoading(false);
        }
      } catch (error) {
        logger.error('Failed to load locale translations', error);
        if (isMounted) {
          setTranslations({});
          setIsLoading(false);
        }
      }
    }

    void loadLocaleTranslations();

    return () => {
      isMounted = false;
    };
  }, [locale]);

  // 注意：不启用开发环境下的翻译热更新，避免与运行时状态不一致

  // 设置 HTML 属性
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const attributes = getLocAttributes(locale);
    const htmlElement = window.document.documentElement;

    htmlElement.setAttribute('lang', attributes.lang);
    htmlElement.setAttribute('dir', attributes.dir);
  }, [locale]);

  // 创建 I18N 实例
  const i18n = useMemo(() => {
    return new I18N(locale, translations, false, isLoading);
  }, [locale, translations, isLoading]);

  // 上下文值
  const contextValue: I18nContextValue = useMemo(() => ({
    i18n,
    t: i18n.t,
    locale,
  }), [i18n, locale]);

  // 即使正在加载也直接渲染，因为即使没有翻译，应用也应该能运行

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
}

