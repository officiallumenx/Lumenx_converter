import { cors } from "hono/cors";
import type { Env } from "../config/env.js";

/**
 * Controlled CORS — only the origins listed in `CORS_ORIGINS` are reflected.
 * No wildcard in production.
 */
export function corsMiddleware(env: Env) {
  const allowedSet = new Set(env.CORS_ORIGINS);

  return cors({
    origin: (origin) => {
      if (allowedSet.has(origin)) return origin;
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
