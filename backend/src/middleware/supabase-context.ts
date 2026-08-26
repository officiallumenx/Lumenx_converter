import { createMiddleware } from "hono/factory";
import type { SupabaseClients } from "../integrations/supabase.js";
import type { AppBindings } from "../types/app.js";

/**
 * Inject process-scoped Supabase clients into every request context.
 * Clients may be null when Supabase is not configured (local/dev).
 */
export function supabaseContext(clients: SupabaseClients | null) {
  return createMiddleware<AppBindings>(async (c, next) => {
    c.set("supabase", clients);
    await next();
  });
}
