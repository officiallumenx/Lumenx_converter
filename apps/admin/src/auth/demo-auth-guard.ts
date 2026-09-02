/**
 * Demo-only auth funnel guards — API mode must never use mock OTP or demo setup routes.
 */
import { isApiAuthMode } from "./auth-mode";

/** Routes that belong to the offline demo registration funnel only. */
export const DEMO_ONLY_AUTH_ROUTES = [
  "/verify-email-otp",
  "/verify-mobile-otp",
  "/institute-setup",
] as const;

export type DemoOnlyAuthRoute = (typeof DEMO_ONLY_AUTH_ROUTES)[number];

/** In API mode, redirect demo OTP/setup routes to real pending registration status. */
export function resolveDemoAuthRouteBlock(pathname: string): string | null {
  if (!isApiAuthMode()) return null;
  if ((DEMO_ONLY_AUTH_ROUTES as readonly string[]).includes(pathname)) {
    return "/pending-verification";
  }
  return null;
}

/** API mode must never accept the demo OTP bypass code. */
export function isDemoOtpAllowed(): boolean {
  return !isApiAuthMode();
}
