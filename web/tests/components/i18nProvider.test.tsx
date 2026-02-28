/**
 * Tests for the I18nProvider and useTranslation hook.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { I18nProvider, useTranslation } from '../../src/lib/i18n';
import type { ReactNode } from 'react';

function wrapper({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

describe('I18nProvider + useTranslation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should default to English locale', () => {
    const { result } = renderHook(() => useTranslation(), { wrapper });
    expect(result.current.locale).toBe('en');
    expect(result.current.dir).toBe('ltr');
    expect(result.current.t.langName).toBe('English');
  });

  it('should switch to English', () => {
    const { result } = renderHook(() => useTranslation(), { wrapper });
    act(() => {
      result.current.setLocale('en' as any);
    });
    expect(result.current.locale).toBe('en');
    expect(result.current.dir).toBe('ltr');
    expect(result.current.t.sidebar_chats).toBe('Chats');
  });

  it('should persist locale in localStorage', () => {
    const { result } = renderHook(() => useTranslation(), { wrapper });
    act(() => {
      result.current.setLocale('fr' as any);
    });
    expect(localStorage.getItem('sl-lang')).toBe('fr');
  });

  it('should restore locale from localStorage', () => {
    localStorage.setItem('sl-lang', 'de');
    const { result } = renderHook(() => useTranslation(), { wrapper });
    expect(result.current.locale).toBe('de');
    expect(result.current.t.langName).toBe('Deutsch');
  });

  it('should ignore invalid locale codes', () => {
    const { result } = renderHook(() => useTranslation(), { wrapper });
    act(() => {
      result.current.setLocale('invalid-code!!' as any);
    });
    // Should still be English (the default)
    expect(result.current.locale).toBe('en');
  });

  it('should provide all translation keys', () => {
    const { result } = renderHook(() => useTranslation(), { wrapper });
    const t = result.current.t;
    // Spot-check critical keys
    expect(t.sidebar_chats).toBeTruthy();
    expect(t.sidebar_settings).toBeTruthy();
    expect(t.login_login).toBeTruthy();
    expect(t.register_create).toBeTruthy();
    expect(t.wallet_title).toBeTruthy();
    expect(t.security_title).toBeTruthy();
  });
});
