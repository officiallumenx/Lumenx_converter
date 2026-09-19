export type NexusProtectedRouteDecision = "loading" | "allow" | "redirect-login" | "redirect-home";

/**
 * Nexus API-mode gate:
 * - when requireLogin is false, app routes stay open; /login redirects home
 * - when requireLogin is true: /login public; other routes need a session
 */
export function getNexusProtectedRouteDecision(input: {
  apiMode: boolean;
  pathname: string;
  hydrated: boolean;
  hasOperatorSession: boolean;
  requireLogin?: boolean;
}): NexusProtectedRouteDecision {
  const onLogin = input.pathname === "/login" || input.pathname.startsWith("/login/");
  if (!input.apiMode || input.requireLogin === false) {
    return onLogin ? "redirect-home" : "allow";
  }
  if (!input.hydrated) return "loading";
  if (onLogin) {
    return input.hasOperatorSession ? "redirect-home" : "allow";
  }
  return input.hasOperatorSession ? "allow" : "redirect-login";
}
