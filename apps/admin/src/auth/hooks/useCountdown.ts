/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — useCountdown
 *  Reusable countdown timer hook.
 *  Usage:
 *    const { count, isRunning, start, reset } = useCountdown(60);
 * ───────────────────────────────────────────────────────────── */

import { useState, useEffect, useCallback, useRef } from "react";

interface UseCountdownReturn {
  count:     number;
  isRunning: boolean;
  /** Start (or restart) the countdown from `seconds`. */
  start:     () => void;
  /** Reset to 0 and stop. */
  reset:     () => void;
  /** Formatted as "0:45" */
  formatted: string;
}

export function useCountdown(seconds: number): UseCountdownReturn {
  const [count,     setCount]     = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef               = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const start = useCallback(() => {
    stop();
    setCount(seconds);
    setIsRunning(true);
  }, [seconds, stop]);

  const reset = useCallback(() => {
    stop();
    setCount(0);
  }, [stop]);

  useEffect(() => {
    if (!isRunning) return;
    intervalRef.current = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          stop();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, stop]);

  const formatted = `0:${String(count).padStart(2, "0")}`;

  return { count, isRunning, start, reset, formatted };
}
