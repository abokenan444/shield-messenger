/**
 * Tests that all landing locale dictionaries have the same keys
 * and correct non-empty values.
 */
import { describe, it, expect } from 'vitest';
import { landingLocales, type LandingT } from '../../src/lib/i18n/landingLocales';

const referenceLang = landingLocales['ar'] || landingLocales['en'];
const requiredKeys = Object.keys(referenceLang) as (keyof LandingT)[];
const allLocaleCodes = Object.keys(landingLocales);

describe('landingLocales.ts — all landing locales', () => {
  it('should contain at least 18 locales', () => {
    expect(allLocaleCodes.length).toBeGreaterThanOrEqual(18);
  });

  it.each(allLocaleCodes)('landing locale "%s" should have all required keys', (code) => {
    const locale = landingLocales[code];
    const missingKeys: string[] = [];
    for (const key of requiredKeys) {
      if (!(key in locale) || typeof (locale as any)[key] !== 'string') {
        missingKeys.push(key);
      }
    }
    expect(missingKeys, `Missing keys in landing locale "${code}": ${missingKeys.join(', ')}`).toEqual([]);
  });

  it.each(allLocaleCodes)('landing locale "%s" should have non-empty values', (code) => {
    const locale = landingLocales[code];
    const emptyKeys: string[] = [];
    for (const key of requiredKeys) {
      if (typeof (locale as any)[key] === 'string' && (locale as any)[key].trim() === '') {
        emptyKeys.push(key);
      }
    }
    expect(emptyKeys, `Empty values in landing locale "${code}": ${emptyKeys.join(', ')}`).toEqual([]);
  });

  it.each(allLocaleCodes)('landing locale "%s" should have no extra keys', (code) => {
    const extraKeys = Object.keys(landingLocales[code]).filter(
      k => !requiredKeys.includes(k as any)
    );
    expect(extraKeys, `Extra keys in landing locale "${code}": ${extraKeys.join(', ')}`).toEqual([]);
  });
});

describe('getLandingT', () => {
  it('should return English fallback for unknown locale', async () => {
    const { getLandingT } = await import('../../src/lib/i18n/landingLocales');
    const t = getLandingT('xx');
    expect(t).toBe(landingLocales['en']);
  });

  it('should return correct locale when available', async () => {
    const { getLandingT } = await import('../../src/lib/i18n/landingLocales');
    const t = getLandingT('ar');
    expect(t).toBe(landingLocales['ar']);
  });
});
