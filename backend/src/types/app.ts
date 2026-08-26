import type { Actor } from "../auth/types.js";
import type { SupabaseClients } from "../integrations/supabase.js";

/**
 * Hono bindings for the LumenX API.
 * Dependencies are injected via middleware — no global mutable clients.
 */
export type AppBindings = {
  Variables: {
    requestId: string;
    /** Process-scoped Supabase clients, or null when not configured. */
    supabase: SupabaseClients | null;
    /** Set by requireAuth after JWT verification + actor load. */
    actor?: Actor;
  };
};
