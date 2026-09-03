import { createMiddleware } from "hono/factory";
import type { Env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";
import type { AppBindings } from "../types/app.js";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function resetRateLimitBuckets(): void {
  buckets.clear();
}

function clientKey(c: {
  req: { header: (name: string) => string | undefined; path: string };
}): string {
  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return `ip:${first}`;
  }
  const realIp = c.req.header("x-real-ip")?.trim();
  if (realIp) return `ip:${realIp}`;
  return "ip:unknown";
}

function isAuthPath(path: string): boolean {
  return (
    path.startsWith("/api/v1/auth/") ||
    path.startsWith("/api/nexus/auth/")
  );
}

function take(key: string, max: number, windowMs: number): {
  allowed: boolean;
  retryAfterSec: number;
} {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: Math.ceil(windowMs / 1000) };
  }
  if (existing.count >= max) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  existing.count += 1;
  return {
    allowed: true,
    retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

/**
 * In-process sliding-window limiter (per IP). Disable with RATE_LIMIT_MAX=0.
 * Auth OTP routes use the tighter RATE_LIMIT_AUTH_* pair when set.
 */
export function rateLimitMiddleware(env: Env) {
  return createMiddleware<AppBindings>(async (c, next) => {
    const auth = isAuthPath(c.req.path);
    const max = auth ? env.RATE_LIMIT_AUTH_MAX : env.RATE_LIMIT_MAX;
    const windowMs = auth
      ? env.RATE_LIMIT_AUTH_WINDOW_MS
      : env.RATE_LIMIT_WINDOW_MS;

    if (max <= 0 || windowMs <= 0) {
      await next();
      return;
    }

    const key = `${auth ? "auth" : "api"}:${clientKey(c)}`;
    const result = take(key, max, windowMs);
    c.header("X-RateLimit-Limit", String(max));
    if (!result.allowed) {
      c.header("Retry-After", String(result.retryAfterSec));
      throw AppError.rateLimited("Too many requests");
    }
    await next();
  });
}
