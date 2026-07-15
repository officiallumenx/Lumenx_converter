import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { CareersAccountType, CareersUser, OrganizationType } from "@/lib/careers/types";
import {
  getCurrentUser,
  initCareersStores,
  registerUser,
  signInUser,
  signOutUser,
  updatePassword,
} from "@/lib/careers/repositories";

interface CareersAuthContextValue {
  user: CareersUser | null;
  hydrated: boolean;
  signUp: (input: {
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
  }) => CareersUser;
  signIn: (identifier: string, password: string) => CareersUser | null;
  resetPassword: (identifier: string, password: string) => boolean;
  signOut: () => void;
  refresh: () => void;
}

const CareersAuthContext = createContext<CareersAuthContextValue | null>(null);

export function CareersAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CareersUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(() => {
    setUser(getCurrentUser());
  }, []);

  useEffect(() => {
    initCareersStores();
    setUser(getCurrentUser());
    setHydrated(true);
  }, []);

  const signUp = useCallback((input: Parameters<CareersAuthContextValue["signUp"]>[0]) => {
    const u = registerUser(input);
    setUser(u);
    return u;
  }, []);

  const signIn = useCallback((identifier: string, password: string) => {
    const u = signInUser(identifier, password);
    if (u) setUser(u);
    return u;
  }, []);

  const resetPassword = useCallback((identifier: string, password: string) => {
    return updatePassword(identifier, password);
  }, []);

  const signOut = useCallback(() => {
    signOutUser();
    setUser(null);
  }, []);

  return (
    <CareersAuthContext.Provider
      value={{ user, hydrated, signUp, signIn, resetPassword, signOut, refresh }}
    >
      {children}
    </CareersAuthContext.Provider>
  );
}

export function useCareersAuth() {
  const ctx = useContext(CareersAuthContext);
  if (!ctx) throw new Error("useCareersAuth must be used within CareersAuthProvider");
  return ctx;
}
