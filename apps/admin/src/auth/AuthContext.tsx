/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — Auth Context + Provider + useAuth hook
 *  Manages global authentication state via React Context.
 * ───────────────────────────────────────────────────────────── */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type { AuthContextValue, AuthUser, SignUpFormData, ForgotPinFormData } from "./types";
import { clearLoginFlowDraft } from "./login-flow-store";
import { clearAppUnlock } from "./app-lock-store";
import {
  loadSession,
  saveSession,
  sessionToUser,
} from "./auth-store";
import { AUTH_REMEMBER_KEY } from "./constants";
import { isApiAuthMode, assertProductionApiAuthMode } from "./auth-mode";
import {
  apiSignInWithPassword,
  apiSignInWithStaffOtp,
  apiSignInWithStaffPassword,
  apiSignOut,
  tryHydrateApiSession,
} from "./api-auth";
import { clearApiModeLocalIdentity } from "./api-local-cleanup";
import { mergeApiPresentationPatch } from "./login-flow-auth";
import {
  tryApplyApiActiveInstituteSession,
  clearApiActiveInstituteSession,
} from "./api-active-institute";
import { setAdminApiUnauthorizedHandler } from "@/lib/admin-api";
import { bindApiRegistrationUser } from "./api-registration-state";
import { finalizeApiAuthUser } from "./api-auth-finalize";
import { runApiInstituteSignUp } from "./api-signup-flow";
import { assertNotDemoFallback } from "@lumenx/auth";

// ── Context ───────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<AuthUser | null>(null);
  const [status,  setStatus]  = useState<AuthContextValue["status"]>("idle");
  const [error,   setError]   = useState<string | null>(null);
  const bootstrapped = useRef(false);

  const clearApiLocalState = useCallback(() => {
    clearApiModeLocalIdentity();
    clearLoginFlowDraft();
    clearAppUnlock();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  useEffect(() => {
    assertProductionApiAuthMode();
  }, []);

  useEffect(() => {
    setAdminApiUnauthorizedHandler(() => {
      void apiSignOut().finally(() => {
        clearApiLocalState();
      });
    });
    return () => setAdminApiUnauthorizedHandler(null);
  }, [clearApiLocalState]);

  /** On mount — hydrate API session from Supabase / LumenX session. */
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    let cancelled = false;

    async function bootstrap() {
      setStatus("loading");

      try {
        const hydrated = await tryHydrateApiSession();
        if (cancelled) return;
        if (hydrated) {
          bindApiRegistrationUser(hydrated.user.id);
          const user = await finalizeApiAuthUser(hydrated);
          if (cancelled) return;
          const remember =
            typeof localStorage !== "undefined" &&
            localStorage.getItem(AUTH_REMEMBER_KEY) === "1";
          saveSession(user, remember, { authSource: "api" });
          setUser(user);
          setStatus("authenticated");
          return;
        }
        // No Supabase session — drop UI session + stale institute preference.
        clearApiModeLocalIdentity();
        setUser(null);
        setStatus("unauthenticated");
      } catch (err) {
        if (cancelled) return;
        clearApiModeLocalIdentity();
        setUser(null);
        setError(err instanceof Error ? err.message : "Session restore failed");
        setStatus("unauthenticated");
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(
    async (identifier: string, password: string, remember = false) => {
      setStatus("loading");
      setError(null);
      try {
        const hydrated = await apiSignInWithPassword(identifier, password);
        bindApiRegistrationUser(hydrated.user.id);
        const user = await finalizeApiAuthUser(hydrated);
        saveSession(user, remember, { authSource: "api" });
        clearLoginFlowDraft();
        clearAppUnlock();
        setUser(user);
        setStatus("authenticated");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Login failed. Please try again.");
        setStatus("unauthenticated");
        throw err;
      }
    },
    [],
  );

  const signInWithStaffOtp = useCallback(
    async (input: {
      instituteId: string;
      identifier: string;
      otp?: string;
      mobileOtp?: string;
      emailOtp?: string;
      mobileOtpGrant?: string;
      emailOtpGrant?: string;
      firebaseIdToken?: string;
      password?: string;
      pin: string;
      remember?: boolean;
    }) => {
      setStatus("loading");
      setError(null);
      try {
        if (!isApiAuthMode()) {
          throw new Error("Staff OTP login is not available in this environment.");
        }
        const hydrated = await apiSignInWithStaffOtp({
          instituteId: input.instituteId,
          identifier: input.identifier,
          otp: input.otp,
          mobileOtp: input.mobileOtp,
          emailOtp: input.emailOtp,
          mobileOtpGrant: input.mobileOtpGrant,
          emailOtpGrant: input.emailOtpGrant,
          firebaseIdToken: input.firebaseIdToken,
          password: input.password,
          pin: input.pin,
        });
        bindApiRegistrationUser(hydrated.user.id);
        const user = await finalizeApiAuthUser(hydrated);
        saveSession(user, input.remember ?? false, { authSource: "api" });
        clearLoginFlowDraft();
        clearAppUnlock();
        setUser(user);
        setStatus("authenticated");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Login failed. Please try again.");
        setStatus("unauthenticated");
        throw err;
      }
    },
    [],
  );

  const signInWithStaffPassword = useCallback(
    async (input: {
      instituteId: string;
      identifier: string;
      password: string;
      pin: string;
      remember?: boolean;
    }) => {
      setStatus("loading");
      setError(null);
      try {
        if (!isApiAuthMode()) {
          throw new Error("Staff password login is not available in this environment.");
        }
        const hydrated = await apiSignInWithStaffPassword({
          instituteId: input.instituteId,
          identifier: input.identifier,
          password: input.password,
          pin: input.pin,
        });
        bindApiRegistrationUser(hydrated.user.id);
        const user = await finalizeApiAuthUser(hydrated);
        saveSession(user, input.remember ?? false, { authSource: "api" });
        clearLoginFlowDraft();
        clearAppUnlock();
        setUser(user);
        setStatus("authenticated");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Login failed. Please try again.");
        setStatus("unauthenticated");
        throw err;
      }
    },
    [],
  );

  const completeSignIn = useCallback((_authUser: AuthUser, _remember = false) => {
    assertNotDemoFallback("api", "Admin completeSignIn");
  }, []);

  const patchAuthenticatedUser = useCallback((authUser: AuthUser) => {
    const remember =
      typeof localStorage !== "undefined" &&
      localStorage.getItem(AUTH_REMEMBER_KEY) === "1";
    const existing = loadSession();

    // /me remains authoritative for role + institute identity.
    // Only presentation fields may be patched on top of the existing API session.
    if (!existing || existing.authSource !== "api") {
      setError("Cannot patch identity without an active API session.");
      return;
    }
    const current = sessionToUser(existing);
    const merged = mergeApiPresentationPatch(current, authUser);
    saveSession(merged, remember, { authSource: "api" });
    setUser(merged);
  }, []);

  const applyApiActiveInstitute = useCallback(
    (instituteId: string, instituteName: string) => {
      const next = tryApplyApiActiveInstituteSession(instituteId, instituteName);
      if (next) setUser(next);
      void import("@/lib/access-roles").then(({ syncApiAccessPermissions }) => {
        void syncApiAccessPermissions(instituteId);
      });
    },
    [],
  );

  /** Clear API-mode institute presentation when context is no longer validated. */
  const clearApiActiveInstitutePresentation = useCallback(() => {
    const next = clearApiActiveInstituteSession();
    if (next) setUser(next);
  }, []);

  const signUp = useCallback(async (data: SignUpFormData) => {
    setStatus("loading");
    setError(null);
    try {
      const hydrated = await runApiInstituteSignUp(data);
      saveSession(hydrated.user, false, { authSource: "api" });
      clearAppUnlock();
      setUser(hydrated.user);
      setStatus("authenticated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed. Please try again.");
      setStatus("unauthenticated");
      throw err;
    }
  }, []);

  const signOut = useCallback(() => {
    clearApiLocalState();
    void apiSignOut().catch(() => undefined);
  }, [clearApiLocalState]);

  const forgotPassword = useCallback(async (email: string) => {
    setError(null);
    const { getSupabaseBrowserClient } = await import("@/lib/supabase-browser");
    const supabase = getSupabaseBrowserClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
    );
    if (resetError) throw new Error(resetError.message);
  }, []);

  const forgotPin = useCallback(async (data: ForgotPinFormData) => {
    setError(null);
    // PIN recovery for API accounts is handled via staff credential APIs — not demo lookup.
    throw new Error(
      "PIN recovery requires the live staff credential flow. Demo PIN recovery has been removed.",
    );
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isAuthenticated: status === "authenticated",
      isLoading: status === "loading" || status === "idle",
      error,
      signIn,
      signInWithStaffOtp,
      signInWithStaffPassword,
      completeSignIn,
      patchAuthenticatedUser,
      applyApiActiveInstitute,
      clearApiActiveInstitutePresentation,
      signUp,
      signOut,
      forgotPassword,
      forgotPin,
      clearError,
    }),
    [
      status,
      user,
      error,
      signIn,
      signInWithStaffOtp,
      signInWithStaffPassword,
      completeSignIn,
      patchAuthenticatedUser,
      applyApiActiveInstitute,
      clearApiActiveInstitutePresentation,
      signUp,
      signOut,
      forgotPassword,
      forgotPin,
      clearError,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook ──────────────────────────────────────────────────────

/**
 * useAuth — consume the auth context.
 * Must be used inside <AuthProvider>.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
}
