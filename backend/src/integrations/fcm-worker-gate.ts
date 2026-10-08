import type { Env } from "../config/env.js";

/**
 * Heuristic: Supabase URL looks like a hosted production project
 * (not local Kong / Inbucket / 127.0.0.1).
 */
export function looksLikeHostedSupabaseUrl(url: string | undefined): boolean {
  if (!url?.trim()) return false;
  try {
    const host = new URL(url.trim()).hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) {
      return false;
    }
    return (
      host.includes("supabase.co") ||
      host.includes("supabase.in") ||
      host.includes("supabase.com")
    );
  } catch {
    return false;
  }
}

/**
 * Local/dev API must not process production FCM outbox unless explicitly allowed.
 * Production Railway always may run the worker when credentials are present.
 */
export function shouldStartFcmWorker(env: Env): {
  start: boolean;
  reason: string | null;
} {
  if (env.FCM_WORKER_ENABLED === false) {
    return { start: false, reason: "FCM_WORKER_ENABLED=false" };
  }
  if (env.NODE_ENV === "production") {
    return { start: true, reason: null };
  }
  if (
    looksLikeHostedSupabaseUrl(env.SUPABASE_URL) &&
    env.FCM_ALLOW_PROD_OUTBOX !== true
  ) {
    return {
      start: false,
      reason:
        "Non-production process refused to drain hosted Supabase FCM outbox. Set FCM_ALLOW_PROD_OUTBOX=true only for intentional ops.",
    };
  }
  return { start: true, reason: null };
}
