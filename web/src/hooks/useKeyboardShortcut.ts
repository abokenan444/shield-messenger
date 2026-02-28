import { useEffect, useRef } from 'react';

type KeyCombo = {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
};

/**
 * useKeyboardShortcut — Listen for a keyboard shortcut.
 *
 * @example
 * useKeyboardShortcut({ key: 'k', ctrl: true }, () => openSearch());
 */
export function useKeyboardShortcut(combo: KeyCombo, callback: () => void): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (combo.ctrl && !e.ctrlKey && !e.metaKey) return;
      if (combo.shift && !e.shiftKey) return;
      if (combo.alt && !e.altKey) return;
      if (combo.meta && !e.metaKey) return;
      if (e.key.toLowerCase() !== combo.key.toLowerCase()) return;

      e.preventDefault();
      callbackRef.current();
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [combo.key, combo.ctrl, combo.shift, combo.alt, combo.meta]);
}
