import { cors } from "hono/cors";
import type { Env } from "../config/env.js";

/**
 * Controlled CORS — only the origins listed in `CORS_ORIGINS` are reflected.
 * No wildcard in production.
 */
export function corsMiddleware(env: Env) {
  const allowedSet = new Set(env.CORS_ORIGINS);
  const isDevelopmentLoopback = (origin: string) => {
    if (env.NODE_ENV !== "development") return false;
    try {
      const url = new URL(origin);
      return (
        (url.protocol === "http:" || url.protocol === "https:") &&
        (url.hostname === "localhost" ||
          url.hostname === "127.0.0.1" ||
          url.hostname === "[::1]")
      );
    } catch {
      return false;
    }
  };

  return cors({
    origin: (origin) => {
      if (allowedSet.has(origin) || isDevelopmentLoopback(origin)) return origin;
      return "";
    },
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "X-Request-Id",
      "X-Institute-Id",
      "Idempotency-Key",
    ],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["X-Request-Id"],
    maxAge: 86400,
    credentials: true,
  });
}
