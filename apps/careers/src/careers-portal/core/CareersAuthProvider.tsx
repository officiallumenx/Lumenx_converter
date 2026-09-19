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
  signOutUser,
} from "@/lib/careers/repositories";
import { assertProductionApiAuthMode, isApiAuthMode } from "@/auth/auth-mode";
import {
  apiSignInWithPassword,
  apiSignOut,
  apiSignUpWithPassword,
  apiRequestPasswordReset,
  tryHydrateApiSession,
} from "@/auth/api-auth";
import { setCareersApiUnauthorizedHandler } from "@/lib/careers-api";
import { getCareersApiClient } from "@/lib/careers-api";
import { ApiClientError } from "@/lib/api";
import { setLumenXFeedbackTransport } from "@lumenx/utils";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  verificationGrants?: string[];
};

interface CareersAuthContextValue {
  user: CareersUser | null;
  hydrated: boolean;
  signUp: (input: CareersSignUpInput) => Promise<CareersUser>;
  signIn: (identifier: string, password: string) => Promise<CareersUser | null>;
  resetPassword: (identifier: string, password?: string) => Promise<void>;
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
    if (!isApiAuthMode()) {
      setLumenXFeedbackTransport(null);
      return () => setLumenXFeedbackTransport(null);
    }
    const instituteId = user?.activeInstituteId?.trim() ?? "";
    setLumenXFeedbackTransport({
      resolveInstituteId: () => (UUID_RE.test(instituteId) ? instituteId : null),
      submit: async (input) => {
        await getCareersApiClient().post("/api/v1/product-feedback", {
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
  }, [user?.activeInstituteId]);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    void tryHydrateApiSession()
      .then((result) => {
        setUser(result?.user ?? null);
      })
      .catch((err) => {
        const transient =
          err instanceof ApiClientError && (err.status === 0 || err.status >= 500);
        if (!transient) clearLocal();
      })
      .finally(() => {
        setHydrated(true);
      });
  }, [clearLocal]);

  const signUp = useCallback(async (input: CareersSignUpInput) => {
    if (!isApiAuthMode()) {
      throw new Error("Careers authentication requires API mode.");
    }
    const result = await apiSignUpWithPassword({
      email: input.email,
      password: input.password,
      name: input.name,
      phone: input.phone,
      accountType: input.accountType,
      organizationName: input.organizationName,
      organizationType: input.organizationType,
      verificationGrants: input.verificationGrants ?? [],
    });
    setUser(result.user);
    return result.user;
  }, []);

  const signIn = useCallback(async (identifier: string, password: string) => {
    if (!isApiAuthMode()) {
      throw new Error("Careers authentication requires API mode.");
    }
    const email = identifier.trim().toLowerCase();
    if (!email.includes("@")) {
      throw new Error("Sign in with your email address.");
    }
    const result = await apiSignInWithPassword(email, password);
    setUser(result.user);
    return result.user;
  }, []);

  const resetPassword = useCallback(async (identifier: string, password?: string) => {
    if (!isApiAuthMode()) {
      throw new Error("Careers authentication requires API mode.");
    }
    void password;
    await apiRequestPasswordReset(identifier);
  }, []);

  const signOut = useCallback(async () => {
    clearLocal();
    await apiSignOut().catch(() => undefined);
  }, [clearLocal]);

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
