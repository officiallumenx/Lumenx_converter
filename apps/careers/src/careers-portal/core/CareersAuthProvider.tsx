import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CareersAccountType, CareersUser, OrganizationType } from "@/lib/careers/types";
import {
  getCurrentUser,
  initCareersStores,
  registerUser,
  signInUser,
  signOutUser,
  updatePassword,
} from "@/lib/careers/repositories";
import { assertProductionApiAuthMode, isApiAuthMode, isDemoAuthMode } from "@/auth/auth-mode";
import {
  apiSignInWithPassword,
  apiSignOut,
  apiSignUpWithPassword,
  tryHydrateApiSession,
} from "@/auth/api-auth";
import { setCareersApiUnauthorizedHandler } from "@/lib/careers-api";

export type CareersSignUpInput = {
  name: string;
  email: string;
  phone: string;
  password: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  accountType: CareersAccountType;
  organizationId?: string;
  organizationName?: string;
  organizationType?: OrganizationType;
};

interface CareersAuthContextValue {
  user: CareersUser | null;
  hydrated: boolean;
  signUp: (input: CareersSignUpInput) => Promise<CareersUser>;
  signIn: (identifier: string, password: string) => Promise<CareersUser | null>;
  resetPassword: (identifier: string, password: string) => boolean;
  signOut: () => Promise<void>;
  refresh: () => void;
}

const CareersAuthContext = createContext<CareersAuthContextValue | null>(null);

export function CareersAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CareersUser | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const bootstrapped = useRef(false);

  const refresh = useCallback(() => {
    setUser(getCurrentUser());
  }, []);

  const clearLocal = useCallback(() => {
    signOutUser();
    setUser(null);
  }, []);

  useEffect(() => {
    assertProductionApiAuthMode();
  }, []);

  useEffect(() => {
    setCareersApiUnauthorizedHandler(() => {
      void apiSignOut().finally(clearLocal);
    });
    return () => setCareersApiUnauthorizedHandler(null);
  }, [clearLocal]);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    if (isDemoAuthMode()) {
      initCareersStores();
      setUser(getCurrentUser());
      setHydrated(true);
      return;
    }

    void tryHydrateApiSession()
      .then((result) => {
        setUser(result?.user ?? null);
      })
      .catch(() => {
        clearLocal();
      })
      .finally(() => {
        setHydrated(true);
      });
  }, [clearLocal]);

  const signUp = useCallback(async (input: CareersSignUpInput) => {
    if (isApiAuthMode()) {
      const result = await apiSignUpWithPassword({
        email: input.email,
        password: input.password,
        name: input.name,
        phone: input.phone,
        accountType: input.accountType,
        organizationName: input.organizationName,
        organizationType: input.organizationType,
      });
      setUser(result.user);
      return result.user;
    }

    const u = registerUser(input);
    setUser(u);
    return u;
  }, []);

  const signIn = useCallback(async (identifier: string, password: string) => {
    if (isApiAuthMode()) {
      const email = identifier.trim().toLowerCase();
      if (!email.includes("@")) {
        throw new Error("Sign in with your email address in API mode.");
      }
      const result = await apiSignInWithPassword(email, password);
      setUser(result.user);
      return result.user;
    }

    const u = signInUser(identifier, password);
    if (u) setUser(u);
    return u;
  }, []);

  const resetPassword = useCallback((identifier: string, password: string) => {
    if (isApiAuthMode()) {
      return false;
    }
    return updatePassword(identifier, password);
  }, []);

  const signOut = useCallback(async () => {
    if (isApiAuthMode()) {
      await apiSignOut();
    } else {
      signOutUser();
    }
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, hydrated, signUp, signIn, resetPassword, signOut, refresh }),
    [user, hydrated, signUp, signIn, resetPassword, signOut, refresh],
  );

  return (
    <CareersAuthContext.Provider value={value}>{children}</CareersAuthContext.Provider>
  );
}

export function useCareersAuth() {
  const ctx = useContext(CareersAuthContext);
  if (!ctx) throw new Error("useCareersAuth must be used within CareersAuthProvider");
  return ctx;
}
