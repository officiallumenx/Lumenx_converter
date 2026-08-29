import type { InstituteContextStatus } from "@/lib/institutes";

/**
 * Demo mode: writes always allowed (local stores).
 * API mode: write controls only when an institute is selected and context is ready.
 */
export function resolveWritesEnabled(
  apiMode: boolean,
  opts: {
    status: InstituteContextStatus;
    activeInstituteId: string | null;
  },
): boolean {
  if (!apiMode) return true;
  return opts.status === "ready" && Boolean(opts.activeInstituteId);
}
