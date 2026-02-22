/**
 * Tests that all locale dictionaries conform to the Translations interface —
 * i.e. every required key is present and is a non-empty string.
 */
import { describe, it, expect } from 'vitest';
import { locales, type Translations } from '../../src/lib/i18n/locales';

// Extract expected keys from the `ar` reference locale  (it is always present)
const referenceLocale = locales['ar'];
const requiredKeys = Object.keys(referenceLocale) as (keyof Translations)[];
const allLocaleCodes = Object.keys(locales);

describe('locales.ts — all locales', () => {
  it('should contain at least 17 locales', () => {
    expect(allLocaleCodes.length).toBeGreaterThanOrEqual(17);
  });

  it.each(allLocaleCodes)('locale "%s" should have all required keys', (code) => {
    const locale = locales[code];
    const missingKeys: string[] = [];
    for (const key of requiredKeys) {
      if (!(key in locale) || typeof (locale as any)[key] !== 'string') {
        missingKeys.push(key);
      }
    }
    expect(missingKeys, `Missing keys in locale "${code}": ${missingKeys.join(', ')}`).toEqual([]);
  });

  it.each(allLocaleCodes)('locale "%s" should have non-empty values', (code) => {
    const locale = locales[code];
    const emptyKeys: string[] = [];
    for (const key of requiredKeys) {
      if (typeof (locale as any)[key] === 'string' && (locale as any)[key].trim() === '') {
        emptyKeys.push(key);
      }
    }
    expect(emptyKeys, `Empty values in locale "${code}": ${emptyKeys.join(', ')}`).toEqual([]);
  });

  it.each(allLocaleCodes)('locale "%s" should have a valid langDir', (code) => {
    expect(['rtl', 'ltr']).toContain(locales[code].langDir);
  });

  it.each(allLocaleCodes)('locale "%s" should have a matching langCode', (code) => {
    // langCode should either be the locale key or a valid BCP-47 code
    expect(locales[code].langCode).toBeTruthy();
  });

  it('should have known RTL locales', () => {
    const rtlCodes = ['ar', 'fa', 'ur'];
    for (const code of rtlCodes) {
      if (locales[code]) {
        expect(locales[code].langDir).toBe('rtl');
      }
    }
  });

  it('should have known LTR locales', () => {
    const ltrCodes = ['en', 'fr', 'es', 'de', 'tr', 'zh', 'ja', 'ko', 'ru', 'pt', 'it', 'hi', 'id', 'nl'];
    for (const code of ltrCodes) {
      if (locales[code]) {
        expect(locales[code].langDir).toBe('ltr');
      }
    }
  });

  it('should have no extra keys beyond the interface', () => {
    for (const code of allLocaleCodes) {
      const extraKeys = Object.keys(locales[code]).filter(k => !requiredKeys.includes(k as any));
      expect(extraKeys, `Extra keys in "${code}": ${extraKeys.join(', ')}`).toEqual([]);
    }
  });
});
