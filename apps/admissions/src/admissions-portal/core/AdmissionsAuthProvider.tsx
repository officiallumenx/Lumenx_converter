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
import type { AdmissionsUser } from "@/lib/admissions/types";
import {
  getCurrentUser,
  getAllApplications,
  initAdmissionsStores,
  registerUser,
  signInUser,
  signOutUser,
  updatePassword,
} from "@/lib/admissions/repositories";
import { listenForAdminSyncRequests } from "@/lib/admissions/admin-bridge";
import { assertProductionApiAuthMode, isApiAuthMode, isDemoAuthMode } from "@/auth/auth-mode";
import {
  apiSignInWithPassword,
  apiSignOut,
  apiSignUpWithPassword,
  tryHydrateApiSession,
} from "@/auth/api-auth";
import { setAdmissionsApiUnauthorizedHandler } from "@/lib/admissions-api";
import { getAdmissionsApiClient } from "@/lib/admissions-api";
import { setLumenXFeedbackTransport } from "@lumenx/utils";
import { isInstituteUuid } from "@/lib/institute-id";

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
  }) => Promise<AdmissionsUser>;
  signIn: (
    identifier: string,
    password: string,
    expectedAccountType?: AdmissionsUser["accountType"],
  ) => Promise<AdmissionsUser | null>;
  resetPassword: (identifier: string, password: string) => boolean;
  signOut: () => Promise<void>;
  refresh: () => void;
}

const AdmissionsAuthContext = createContext<AdmissionsAuthContextValue | null>(null);

export function AdmissionsAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdmissionsUser | null>(null);
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
    setAdmissionsApiUnauthorizedHandler(() => {
      void apiSignOut().finally(clearLocal);
    });
    return () => setAdmissionsApiUnauthorizedHandler(null);
  }, [clearLocal]);

  useEffect(() => {
    if (!isApiAuthMode()) {
      setLumenXFeedbackTransport(null);
      return () => setLumenXFeedbackTransport(null);
    }
    setLumenXFeedbackTransport({
      resolveInstituteId: () =>
        isInstituteUuid(user?.instituteId) ? user!.instituteId!.trim() : null,
      submit: async (input) => {
        await getAdmissionsApiClient().post("/api/v1/product-feedback", {
          institute_id: input.instituteId,
          source: input.source,
          kind: input.kind,
          rating: input.rating,
          message: input.message.trim(),
          screenshot_file_name: input.screenshotFileName ?? null,
        });
      },
    });
    return () => setLumenXFeedbackTransport(null);
  }, [user?.instituteId]);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    if (isDemoAuthMode()) {
      initAdmissionsStores();
      setUser(getCurrentUser());
      setHydrated(true);
      return listenForAdminSyncRequests(() => getAllApplications());
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

    return listenForAdminSyncRequests(() => getAllApplications());
  }, [clearLocal]);

  const signUp = useCallback(
    async (input: Parameters<AdmissionsAuthContextValue["signUp"]>[0]) => {
      if (isApiAuthMode()) {
        const email = input.email?.trim().toLowerCase();
        if (!email?.includes("@")) {
          throw new Error("Sign up with your email address in API mode.");
        }
        const result = await apiSignUpWithPassword({
          email,
          password: input.password,
          name: input.name,
          phone: input.phone,
          accountType: input.accountType ?? "parent",
          instituteName: input.instituteName,
        });
        setUser(result.user);
        return result.user;
      }

      const u = registerUser(input);
      setUser(u);
      return u;
    },
    [],
  );

  const signIn = useCallback(
    async (
      identifier: string,
      password: string,
      expectedAccountType?: AdmissionsUser["accountType"],
    ) => {
      if (isApiAuthMode()) {
        const email = identifier.trim().toLowerCase();
        if (!email.includes("@")) {
          throw new Error("Sign in with your email address in API mode.");
        }
        const result = await apiSignInWithPassword(email, password);
        if (
          expectedAccountType &&
          result.user.accountType !== expectedAccountType
        ) {
          await apiSignOut();
          throw new Error(`This account is not registered as ${expectedAccountType.replace("_", " ")}.`);
        }
        setUser(result.user);
        return result.user;
      }

      const u = signInUser(identifier, password, expectedAccountType);
      if (u) setUser(u);
      return u;
    },
    [],
  );

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
    <AdmissionsAuthContext.Provider value={value}>{children}</AdmissionsAuthContext.Provider>
  );
}

export function useAdmissionsAuth() {
  const ctx = useContext(AdmissionsAuthContext);
  if (!ctx) throw new Error("useAdmissionsAuth must be used within AdmissionsAuthProvider");
  return ctx;
}
