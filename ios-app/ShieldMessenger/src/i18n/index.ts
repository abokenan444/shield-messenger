/**
 * Shield Messenger — Internationalization (i18n) Setup
 * Matches Android's 17 supported languages.
 */

import {NativeModules, Platform} from 'react-native';

import en from './locales/en.json';
import ar from './locales/ar.json';
import fr from './locales/fr.json';
import es from './locales/es.json';
import de from './locales/de.json';
import tr from './locales/tr.json';
import fa from './locales/fa.json';
import ur from './locales/ur.json';
import zh from './locales/zh.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import ru from './locales/ru.json';
import pt from './locales/pt.json';
import it from './locales/it.json';
import hi from './locales/hi.json';
import id from './locales/id.json';
import nl from './locales/nl.json';

export type TranslationKey = keyof typeof en;

const translations: Record<string, Record<string, string>> = {
  en, ar, fr, es, de, tr, fa, ur, zh, ja, ko, ru, pt, it, hi, id, nl,
};

let currentLocale = 'en';

/**
 * Detect device locale.
 */
function getDeviceLocale(): string {
  let locale = 'en';
  try {
    if (Platform.OS === 'ios') {
      locale =
        NativeModules.SettingsManager?.settings?.AppleLocale ||
        NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] ||
        'en';
    } else {
      locale = NativeModules.I18nManager?.localeIdentifier || 'en';
    }
  } catch {
    locale = 'en';
  }
  // Extract language code (e.g., 'ar_SA' → 'ar', 'zh-Hans' → 'zh')
  return locale.split(/[-_]/)[0].toLowerCase();
}

/**
 * Initialize i18n with device locale.
 */
export function initI18n(): void {
  const detected = getDeviceLocale();
  if (translations[detected]) {
    currentLocale = detected;
  }
}

/**
 * Set locale manually.
 */
export function setLocale(locale: string): void {
  const lang = locale.split(/[-_]/)[0].toLowerCase();
  if (translations[lang]) {
    currentLocale = lang;
  }
}

/**
 * Get current locale.
 */
export function getLocale(): string {
  return currentLocale;
}

/**
 * Get all supported locales.
 */
export function getSupportedLocales(): string[] {
  return Object.keys(translations);
}

/**
 * Translate a key, falling back to English.
 */
export function t(key: string): string {
  return translations[currentLocale]?.[key] || translations.en?.[key] || key;
}

/**
 * Check if current locale is RTL (Arabic, Persian, Urdu).
 */
export function isRTL(): boolean {
  return ['ar', 'fa', 'ur'].includes(currentLocale);
}

// Initialize on import
initI18n();

export default {t, setLocale, getLocale, getSupportedLocales, isRTL, initI18n};
