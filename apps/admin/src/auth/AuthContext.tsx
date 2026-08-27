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
import { clearAppUnlock, saveUserPin } from "./app-lock-store";
import {
  loadSession,
  saveSession,
  clearSession,
  sessionToUser,
  mockSignIn,
  mockSignUp,
  mockForgotPassword,
  mockForgotPin,
} from "./auth-store";
import { AUTH_REMEMBER_KEY } from "./constants";
import { isApiAuthMode } from "./auth-mode";
import {
  apiSignInWithPassword,
  apiSignOut,
  tryHydrateApiSession,
} from "./api-auth";
import { clearApiModeLocalIdentity } from "./api-local-cleanup";
import { isDemoCompleteSignInAllowed, mergeApiPresentationPatch } from "./login-flow-auth";
import { setAdminApiUnauthorizedHandler } from "@/lib/admin-api";

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
    setAdminApiUnauthorizedHandler(() => {
      void apiSignOut().finally(() => {
        clearApiLocalState();
      });
    });
    return () => setAdminApiUnauthorizedHandler(null);
  }, [clearApiLocalState]);

  /** On mount — restore demo session or hydrate API session from Supabase. */
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    let cancelled = false;

    async function bootstrap() {
      setStatus("loading");

      if (isApiAuthMode()) {
        try {
          const hydrated = await tryHydrateApiSession();
          if (cancelled) return;
          if (hydrated) {
            const remember =
              typeof localStorage !== "undefined" &&
              localStorage.getItem(AUTH_REMEMBER_KEY) === "1";
            saveSession(hydrated.user, remember, { authSource: "api" });
            setUser(hydrated.user);
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
        return;
      }

      // Demo mode — never call the live API with mock tokens.
      const session = loadSession();
      if (session?.authSource === "api") {
        // Stale API session while in demo mode — discard.
        clearSession();
        setUser(null);
        setStatus("unauthenticated");
        return;
      }
      if (session) {
        setUser(sessionToUser(session));
        setStatus("authenticated");
      } else {
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
        if (isApiAuthMode()) {
          const hydrated = await apiSignInWithPassword(identifier, password);
          saveSession(hydrated.user, remember, { authSource: "api" });
          clearLoginFlowDraft();
          clearAppUnlock();
          setUser(hydrated.user);
          setStatus("authenticated");
          return;
        }

        const authUser = await mockSignIn(identifier, password);
        saveSession(authUser, remember, { authSource: "demo" });
        clearLoginFlowDraft();
        clearAppUnlock();
        setUser(authUser);
        setStatus("authenticated");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Login failed. Please try again.");
        setStatus("unauthenticated");
        throw err;
      }
    },
    [],
  );

  const completeSignIn = useCallback((authUser: AuthUser, remember = false) => {
    // OTP / institute-registration completion remains on the demo identity path.
    // API mode must never install a demo session through this entry point.
    if (!isDemoCompleteSignInAllowed()) {
      setError(
        "Demo sign-in completion is disabled in API mode. Use email and password sign-in.",
      );
      return;
    }
    saveSession(authUser, remember, { authSource: "demo" });
    clearLoginFlowDraft();
    clearAppUnlock();
    setError(null);
    setUser(authUser);
    setStatus("authenticated");
  }, []);

  const patchAuthenticatedUser = useCallback((authUser: AuthUser) => {
    const remember =
      typeof localStorage !== "undefined" &&
      localStorage.getItem(AUTH_REMEMBER_KEY) === "1";
    const existing = loadSession();

    // API mode: /me remains authoritative for role + institute identity.
    // Only presentation fields may be patched on top of the existing API session.
    if (isApiAuthMode()) {
      if (!existing || existing.authSource !== "api") {
        setError("Cannot patch identity without an active API session.");
        return;
      }
      const current = sessionToUser(existing);
      const merged = mergeApiPresentationPatch(current, authUser);
      saveSession(merged, remember, { authSource: "api" });
      setUser(merged);
      return;
    }

    saveSession(authUser, remember, {
      authSource: existing?.authSource ?? "demo",
    });
    setUser(authUser);
  }, []);

  const signUp = useCallback(async (data: SignUpFormData) => {
    if (isApiAuthMode()) {
      setError("Institute sign-up via API mode is not enabled in this cutover. Use demo mode or an existing account.");
      throw new Error("API-mode sign-up is not enabled in Stage 8.1B");
    }
    setStatus("loading");
    setError(null);
    try {
      const authUser = await mockSignUp(
        data.email,
        data.fullName,
        data.role as AuthUser["role"],
        data.designation,
        {
          phone: data.phone,
          instituteName: data.instituteName,
          password: data.password,
        },
      );
      if (data.securityPin) {
        saveUserPin(authUser.id, data.securityPin, authUser.email);
      }
      saveSession(authUser, false, { authSource: "demo" });
      clearAppUnlock();
      setUser(authUser);
      setStatus("authenticated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed. Please try again.");
      setStatus("unauthenticated");
      throw err;
    }
  }, []);

  const signOut = useCallback(() => {
    if (isApiAuthMode()) {
      void apiSignOut().finally(() => {
        clearApiLocalState();
      });
      return;
    }
    clearSession();
    clearLoginFlowDraft();
    clearAppUnlock();
    setUser(null);
    setError(null);
    setStatus("unauthenticated");
  }, [clearApiLocalState]);

  const forgotPassword = useCallback(async (email: string) => {
    setError(null);
    if (isApiAuthMode()) {
      const { getSupabaseBrowserClient } = await import("@/lib/supabase-browser");
      const supabase = getSupabaseBrowserClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
      );
      if (resetError) throw new Error(resetError.message);
      return;
    }
    await mockForgotPassword(email);
  }, []);

  const forgotPin = useCallback(async (data: ForgotPinFormData) => {
    setError(null);
    await mockForgotPin(data.email, data.employeeId);
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
      completeSignIn,
      patchAuthenticatedUser,
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
      completeSignIn,
      patchAuthenticatedUser,
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
