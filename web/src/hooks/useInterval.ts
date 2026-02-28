import { useRef, useEffect } from 'react';

/**
 * useInterval — Declarative setInterval that auto-cleans.
 *
 * Pass `null` as delay to pause the interval.
 *
 * @example
 * useInterval(() => fetchMessages(), isActive ? 5000 : null);
 */
export function useInterval(callback: () => void, delayMs: number | null): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (delayMs === null) return;
    const id = setInterval(() => callbackRef.current(), delayMs);
    return () => clearInterval(id);
  }, [delayMs]);
}
