import { useRef, useCallback } from 'react';

/**
 * Exponential moving average smoother for distance values.
 * alpha: weight for the newest reading (0–1). Lower = smoother but slower to respond.
 */
export function useSmoothedDistance(alpha = 0.2) {
  const smoothed = useRef<number | null>(null);

  const push = useCallback((value: number): number => {
    if (smoothed.current === null) {
      smoothed.current = value;
    } else {
      smoothed.current = alpha * value + (1 - alpha) * smoothed.current;
    }
    return smoothed.current;
  }, [alpha]);

  const reset = useCallback(() => {
    smoothed.current = null;
  }, []);

  return { push, reset };
}
