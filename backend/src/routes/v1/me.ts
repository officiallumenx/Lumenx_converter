import { Hono } from "hono";
import { requireAuth, assertAuthenticated } from "../../auth/require-auth.js";
import type { AppBindings } from "../../types/app.js";
import { toMeResponse } from "../../domains/session/service.js";

const me = new Hono<AppBindings>();

me.use("*", requireAuth);

/**
 * Authenticated session/actor summary for the calling user only.
 */
me.get("/", (c) => {
  const actor = assertAuthenticated(c);
  return c.json({ data: toMeResponse(actor) });
});

export default me;
