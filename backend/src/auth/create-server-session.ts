/**
 * Disposable Auth helpers for the shared service_role client.
 *
 * Calling `auth.signInWithPassword` / `auth.verifyOtp` on the process-scoped
 * admin client installs a user JWT in memory. Later `.from(...).update(...)`
 * then runs as `authenticated` and fails with permission denied on tables that
 * only grant SELECT to authenticated (e.g. public.teacher, public.enrollment).
 *
 * Always verify passwords / OTP on a short-lived client, never on `admin`.
 * Session minting (verifyOtp after generateLink) must use the anon key so the
 * browser can setSession with the returned tokens.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../errors/app-error.js";

export const LUMENX_SUPABASE_URL = "__lumenxSupabaseUrl";
export const LUMENX_SUPABASE_SERVICE_KEY = "__lumenxSupabaseServiceKey";
export const LUMENX_SUPABASE_ANON_KEY = "__lumenxSupabaseAnonKey";
/** When set on the admin client, disposable auth reuses that client (unit-test mocks). */
export const LUMENX_MOCK_AUTH = "__lumenxMockAuth";

type AdminWithCreds = SupabaseClient & {
  supabaseUrl?: string;
  supabaseKey?: string;
  [LUMENX_SUPABASE_URL]?: string;
  [LUMENX_SUPABASE_SERVICE_KEY]?: string;
  [LUMENX_SUPABASE_ANON_KEY]?: string;
  [LUMENX_MOCK_AUTH]?: boolean;
};

export function attachAdminClientCredentials(
  admin: SupabaseClient,
  url: string,
  serviceRoleKey: string,
  anonKey?: string,
): SupabaseClient {
  const tagged = admin as AdminWithCreds;
  tagged[LUMENX_SUPABASE_URL] = url;
  tagged[LUMENX_SUPABASE_SERVICE_KEY] = serviceRoleKey;
  if (anonKey) tagged[LUMENX_SUPABASE_ANON_KEY] = anonKey;
  return admin;
}

function clientCredentials(
  admin: SupabaseClient,
  keyKind: "service" | "anon" = "service",
): { url: string; key: string } | null {
  const tagged = admin as AdminWithCreds;
  const url =
    tagged[LUMENX_SUPABASE_URL] ||
    tagged.supabaseUrl ||
    undefined;
  const key =
    keyKind === "anon"
      ? tagged[LUMENX_SUPABASE_ANON_KEY]
      : tagged[LUMENX_SUPABASE_SERVICE_KEY] || tagged.supabaseKey || undefined;
  if (!url || !key) return null;
  return { url, key };
}

/** Short-lived client — never share across requests. Never reuse for DB writes. */
export function createDisposableAuthClient(
  admin: SupabaseClient,
  keyKind: "service" | "anon" = "service",
): SupabaseClient {
  const creds = clientCredentials(admin, keyKind);
  if (!creds) {
    throw AppError.internal(
      keyKind === "anon"
        ? "Supabase admin client is missing URL/anon key for disposable auth sessions"
        : "Supabase admin client is missing URL/key for disposable auth sessions",
    );
  }
  const tagged = admin as AdminWithCreds;
  if (tagged[LUMENX_MOCK_AUTH]) {
    return admin;
  }
  return createClient(creds.url, creds.key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Best-effort local sign-out; mocks may omit signOut. */
async function safeLocalSignOut(client: SupabaseClient): Promise<void> {
  const signOut = client.auth.signOut;
  if (typeof signOut !== "function") return;
  try {
    await signOut.call(client.auth, { scope: "local" });
  } catch {
    // Disposable clients / test mocks may not implement signOut.
  }
}

/**
 * Verify email+password without poisoning the shared service_role client.
 * Returns true when credentials are valid.
 */
export async function verifyPasswordWithoutPoisoning(
  admin: SupabaseClient,
  email: string,
  password: string,
): Promise<boolean> {
  // Prefer anon key (same as browser password sign-in); fall back to service.
  const disposable = clientCredentials(admin, "anon")
    ? createDisposableAuthClient(admin, "anon")
    : createDisposableAuthClient(admin, "service");
  try {
    const { error } = await disposable.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    return !error;
  } finally {
    await safeLocalSignOut(disposable);
  }
}

/**
 * Verify email+password and return the Auth user id (no shared-client session).
 */
export async function signInPasswordForUserId(
  admin: SupabaseClient,
  email: string,
  password: string,
): Promise<string | null> {
  const disposable = clientCredentials(admin, "anon")
    ? createDisposableAuthClient(admin, "anon")
    : createDisposableAuthClient(admin, "service");
  try {
    const { data, error } = await disposable.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error || !data.user?.id) return null;
    return data.user.id;
  } finally {
    await safeLocalSignOut(disposable);
  }
}

export async function createServerAuthSessionForEmail(
  admin: SupabaseClient,
  email: string,
  failureLabel = "session",
  expectedUserId?: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const normalized = email.trim().toLowerCase();
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: normalized,
  });
  if (linkError || !linkData.properties?.hashed_token) {
    throw AppError.internal(
      `Unable to start ${failureLabel}${linkError?.message ? `: ${linkError.message}` : ""}`,
    );
  }

  const hashedToken = linkData.properties.hashed_token;
  // Mint user session with the anon key so browser setSession accepts the tokens.
  // Do NOT signOut afterward — that can revoke the refresh token and cause
  // "Auth session missing!" when Connect/Admin apply the session.
  const disposable = createDisposableAuthClient(admin, "anon");
  const { data: sessionData, error: verifyError } = await disposable.auth.verifyOtp({
    token_hash: hashedToken,
    type: "email",
  });
  if (verifyError || !sessionData.session?.access_token || !sessionData.session.refresh_token) {
    throw AppError.internal(
      `Unable to complete ${failureLabel}${verifyError?.message ? `: ${verifyError.message}` : ""}`,
    );
  }
  const sessionUserId = sessionData.session.user?.id;
  if (expectedUserId && sessionUserId !== expectedUserId) {
    throw AppError.internal(
      `Unable to complete ${failureLabel}: auth user does not match profile`,
    );
  }
  return {
    accessToken: sessionData.session.access_token,
    refreshToken: sessionData.session.refresh_token,
  };
}

/**
 * Mint Supabase access/refresh tokens for an existing LumenX user_profile id.
 * Does not create users. Does not modify membership/roles.
 */
export async function createSupabaseSessionForUserId(
  admin: SupabaseClient,
  userProfileId: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const { data, error } = await admin.auth.admin.getUserById(userProfileId);
  if (!error && data.user?.email) {
    return createServerAuthSessionForEmail(
      admin,
      data.user.email.trim().toLowerCase(),
      "LumenX session",
      userProfileId,
    );
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
  return createServerAuthSessionForEmail(
    admin,
    email,
    "LumenX session",
    userProfileId,
  );
}
