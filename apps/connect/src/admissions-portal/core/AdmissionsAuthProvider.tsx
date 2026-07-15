import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { AdmissionsUser } from "@/lib/admissions/types";
import {
  getCurrentUser,
  initAdmissionsStores,
  registerUser,
  signInUser,
  signOutUser,
  updatePassword,
} from "@/lib/admissions/repositories";

interface AdmissionsAuthContextValue {
  user: AdmissionsUser | null;
  hydrated: boolean;
  signUp: (input: {
    name: string;
    email?: string;
    phone?: string;
    password: string;
    accountType?: AdmissionsUser["accountType"];
    instituteId?: string;
    instituteName?: string;
  }) => AdmissionsUser;
  signIn: (identifier: string, password: string) => AdmissionsUser | null;
  resetPassword: (identifier: string, password: string) => boolean;
  signOut: () => void;
  refresh: () => void;
}

const AdmissionsAuthContext = createContext<AdmissionsAuthContextValue | null>(null);

export function AdmissionsAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdmissionsUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(() => {
    setUser(getCurrentUser());
  }, []);

  useEffect(() => {
    initAdmissionsStores();
    setUser(getCurrentUser());
    setHydrated(true);
  }, []);

  const signUp = useCallback((input: Parameters<AdmissionsAuthContextValue["signUp"]>[0]) => {
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
    <AdmissionsAuthContext.Provider
      value={{ user, hydrated, signUp, signIn, resetPassword, signOut, refresh }}
    >
      {children}
    </AdmissionsAuthContext.Provider>
  );
}

export function useAdmissionsAuth() {
  const ctx = useContext(AdmissionsAuthContext);
  if (!ctx) throw new Error("useAdmissionsAuth must be used within AdmissionsAuthProvider");
  return ctx;
}
