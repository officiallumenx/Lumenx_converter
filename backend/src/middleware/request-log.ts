import { createMiddleware } from "hono/factory";
import type { Logger } from "../logger/logger.js";

/**
 * Per-request structured log line.
 * Only safe fields: method, path, status, duration, requestId.
 * Never logs headers, bodies, or secret-bearing fields.
 */
export function requestLogMiddleware(logger: Logger) {
  return createMiddleware(async (c, next) => {
    const start = performance.now();

    await next();

    const ms = (performance.now() - start).toFixed(1);
    logger.info({
      msg: "request",
      requestId: c.get("requestId") ?? "-",
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      ms,
    });
  });
}
