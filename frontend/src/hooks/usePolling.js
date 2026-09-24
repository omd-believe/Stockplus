import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * usePolling(callback, intervalMs, enabled)
 * - Runs immediately on mount or when enabled becomes true.
 * - Polls every intervalMs (default 5000ms).
 * - Pauses when document.visibilityState === 'hidden'.
 * - Resumes with an immediate fetch when returning to visible.
 * - Backs off to 15,000ms on error.
 * - Ignores stale responses using request IDs.
 * - Cleans up timers on unmount.
 */
export function usePolling(callback, intervalMs = 5000, enabled = true) {
  const [isFailing, setIsFailing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => Date.now());
  const timerRef = useRef(null);
  const requestIdRef = useRef(0);
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  const executePoll = useCallback(async () => {
    if (!enabled) return;
    const currentRequestId = ++requestIdRef.current;

    try {
      await savedCallback.current();
      if (currentRequestId === requestIdRef.current) {
        setIsFailing(false);
        setLastUpdated(Date.now());
        scheduleNext(intervalMs);
      }
    } catch (err) {
      if (currentRequestId === requestIdRef.current) {
        setIsFailing(true);
        // Back off to 15 seconds after an error
        scheduleNext(15000);
      }
    }
  }, [enabled, intervalMs]);

  const scheduleNext = (delay) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (document.visibilityState !== 'hidden') {
        executePoll();
      }
    }, delay);
  };

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    // Initial immediate fetch
    executePoll();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Immediate fetch on return
        executePoll();
      } else {
        if (timerRef.current) clearTimeout(timerRef.current);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, executePoll]);

  return { isFailing, lastUpdated, refresh: executePoll };
}
