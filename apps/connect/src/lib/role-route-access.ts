import type { Role } from "@lumenx/types";

export type ConnectRoleGateDecision = "loading" | "allow" | "deny";

/**
 * Role gate for authenticated feature routes.
 * Fail closed for unknown/missing roles once hydrated.
 */
export function getConnectRoleGateDecision(
  hydrated: boolean,
  role: Role | null | undefined,
  allowed: readonly Role[],
): ConnectRoleGateDecision {
  if (!hydrated) return "loading";
  if (!role || !allowed.includes(role)) return "deny";
  return "allow";
}

/** Default home for denied deep links — never loop back to the denied route. */
export const CONNECT_ROLE_DENIED_REDIRECT = "/" as const;
