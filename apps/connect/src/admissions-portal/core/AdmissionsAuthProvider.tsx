import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  completeVerifiedAppSignup,
  firebaseEmailLoginToLumenXSession,
  requestFirebasePasswordReset,
} from "@lumenx/auth";

import { apiSignOut } from "@/auth/api-auth";
import { isApiAuthMode, isFirebaseAuthProvider } from "@/auth/auth-mode";
import { getConnectApiClient } from "@/lib/connect-api";
import type { MeResponse } from "@/lib/api/me-types";
import type { AdmissionsUser } from "@/lib/admissions/types";
import {
  getAllApplications,
  getCurrentUser,
  setCurrentUser,
  signOutUser,
} from "@/lib/admissions/repositories";
import { listenForAdminSyncRequests } from "@/lib/admissions/admin-bridge";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type SignUpInput = {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  accountType?: AdmissionsUser["accountType"];
  instituteId?: string;
  instituteName?: string;
  verificationGrants?: string[];
};

interface AdmissionsAuthContextValue {
  user: AdmissionsUser | null;
  hydrated: boolean;
  signUp: (input: SignUpInput) => Promise<AdmissionsUser>;
  signIn: (
    identifier: string,
    password: string,
    expectedAccountType?: AdmissionsUser["accountType"],
  ) => Promise<AdmissionsUser | null>;
  resetPassword: (identifier: string, password?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => void;
}

const AdmissionsAuthContext = createContext<AdmissionsAuthContextValue | null>(null);

function requireApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Admissions authentication requires API mode.");
  }
}

async function setSupabaseSession(accessToken: string, refreshToken?: string | null) {
  const { error } = await getSupabaseBrowserClient().auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken ?? "",
  });
  if (error) throw new Error(error.message);
}

async function hydrateAdmissionsUser(
  accessToken: string,
  accountType?: AdmissionsUser["accountType"],
  instituteName?: string,
): Promise<AdmissionsUser> {
  const me = await getConnectApiClient().get<MeResponse>("/api/v1/me", { accessToken });
  const inferredType =
    accountType ??
    (me.identities.staff.length > 0 ? "institute_admin" : "parent");
  const instituteId =
    inferredType === "institute_admin"
      ? me.identities.staff[0]?.instituteId ?? me.institutes[0]?.instituteId
      : me.identities.parents[0]?.instituteId ?? me.institutes[0]?.instituteId;
  const user: AdmissionsUser = {
    id: me.user.id,
    name: me.profile.displayName,
    email: me.profile.email ?? undefined,
    phone: me.profile.phone ?? undefined,
    passwordHash: "",
    profileComplete: me.profile.email && me.profile.phone ? 100 : 80,
    createdAt: new Date().toISOString(),
    accountType: inferredType,
    instituteId,
    instituteName,
  };
  setCurrentUser(user);
  return user;
}

async function apiSignIn(
  email: string,
  password: string,
  accountType?: AdmissionsUser["accountType"],
): Promise<AdmissionsUser> {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) throw new Error("Sign in with your email address.");
  if (isFirebaseAuthProvider()) {
    const session = await firebaseEmailLoginToLumenXSession({
      email: normalized,
      password,
      autoLink: true,
      setSupabaseSession: ({ accessToken, refreshToken }) =>
        setSupabaseSession(accessToken, refreshToken),
    });
    return hydrateAdmissionsUser(session.accessToken, accountType);
  }
  const { data, error } = await getSupabaseBrowserClient().auth.signInWithPassword({
    email: normalized,
    password,
  });
  if (error || !data.session?.access_token) {
    throw new Error(error?.message ?? "Sign-in failed.");
  }
  return hydrateAdmissionsUser(data.session.access_token, accountType);
}

async function apiSignUp(input: SignUpInput): Promise<AdmissionsUser> {
  const email = input.email?.trim().toLowerCase();
  if (!email?.includes("@")) throw new Error("Sign up with your email address.");
  const result = await completeVerifiedAppSignup({
    apiBaseUrl: (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8787").trim(),
    app: "admissions",
    accountType: input.accountType ?? "parent",
    email,
    password: input.password,
    displayName: input.name,
    phone: input.phone,
    verificationGrants: input.verificationGrants ?? [],
    metadata: { institute_name: input.instituteName ?? null },
  });
  await setSupabaseSession(result.accessToken, result.refreshToken);
  return hydrateAdmissionsUser(
    result.accessToken,
    input.accountType ?? "parent",
    input.instituteName,
  );
}

async function apiRequestPasswordReset(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) throw new Error("Enter your email address.");
  if (isFirebaseAuthProvider()) {
    await requestFirebasePasswordReset(normalized);
    return;
  }
  const { error } = await getSupabaseBrowserClient().auth.resetPasswordForEmail(normalized);
  if (error) throw new Error(error.message);
}

export function AdmissionsAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdmissionsUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(() => setUser(getCurrentUser()), []);

  useEffect(() => {
    requireApiMode();
    void getSupabaseBrowserClient()
      .auth.getSession()
      .then(async ({ data }) => {
        const token = data.session?.access_token;
        setUser(token ? await hydrateAdmissionsUser(token) : null);
      })
      .catch(() => {
        signOutUser();
        setUser(null);
      })
      .finally(() => setHydrated(true));
    return listenForAdminSyncRequests(() => getAllApplications());
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    requireApiMode();
    const next = await apiSignUp(input);
    setUser(next);
    return next;
  }, []);

  const signIn = useCallback(
    async (
      identifier: string,
      password: string,
      expectedAccountType?: AdmissionsUser["accountType"],
    ) => {
      requireApiMode();
      const next = await apiSignIn(identifier, password, expectedAccountType);
      setUser(next);
      return next;
    },
    [],
  );

  const resetPassword = useCallback(async (identifier: string, _password?: string) => {
    requireApiMode();
    await apiRequestPasswordReset(identifier);
  }, []);

  const signOut = useCallback(async () => {
    signOutUser();
    setUser(null);
    await apiSignOut().catch(() => undefined);
  }, []);

  const value = useMemo(
    () => ({ user, hydrated, signUp, signIn, resetPassword, signOut, refresh }),
    [user, hydrated, signUp, signIn, resetPassword, signOut, refresh],
  );

  return (
    <AdmissionsAuthContext.Provider value={value}>{children}</AdmissionsAuthContext.Provider>
  );
}

export function useAdmissionsAuth() {
  const ctx = useContext(AdmissionsAuthContext);
  if (!ctx) throw new Error("useAdmissionsAuth must be used within AdmissionsAuthProvider");
  return ctx;
}
