import type { TransportSessionUser } from "./transport-auth";

export type ProtectedRouteDecision = "loading" | "allow" | "redirect";

export function getTransportProtectedRouteDecision(
  hydrated: boolean,
  user: TransportSessionUser | null,
): ProtectedRouteDecision {
  if (!hydrated) return "loading";
  return user ? "allow" : "redirect";
}
