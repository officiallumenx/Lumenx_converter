import type { Role, User } from "@lumenx/types";

export type ProtectedRouteDecision = "loading" | "allow" | "redirect";

export function getConnectProtectedRouteDecision(
  hydrated: boolean,
  user: User | null,
  role: Role | null,
): ProtectedRouteDecision {
  if (!hydrated) return "loading";
  return user && role && user.roles.includes(role) ? "allow" : "redirect";
}
