import { useCallback, useRef, useState } from "react";
import { isTeacherAccessDenied } from "@/lib/teacher/portal-access-guard";

/** Prevents double-submit / double-click on async actions. */
export function useAsyncAction<T extends (...args: never[]) => Promise<unknown>>(fn: T) {
  const [pending, setPending] = useState(false);
  const lock = useRef(false);

  const run = useCallback(
    async (...args: Parameters<T>) => {
      if (lock.current) return;
      lock.current = true;
      setPending(true);
      try {
        return await fn(...args);
      } catch (error) {
        if (isTeacherAccessDenied(error)) return;
        throw error;
      } finally {
        lock.current = false;
        setPending(false);
      }
    },
    [fn],
  ) as (...args: Parameters<T>) => ReturnType<T>;

  return { run, pending };
}
