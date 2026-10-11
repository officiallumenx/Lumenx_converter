import { useApp } from "@/lib/app-state";
import { normalizeConnectQueryUserId } from "./scope";

/** Stable user id segment for Connect query keys (never a token). */
export function useConnectQueryUserId(): string {
  const { user } = useApp();
  return normalizeConnectQueryUserId(user?.id);
}
