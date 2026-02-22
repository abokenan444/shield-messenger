import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type Translations, type LocaleCode, locales, ar } from './locales';

export type { Translations, LocaleCode };
export { locales };

interface I18nContextValue {
  t: Translations;
  locale: string;
  dir: 'rtl' | 'ltr';
  setLocale: (code: LocaleCode) => void;
}

const I18nContext = createContext<I18nContextValue>({
  t: ar,
  locale: 'ar',
  dir: 'rtl',
  setLocale: () => {},
});

const STORAGE_KEY = 'sl-lang';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && locales[saved]) return saved;
    } catch { /* ignore */ }
    return 'ar';
  });

  const t = locales[locale] || ar;

  const setLocale = (code: LocaleCode) => {
    if (!locales[code]) return;
    setLocaleState(code);
    try { localStorage.setItem(STORAGE_KEY, code); } catch { /* ignore */ }
  };

  useEffect(() => {
    document.documentElement.dir = t.langDir;
    document.documentElement.lang = t.langCode;
  }, [t.langDir, t.langCode]);

  return (
    <I18nContext.Provider value={{ t, locale: t.langCode, dir: t.langDir, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  return useContext(I18nContext);
}
