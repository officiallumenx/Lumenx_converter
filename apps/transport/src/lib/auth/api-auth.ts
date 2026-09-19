import {
  firebaseEmailLoginToLumenXSession,
  firebaseLogout,
} from "@lumenx/auth";
import { invalidatePushDeviceTokensBeforeSignOut } from "@lumenx/notifications";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { isFirebaseAuthProvider } from "@/lib/auth/auth-mode";

type MeResponse = {
  user: { id: string };
  profile: { displayName: string; phone: string | null; email: string | null };
  institutes: Array<{
    instituteId: string;
    status: string;
    roles: string[];
  }>;
};

type DriverMeResponse = {
  driverId: string;
  instituteId: string;
  displayName: string;
  phone: string;
};

class SessionValidationError extends Error {
  constructor(message: string, readonly unusable: boolean) {
    super(message);
  }
}

/** Thrown when phone matches multiple institutes — UI should ask for institute. */
export class TransportInstituteRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransportInstituteRequiredError";
  }
}

function apiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8787").replace(/\/+$/, "");
}

async function readJson(response: Response): Promise<{
  data?: unknown;
  error?: { message?: string };
}> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as { data?: unknown; error?: { message?: string } };
  } catch {
    throw new Error(
      response.ok
        ? "Unexpected response from server."
        : `Server error (${response.status}). Is the API running at ${apiBaseUrl()}?`,
    );
  }
}

async function fetchMe(accessToken: string): Promise<MeResponse> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}/api/v1/me`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch {
    throw new Error(
      `Cannot reach API at ${apiBaseUrl()}. Start the backend and try again.`,
    );
  }
  const json = await readJson(response);
  if (!response.ok) {
    throw new SessionValidationError(
      json.error?.message ?? "Failed to load profile",
      response.status === 401 || response.status === 403,
    );
  }
  return json.data as MeResponse;
}

/** Uses the access token directly — avoids race with supabase.auth.getSession(). */
async function fetchDriverMe(
  accessToken: string,
  instituteId: string,
): Promise<DriverMeResponse> {
  const query = new URLSearchParams({ institute_id: instituteId });
  let response: Response;
  try {
    response = await fetch(
      `${apiBaseUrl()}/api/v1/transport/drivers/me?${query.toString()}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
  } catch {
    throw new Error(
      `Cannot reach API at ${apiBaseUrl()}. Start the backend and try again.`,
    );
  }
  const json = await readJson(response);
  if (!response.ok) {
    throw new Error(
      json.error?.message ?? "Driver profile not linked. Ask Admin to re-save the driver.",
    );
  }
  return json.data as DriverMeResponse;
}

export type ApiTransportSession = {
  userId: string;
  name: string;
  phone: string;
  email: string | null;
  instituteId: string;
  driverId: string;
};

async function hydrateDriverFromToken(token: string): Promise<ApiTransportSession> {
  const supabase = getSupabaseBrowserClient();
  const me = await fetchMe(token);
  const driverMembership = me.institutes.find(
    (m) => m.status === "active" && m.roles.includes("driver"),
  );
  if (!driverMembership) {
    await supabase.auth.signOut().catch(() => undefined);
    throw new Error("This account is not linked as a transport driver.");
  }

  const driverMe = await fetchDriverMe(token, driverMembership.instituteId);
  return {
    userId: me.user.id,
    name: driverMe.displayName || me.profile.displayName,
    phone: driverMe.phone || me.profile.phone || "",
    email: me.profile.email,
    instituteId: driverMembership.instituteId,
    driverId: driverMe.driverId,
  };
}

/**
 * Driver phone + app-account-PIN login (Admin flowchart).
 * Provisions Transport session when PIN + assigned vehicle exist.
 */
export async function apiSignInWithPhonePin(
  phone: string,
  pin: string,
  instituteId?: string,
): Promise<ApiTransportSession> {
  const digits = phone.replace(/\D/g, "").slice(-10);
  if (digits.length !== 10) {
    throw new Error("Enter a valid 10-digit mobile number.");
  }
  const trimmedPin = pin.trim();
  if (!/^\d{4,8}$/.test(trimmedPin)) {
    throw new Error("PIN must be 4–8 digits.");
  }

  let res: Response;
  try {
    res = await fetch(`${apiBaseUrl()}/api/v1/auth/transport/pin-login`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone: digits,
        pin: trimmedPin,
        ...(instituteId ? { institute_id: instituteId } : {}),
      }),
    });
  } catch {
    throw new Error(
      `Cannot reach API at ${apiBaseUrl()}. Start the backend and try again.`,
    );
  }

  const json = (await readJson(res)) as {
    data?: {
      access_token: string;
      refresh_token: string;
      institute_id: string;
      display_name: string;
      driver_id: string;
    };
    error?: { message?: string };
  };

  if (!res.ok) {
    const message = json.error?.message ?? "No Transport account found.";
    if (/institute_id/i.test(message) || /multiple transport accounts/i.test(message)) {
      throw new TransportInstituteRequiredError(message);
    }
    if (/no transport account/i.test(message)) {
      throw new Error(
        "No Transport account found. Ask Admin to set your app PIN and assign a vehicle.",
      );
    }
    throw new Error(message);
  }

  const data = json.data;
  if (!data?.access_token || !data.refresh_token) {
    throw new Error("No Transport account found.");
  }

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });
  if (error) throw new Error(error.message || "Unable to establish session.");

  // Hydrate with the login token (not getSession) to avoid a race after setSession.
  const me = await fetchMe(data.access_token);
  return {
    userId: me.user.id,
    name: data.display_name || me.profile.displayName,
    phone: me.profile.phone || digits,
    email: me.profile.email,
    instituteId: data.institute_id,
    driverId: data.driver_id,
  };
}

/**
 * Driver email+password login (legacy / rollback).
 * firebase provider → Firebase Auth → /auth/firebase/session → hydrate driver.
 * supabase provider → Supabase password (rollback).
 */
export async function apiSignInWithPassword(
  email: string,
  password: string,
): Promise<ApiTransportSession> {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) {
    throw new Error("Sign in with your email address.");
  }

  const supabase = getSupabaseBrowserClient();

  if (isFirebaseAuthProvider()) {
    const session = await firebaseEmailLoginToLumenXSession({
      email: normalized,
      password,
      autoLink: true,
      setSupabaseSession: async ({ accessToken, refreshToken }) => {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) throw new Error(error.message || "Unable to establish session.");
      },
    });
    return hydrateDriverFromToken(session.accessToken);
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalized,
    password,
  });
  if (error) throw new Error(error.message);
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in failed");

  return hydrateDriverFromToken(token);
}

export async function hydrateApiTransportSession(): Promise<ApiTransportSession | null> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;

  try {
    return await hydrateDriverFromToken(token);
  } catch (err) {
    if (err instanceof SessionValidationError && err.unusable) {
      await supabase.auth.signOut().catch(() => undefined);
      return null;
    }
    throw err;
  }
}

export async function apiSignOut(): Promise<void> {
  await invalidatePushDeviceTokensBeforeSignOut({
    app: "transport",
    apiBaseUrl: apiBaseUrl(),
    getAccessToken: async () => {
      const { data } = await getSupabaseBrowserClient().auth.getSession();
      return data.session?.access_token;
    },
  });
  await firebaseLogout({
    clearSupabaseSession: async () => {
      await getSupabaseBrowserClient().auth.signOut().catch(() => undefined);
    },
  });
}
