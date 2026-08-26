import { secureHeaders } from "hono/secure-headers";

/**
 * Standard security headers via Hono's built-in secureHeaders helper.
 * Sets X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, etc.
 */
export const securityHeaders = secureHeaders();
