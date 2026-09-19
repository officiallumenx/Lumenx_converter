/**
 * Exchange Firebase ID token for LumenX (Supabase) session via backend.
 */

import { mapFirebaseClientError, FirebaseClientAuthError } from "./errors";

export type FirebaseSessionExchangeResult = {
  accessToken: string;
  refreshToken: string;
  mapping: {
    user_profile_id: string;
    firebase_uid: string;
    display_name?: string;
    email?: string | null;
    memberships?: Array<{
      membership_id: string;
      institute_id: string;
      status: string;
      roles: string[];
    }>;
    is_platform_operator?: boolean;
    platform_role_code?: string | null;
  };
};

export type ExchangeFirebaseSessionInput = {
  apiBaseUrl: string;
  idToken: string;
  instituteId?: string;
  autoLink?: boolean;
  fetchImpl?: typeof fetch;
};

export async function exchangeFirebaseIdTokenForSession(
  input: ExchangeFirebaseSessionInput,
): Promise<FirebaseSessionExchangeResult> {
  const base = input.apiBaseUrl.replace(/\/$/, "");
  const fetchFn = input.fetchImpl ?? fetch;

  let response: Response;
  try {
    response = await fetchFn(`${base}/api/v1/auth/firebase/session`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.idToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        institute_id: input.instituteId,
        auto_link: input.autoLink === true,
      }),
    });
  } catch {
    throw new FirebaseClientAuthError(
      "network",
      "Network error while creating LumenX session.",
    );
  }

  const body = (await response.json().catch(() => null)) as {
    data?: {
      access_token?: string;
      refresh_token?: string;
      mapping?: FirebaseSessionExchangeResult["mapping"];
    };
    error?: { message?: string; code?: string };
  } | null;

  if (response.status === 401) {
    const msg = body?.error?.message ?? "";
    if (/expired/i.test(msg)) {
      throw mapFirebaseClientError({ code: "auth/id-token-expired", message: msg });
    }
    throw mapFirebaseClientError({ code: "auth/invalid-id-token", message: msg });
  }

  if (!response.ok) {
    throw new FirebaseClientAuthError(
      "unknown",
      body?.error?.message ?? `Session exchange failed (${response.status})`,
    );
  }

  const accessToken = body?.data?.access_token;
  const refreshToken = body?.data?.refresh_token;
  const mapping = body?.data?.mapping as FirebaseSessionExchangeResult["mapping"] | undefined;
  if (!accessToken || !refreshToken || !mapping?.user_profile_id) {
    throw new FirebaseClientAuthError(
      "unknown",
      "Session exchange returned an incomplete response",
    );
  }

  return { accessToken, refreshToken, mapping };
}
