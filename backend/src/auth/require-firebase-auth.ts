/**
 * Verify Firebase Auth ID tokens (parallel to Supabase requireAuth).
 * Sets firebaseIdentity only — Actor mapping is domains/firebase-identity.
 *
 * Does NOT replace Supabase `requireAuth`. Business APIs still use Supabase JWTs.
 */

import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import type { App } from "firebase-admin/app";
import { AppError } from "../errors/app-error.js";
import type { AppBindings } from "../types/app.js";
import { loadEnv } from "../config/env.js";
import {
  verifyFirebaseIdToken,
  type VerifyFirebaseIdTokenOptions,
} from "../integrations/firebase.js";
import {
  firebaseIdentityFromDecodedToken,
  type FirebaseIdentity,
} from "./firebase-identity.js";

const BEARER_RE = /^Bearer\s+(\S+)$/i;

function mapFirebaseAuthError(err: unknown): AppError {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code?: string }).code ?? "")
      : "";
  const message =
    err instanceof Error ? err.message : "Invalid or expired Firebase token";

  if (
    code === "auth/id-token-expired" ||
    /expired/i.test(message)
  ) {
    return AppError.unauthenticated("Firebase ID token expired");
  }
  if (
    code === "auth/id-token-revoked" ||
    /revoked/i.test(message)
  ) {
    return AppError.unauthenticated("Firebase ID token revoked");
  }
  if (
    code === "auth/argument-error" ||
    code === "auth/invalid-id-token" ||
    /invalid/i.test(message) ||
    /empty firebase id token/i.test(message)
  ) {
    return AppError.unauthenticated("Invalid Firebase ID token");
  }
  return AppError.unauthenticated("Invalid or expired Firebase token");
}

export type RequireFirebaseAuthOptions = VerifyFirebaseIdTokenOptions;

function resolveCheckRevoked(opts?: RequireFirebaseAuthOptions): boolean {
  if (typeof opts?.checkRevoked === "boolean") return opts.checkRevoked;
  try {
    return loadEnv().FIREBASE_AUTH_CHECK_REVOKED === true;
  } catch {
    return false;
  }
}

/**
 * Require `Authorization: Bearer <Firebase ID token>`.
 * Sets `firebaseIdentity` on context from Admin-verified claims only.
 * Does not replace Supabase `requireAuth`.
 */
export function requireFirebaseAuth(opts?: RequireFirebaseAuthOptions) {
  return createMiddleware<AppBindings>(async (c, next) => {
    const header = c.req.header("Authorization");
    if (!header) {
      throw AppError.unauthenticated();
    }

    const match = BEARER_RE.exec(header.trim());
    if (!match?.[1]) {
      throw AppError.unauthenticated("Malformed Authorization header");
    }

    const firebaseApp = c.get("firebaseApp");
    if (!firebaseApp) {
      throw AppError.internal("Firebase Auth is not configured");
    }

    let decoded;
    try {
      decoded = await verifyFirebaseIdToken(firebaseApp, match[1], {
        checkRevoked: resolveCheckRevoked(opts),
      });
    } catch (err) {
      throw mapFirebaseAuthError(err);
    }

    const identity = firebaseIdentityFromDecodedToken(decoded);
    if (!identity.uid) {
      throw AppError.unauthenticated("Firebase token missing uid");
    }

    c.set("firebaseIdentity", identity);
    await next();
  });
}

/** Read Firebase identity; throws if requireFirebaseAuth was not applied. */
export function assertFirebaseAuthenticated(
  c: Context<AppBindings>,
): FirebaseIdentity {
  const identity = c.get("firebaseIdentity");
  if (!identity) {
    throw AppError.unauthenticated("Firebase authentication required");
  }
  return identity;
}

/** Test/helper: verify token against an explicit Admin app (no Hono context). */
export async function verifyBearerFirebaseIdToken(
  app: App,
  authorizationHeader: string | undefined,
  opts?: VerifyFirebaseIdTokenOptions,
): Promise<FirebaseIdentity> {
  if (!authorizationHeader) {
    throw AppError.unauthenticated();
  }
  const match = BEARER_RE.exec(authorizationHeader.trim());
  if (!match?.[1]) {
    throw AppError.unauthenticated("Malformed Authorization header");
  }
  try {
    const decoded = await verifyFirebaseIdToken(app, match[1], {
      checkRevoked: resolveCheckRevoked(opts),
    });
    return firebaseIdentityFromDecodedToken(decoded);
  } catch (err) {
    throw mapFirebaseAuthError(err);
  }
}
