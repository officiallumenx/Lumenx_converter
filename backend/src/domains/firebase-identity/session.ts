/**
 * Mint a Supabase Auth session for an existing auth.users / user_profile id.
 * Used after Firebase ID-token verification so LumenX APIs keep using requireAuth.
 *
 * Preserves:
 *   - auth.users / user_profile.id FK
 *   - Supabase JWT → requireAuth → admin.auth.getUser
 *   - memberships / roles / tenant isolation (unchanged)
 *
 * Does not create users. Does not modify membership/roles. Does not remove
 * Twilio / Resend / password login paths.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { FirebaseIdentity } from "../../auth/firebase-identity.js";
import type { Actor } from "../../auth/types.js";
import {
  resolveActorFromFirebaseIdentity,
  toFirebaseMappingDto,
} from "./service.js";
import type {
  FirebaseIdentityMapping,
  ResolveFirebaseIdentityOptions,
} from "./types.js";
import { createServerAuthSessionForEmail } from "../../auth/create-server-session.js";

export type LumenXSessionTokens = {
  accessToken: string;
  refreshToken: string;
};

async function resolveAuthEmailForUser(
  admin: SupabaseClient,
  userProfileId: string,
): Promise<string> {
  const { data, error } = await admin.auth.admin.getUserById(userProfileId);
  if (!error && data.user?.email) {
    return data.user.email.trim().toLowerCase();
  }

  const profileResult = await admin
    .from("user_profile")
    .select("email")
    .eq("id", userProfileId)
    .is("deleted_at", null)
    .maybeSingle();

  const email =
    profileResult.data &&
    typeof (profileResult.data as { email?: string | null }).email === "string"
      ? (profileResult.data as { email: string }).email.trim().toLowerCase()
      : "";

  if (!email) {
    throw AppError.internal(
      "Unable to start LumenX session: linked profile has no Auth email",
    );
  }
  return email;
}

/**
 * Create Supabase access/refresh tokens for an existing LumenX user.
 * Does not create users. Does not modify membership/roles.
 */
export async function createSupabaseSessionForUserId(
  admin: SupabaseClient,
  userProfileId: string,
): Promise<LumenXSessionTokens> {
  const email = await resolveAuthEmailForUser(admin, userProfileId);
  return createServerAuthSessionForEmail(
    admin,
    email,
    "LumenX session",
    userProfileId,
  );
}

export type FirebaseSessionResult = {
  accessToken: string;
  refreshToken: string;
  mapping: FirebaseIdentityMapping;
  actor: Actor;
};

/**
 * Firebase ID token (already verified as identity) → map → Supabase session.
 * Existing login flows (Twilio/Resend/Supabase password) remain available.
 */
export async function createLumenXSessionFromFirebaseIdentity(
  admin: SupabaseClient,
  identity: FirebaseIdentity,
  options: ResolveFirebaseIdentityOptions = {},
): Promise<FirebaseSessionResult> {
  const { mapping, actor } = await resolveActorFromFirebaseIdentity(
    admin,
    identity,
    {
      allowCandidateLookup: options.allowCandidateLookup ?? true,
      autoLink: options.autoLink ?? false,
      requiredInstituteId: options.requiredInstituteId,
    },
  );

  const tokens = await createSupabaseSessionForUserId(admin, mapping.userProfileId);
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    mapping,
    actor,
  };
}

export function toFirebaseSessionDto(result: FirebaseSessionResult) {
  return {
    access_token: result.accessToken,
    refresh_token: result.refreshToken,
    token_type: "bearer" as const,
    mapping: toFirebaseMappingDto(result.mapping, result.actor),
  };
}
