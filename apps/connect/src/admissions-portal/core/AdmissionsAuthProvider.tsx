import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AdmissionsUser } from "@/lib/admissions/types";
import {
  getCurrentUser,
  initAdmissionsStores,
  getAllApplications,
  registerUser,
  signInUser,
  signOutUser,
  updatePassword,
} from "@/lib/admissions/repositories";
import { listenForAdminSyncRequests } from "@/lib/admissions/admin-bridge";

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
  signIn: (
    identifier: string,
    password: string,
    expectedAccountType?: AdmissionsUser["accountType"],
  ) => AdmissionsUser | null;
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
    return listenForAdminSyncRequests(() => getAllApplications());
  }, []);

  const signUp = useCallback((input: Parameters<AdmissionsAuthContextValue["signUp"]>[0]) => {
    const u = registerUser(input);
    setUser(u);
    return u;
  }, []);

  const signIn = useCallback(
    (
      identifier: string,
      password: string,
      expectedAccountType?: AdmissionsUser["accountType"],
    ) => {
      const u = signInUser(identifier, password, expectedAccountType);
      if (u) setUser(u);
      return u;
    },
    [],
  );

  const resetPassword = useCallback((identifier: string, password: string) => {
    return updatePassword(identifier, password);
  }, []);

  const signOut = useCallback(() => {
    signOutUser();
    setUser(null);
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
