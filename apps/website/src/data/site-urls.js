/**
 * Canonical public URLs for sitemap and route tests.
 * Excludes stub/incomplete pages: /blog, /signin, /signup.
 */

export const SITE_ORIGIN = "https://lumenxtech.in";

/** Paths that must exist as real intentional marketing pages. */
export const CANONICAL_PATHS = [
  "/",
  "/about",
  "/contact",
  "/cookies",
  "/data-request",
  "/downloads",
  "/get-started",
  "/login",
  "/modules",
  "/platform",
  "/platform/admin",
  "/platform/admissions",
  "/platform/careers",
  "/platform/connect",
  "/platform/nexus",
  "/platform/transport",
  "/pricing",
  "/privacy",
  "/resources",
  "/resources/faq",
  "/resources/help",
  "/solutions",
  "/solutions/administrators",
  "/solutions/drivers",
  "/solutions/institutions",
  "/solutions/parents",
  "/solutions/students",
  "/solutions/teachers",
  "/terms",
];

/** Paths intentionally excluded from the sitemap. */
export const SITEMAP_EXCLUDED = ["/blog", "/signin", "/signup"];
