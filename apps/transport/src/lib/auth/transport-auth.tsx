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
  TRANSPORT_STORAGE_KEYS,
  createBrowserAuthStorage,
  clearTransportSession,
} from "@lumenx/auth";

import { resetTransportStores } from "@/lib/transport";
import { isApiAuthMode } from "@/lib/auth/auth-mode";
import {
  apiSignInWithPassword,
  apiSignInWithPhonePin,
  apiSignOut,
  hydrateApiTransportSession,
} from "@/lib/auth/api-auth";
import { setLumenXFeedbackTransport } from "@lumenx/utils";
import { getSupabaseAccessToken } from "@/lib/supabase-browser";

export interface TransportSessionUser {
  id: string;
  name: string;
  phone: string;
  employeeId: string;
  instituteId?: string;
  driverId?: string;
  email?: string | null;
}

interface TransportAuthState {
  user: TransportSessionUser | null;
  hydrated: boolean;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signInWithPhonePin: (phone: string, pin: string, instituteId?: string) => Promise<void>;
  signOut: () => void;
  apiMode: boolean;
}

const Ctx = createContext<TransportAuthState | null>(null);

const storage = createBrowserAuthStorage();

function persistSession(user: TransportSessionUser | null): void {
  if (!user) {
    clearTransportSession(storage);
    return;
  }
  storage.setItem(TRANSPORT_STORAGE_KEYS.session, JSON.stringify(user));
}

export function TransportAuthProvider({ children }: { children: ReactNode }) {
  const apiMode = isApiAuthMode();
  const [user, setUser] = useState<TransportSessionUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      try {
        const session = await hydrateApiTransportSession();
        if (!cancelled && session) {
          setUser({
            id: session.userId,
            name: session.name,
            phone: session.phone,
            employeeId: session.driverId,
            instituteId: session.instituteId,
            driverId: session.driverId,
            email: session.email,
          });
        }
      } catch {
        // Keep any persisted UI session only if hydrate failed transiently —
        // do not clear storage here (api-auth already signs out on 401/403).
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const instituteId = user?.instituteId?.trim() ?? "";
    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    setLumenXFeedbackTransport({
      resolveInstituteId: () => (UUID_RE.test(instituteId) ? instituteId : null),
      submit: async (input) => {
        const token = await getSupabaseAccessToken();
        if (!token) throw new Error("Authentication required");
        const base = (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8787").replace(
          /\/+$/,
          "",
        );
        const res = await fetch(`${base}/api/v1/product-feedback`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            institute_id: input.instituteId,
            source: input.source,
            kind: input.kind,
            rating: input.rating,
            message: input.message.trim(),
            screenshot_file_name: input.screenshotFileName ?? null,
          }),
        });
        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as {
            error?: { message?: string };
          };
          throw new Error(json.error?.message ?? `Request failed (${res.status})`);
        }
      },
    });
    return () => setLumenXFeedbackTransport(null);
  }, [apiMode, user?.instituteId]);

  const toSessionUser = (session: Awaited<ReturnType<typeof apiSignInWithPhonePin>>): TransportSessionUser => ({
    id: session.userId,
    name: session.name,
    phone: session.phone,
    employeeId: session.driverId,
    instituteId: session.instituteId,
    driverId: session.driverId,
    email: session.email,
  });

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const session = await apiSignInWithPassword(email, password);
    const sessionUser = toSessionUser(session);
    setUser(sessionUser);
    persistSession(sessionUser);
  }, []);

  const signInWithPhonePin = useCallback(
    async (phone: string, pin: string, instituteId?: string) => {
      const session = await apiSignInWithPhonePin(phone, pin, instituteId);
      const sessionUser = toSessionUser(session);
      setUser(sessionUser);
      persistSession(sessionUser);
    },
    [],
  );

  const signOut = useCallback(() => {
    setUser(null);
    void apiSignOut();
    clearTransportSession(storage);
    resetTransportStores();
  }, []);

  const value = useMemo(
    () => ({
      user,
      hydrated,
      signInWithPassword,
      signInWithPhonePin,
      signOut,
      apiMode,
    }),
    [user, hydrated, signInWithPassword, signInWithPhonePin, signOut, apiMode],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTransportAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTransportAuth must be used within TransportAuthProvider");
  return ctx;
}
