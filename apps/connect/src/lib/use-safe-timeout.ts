import { useCallback, useEffect, useRef } from "react";

/**
 * setTimeout that auto-clears on unmount so async auth demos cannot
 * call setState / navigate after the component is gone.
 */
export function useSafeTimeout() {
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    const active = timers.current;
    return () => {
      active.forEach((id) => clearTimeout(id));
      active.clear();
    };
  }, []);

  return useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
    return id;
  }, []);
}
