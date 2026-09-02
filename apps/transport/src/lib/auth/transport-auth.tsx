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
  apiSignOut,
  hydrateApiTransportSession,
} from "@/lib/auth/api-auth";

import { isValidIndianMobile, type DemoDriver } from "./demo-drivers";

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
  signIn: (driver: DemoDriver) => void;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  apiMode: boolean;
}

const Ctx = createContext<TransportAuthState | null>(null);

const storage = createBrowserAuthStorage();

function toSessionUser(driver: DemoDriver): TransportSessionUser {
  return {
    id: driver.id,
    name: driver.name,
    phone: driver.phone,
    employeeId: driver.employeeId,
  };
}

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
        if (apiMode) {
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
        } else {
          const raw = storage.getItem(TRANSPORT_STORAGE_KEYS.session);
          if (raw) {
            const parsed = JSON.parse(raw) as TransportSessionUser;
            if (parsed?.id && parsed?.phone && isValidIndianMobile(parsed.phone)) {
              if (!cancelled) setUser(parsed);
            } else {
              clearTransportSession(storage);
            }
          }
        }
      } catch {
        clearTransportSession(storage);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [apiMode]);

  const signIn = useCallback((driver: DemoDriver) => {
    const sessionUser = toSessionUser(driver);
    setUser(sessionUser);
    persistSession(sessionUser);
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const session = await apiSignInWithPassword(email, password);
    const sessionUser: TransportSessionUser = {
      id: session.userId,
      name: session.name,
      phone: session.phone,
      employeeId: session.driverId,
      instituteId: session.instituteId,
      driverId: session.driverId,
      email: session.email,
    };
    setUser(sessionUser);
    persistSession(sessionUser);
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    if (apiMode) {
      void apiSignOut();
    }
    clearTransportSession(storage);
    resetTransportStores();
  }, [apiMode]);

  const value = useMemo(
    () => ({ user, hydrated, signIn, signInWithPassword, signOut, apiMode }),
    [user, hydrated, signIn, signInWithPassword, signOut, apiMode],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTransportAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTransportAuth must be used within TransportAuthProvider");
  return ctx;
}
