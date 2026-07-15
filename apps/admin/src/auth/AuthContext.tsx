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

// ── Context ───────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<AuthUser | null>(null);
  const [status,  setStatus]  = useState<AuthContextValue["status"]>("idle");
  const [error,   setError]   = useState<string | null>(null);

  /** On mount — restore session from localStorage. */
  useEffect(() => {
    setStatus("loading");
    const session = loadSession();
    if (session) {
      setUser(sessionToUser(session));
      setStatus("authenticated");
    } else {
      setStatus("unauthenticated");
    }
  }, []);

  const signIn = useCallback(
    async (identifier: string, password: string, remember = false) => {
      setStatus("loading");
      setError(null);
      try {
        const authUser = await mockSignIn(identifier, password);
        saveSession(authUser, remember);
        clearLoginFlowDraft();
        clearAppUnlock();
        setUser(authUser);
        setStatus("authenticated");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Sign in failed. Please try again.");
        setStatus("unauthenticated");
        throw err;
      }
    },
    [],
  );

  const signUp = useCallback(async (data: SignUpFormData) => {
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
        saveUserPin(authUser.id, data.securityPin);
      }
      saveSession(authUser, false);
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
    clearSession();
    clearLoginFlowDraft();
    clearAppUnlock();
    setUser(null);
    setError(null);
    setStatus("unauthenticated");
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    setError(null);
    await mockForgotPassword(email);
  }, []);

  const forgotPin = useCallback(async (data: ForgotPinFormData) => {
    setError(null);
    await mockForgotPin(data.email, data.employeeId);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value: AuthContextValue = {
    status,
    user,
    isAuthenticated: status === "authenticated",
    isLoading:       status === "loading" || status === "idle",
    error,
    signIn,
    signUp,
    signOut,
    forgotPassword,
    forgotPin,
    clearError,
  };

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
