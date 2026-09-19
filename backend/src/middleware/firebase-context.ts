import { createMiddleware } from "hono/factory";
import type { App } from "firebase-admin/app";
import type { AppBindings } from "../types/app.js";

/**
 * Inject process-scoped Firebase Admin app into every request context.
 * May be null when Firebase is not configured (local/dev).
 */
export function firebaseContext(firebaseApp: App | null) {
  return createMiddleware<AppBindings>(async (c, next) => {
    c.set("firebaseApp", firebaseApp);
    await next();
  });
}
