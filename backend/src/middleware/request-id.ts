import { randomUUID } from "node:crypto";
import { createMiddleware } from "hono/factory";

/**
 * Attach a request ID to every request/response cycle.
 * Accepts a valid UUID from the incoming `X-Request-Id` header,
 * otherwise generates one. Always echoed back in the response.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const requestId = createMiddleware(async (c, next) => {
  const incoming = c.req.header("x-request-id");
  const id = incoming && UUID_RE.test(incoming) ? incoming : randomUUID();

  c.set("requestId", id);
  c.header("X-Request-Id", id);

  await next();
});
