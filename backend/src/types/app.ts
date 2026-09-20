import type { Actor } from "../auth/types.js";
import type { SupabaseClients } from "../integrations/supabase.js";
import type { App as FirebaseApp } from "firebase-admin/app";

/**
 * Hono bindings for the LumenX API.
 * Dependencies are injected via middleware — no global mutable clients.
 */
export type AppBindings = {
  Variables: {
    requestId: string;
    /** Process-scoped Supabase clients, or null when not configured. */
    supabase: SupabaseClients | null;
    /** Process-scoped Firebase Admin app (FCM), or null when not configured. */
    firebaseApp: FirebaseApp | null;
    /** Set by requireAuth after Supabase JWT verification + actor load. */
    actor?: Actor;
  };
};
