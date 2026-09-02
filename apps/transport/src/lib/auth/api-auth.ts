import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { getDriverMe } from "@/lib/transport-api";

type MeResponse = {
  user: { id: string };
  profile: { displayName: string; phone: string | null; email: string | null };
  institutes: Array<{
    instituteId: string;
    status: string;
    roles: string[];
  }>;
};

function apiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8787").replace(/\/+$/, "");
}

async function fetchMe(accessToken: string): Promise<MeResponse> {
  const response = await fetch(`${apiBaseUrl()}/api/v1/me`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const json = (await response.json()) as { data?: MeResponse; error?: { message?: string } };
  if (!response.ok) {
    throw new Error(json.error?.message ?? "Failed to load profile");
  }
  return json.data as MeResponse;
}

export type ApiTransportSession = {
  userId: string;
  name: string;
  phone: string;
  email: string | null;
  instituteId: string;
  driverId: string;
};

export async function apiSignInWithPassword(
  email: string,
  password: string,
): Promise<ApiTransportSession> {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) {
    throw new Error("Sign in with your email address.");
  }

  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalized,
    password,
  });
  if (error) throw new Error(error.message);
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in failed");

  const me = await fetchMe(token);
  const driverMembership = me.institutes.find(
    (m) => m.status === "active" && m.roles.includes("driver"),
  );
  if (!driverMembership) {
    await supabase.auth.signOut().catch(() => undefined);
    throw new Error("This account is not linked as a transport driver.");
  }

  const driverMe = await getDriverMe(driverMembership.instituteId);
  return {
    userId: me.user.id,
    name: driverMe.displayName || me.profile.displayName,
    phone: driverMe.phone || me.profile.phone || "",
    email: me.profile.email,
    instituteId: driverMembership.instituteId,
    driverId: driverMe.driverId,
  };
}

export async function hydrateApiTransportSession(): Promise<ApiTransportSession | null> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;

  try {
    const me = await fetchMe(token);
    const driverMembership = me.institutes.find(
      (m) => m.status === "active" && m.roles.includes("driver"),
    );
    if (!driverMembership) return null;
    const driverMe = await getDriverMe(driverMembership.instituteId);
    return {
      userId: me.user.id,
      name: driverMe.displayName || me.profile.displayName,
      phone: driverMe.phone || me.profile.phone || "",
      email: me.profile.email,
      instituteId: driverMembership.instituteId,
      driverId: driverMe.driverId,
    };
  } catch {
    return null;
  }
}

export async function apiSignOut(): Promise<void> {
  await getSupabaseBrowserClient().auth.signOut().catch(() => undefined);
}
