/**
 * Phase 1–3 Firebase Auth — verify tokens, map to LumenX user, mint Supabase session.
 *
 * Target flow (preserved):
 *   Firebase ID token → verifyAdmin → map firebase_uid / candidates →
 *   createSupabaseSessionForUserId (magiclink) → Supabase JWT → requireAuth.
 *
 * Does not replace Supabase requireAuth globally. Does not create people rows.
 * Does not remove Twilio / Resend / existing login flows.
 * Never trusts client-supplied firebase_uid / email / phone in the body.
 */

import { Hono } from "hono";
import type { AppBindings } from "../../types/app.js";
import { loadEnv } from "../../config/env.js";
import { AppError } from "../../errors/app-error.js";
import { getFirebasePublicClientHints } from "../../integrations/firebase.js";
import {
  assertFirebaseAuthenticated,
  requireFirebaseAuth,
  verifyBearerFirebaseIdToken,
} from "../../auth/require-firebase-auth.js";
import { toFirebaseIdentityDto } from "../../auth/firebase-identity.js";
import {
  assertAuthenticated,
  requireAuth,
} from "../../auth/require-auth.js";
import {
  linkFirebaseIdentityToExistingUser,
  resolveActorFromFirebaseIdentity,
  toFirebaseMappingDto,
} from "../../domains/firebase-identity/service.js";
import {
  createLumenXSessionFromFirebaseIdentity,
  toFirebaseSessionDto,
} from "../../domains/firebase-identity/session.js";

const firebaseAuth = new Hono<AppBindings>();

/** Public — non-secret Firebase client hints only (no private key / client email). */
firebaseAuth.get("/public-config", (c) => {
  const env = loadEnv();
  return c.json({ data: getFirebasePublicClientHints(env) });
});

/** Requires Authorization: Bearer &lt;Firebase ID token&gt;. Identity only. */
firebaseAuth.get("/whoami", requireFirebaseAuth(), (c) => {
  const identity = assertFirebaseAuthenticated(c);
  return c.json({ data: toFirebaseIdentityDto(identity) });
});

/**
 * Resolve Firebase identity → existing LumenX user + memberships/roles.
 * Query: institute_id (optional) — enforces tenant membership when set.
 * Query: auto_link=true — persist unique verified email/phone candidate.
 */
firebaseAuth.get("/resolve", requireFirebaseAuth(), async (c) => {
  const identity = assertFirebaseAuthenticated(c);
  const clients = c.get("supabase");
  if (!clients) {
    throw AppError.internal("Authentication service unavailable");
  }

  const instituteId = c.req.query("institute_id")?.trim() || undefined;
  const autoLink = c.req.query("auto_link") === "true";

  const { mapping, actor } = await resolveActorFromFirebaseIdentity(
    clients.admin,
    identity,
    {
      allowCandidateLookup: true,
      autoLink,
      requiredInstituteId: instituteId,
    },
  );

  return c.json({
    data: {
      firebase: toFirebaseIdentityDto(identity),
      mapping: toFirebaseMappingDto(mapping, actor),
    },
  });
});

/**
 * Exchange a verified Firebase ID token for a LumenX (Supabase Auth) session.
 * Body (JSON, all optional — identity fields ignored if present):
 *   { institute_id?: string, auto_link?: boolean }
 *
 * Client flow: Firebase phone/email auth → ID token → this endpoint →
 * supabase.auth.setSession({ access_token, refresh_token }).
 *
 * Existing Supabase / Twilio / Resend login paths remain available for rollback.
 */
firebaseAuth.post("/session", requireFirebaseAuth(), async (c) => {
  const identity = assertFirebaseAuthenticated(c);
  const clients = c.get("supabase");
  if (!clients) {
    throw AppError.internal("Authentication service unavailable");
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await c.req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  // Security: never trust client-supplied firebase_uid / email / phone / uid.
  const instituteId =
    typeof body.institute_id === "string" ? body.institute_id.trim() : undefined;
  const autoLink = body.auto_link === true;

  const result = await createLumenXSessionFromFirebaseIdentity(
    clients.admin,
    identity,
    {
      allowCandidateLookup: true,
      autoLink,
      requiredInstituteId: instituteId || undefined,
    },
  );

  return c.json({
    data: {
      firebase: toFirebaseIdentityDto(identity),
      ...toFirebaseSessionDto(result),
    },
  });
});

/**
 * Link the authenticated Supabase actor's profile to a verified Firebase UID.
 * Headers:
 *   Authorization: Bearer &lt;Supabase access token&gt;
 *   X-Firebase-Id-Token: &lt;Firebase ID token&gt;  (optional "Bearer " prefix)
 */
firebaseAuth.post("/link", requireAuth, async (c) => {
  const actor = assertAuthenticated(c);
  const firebaseApp = c.get("firebaseApp");
  if (!firebaseApp) {
    throw AppError.internal("Firebase Auth is not configured");
  }

  const raw =
    c.req.header("X-Firebase-Id-Token")?.trim() ||
    c.req.header("x-firebase-id-token")?.trim();
  if (!raw) {
    throw AppError.validation("X-Firebase-Id-Token header is required", {
      "X-Firebase-Id-Token": ["Required"],
    });
  }

  const authorization = /^Bearer\s+/i.test(raw) ? raw : `Bearer ${raw}`;
  const identity = await verifyBearerFirebaseIdToken(firebaseApp, authorization);

  const clients = c.get("supabase");
  if (!clients) {
    throw AppError.internal("Authentication service unavailable");
  }

  // Link uses verified token UID + authenticated Supabase actor — never body claims.
  const mapping = await linkFirebaseIdentityToExistingUser(clients.admin, {
    userProfileId: actor.userId,
    firebaseUid: identity.uid,
  });

  return c.json({
    data: {
      firebase: toFirebaseIdentityDto(identity),
      mapping: toFirebaseMappingDto(mapping, actor),
    },
  });
});

export default firebaseAuth;
