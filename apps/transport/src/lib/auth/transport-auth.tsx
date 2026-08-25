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

import { isValidIndianMobile, type DemoDriver } from "./demo-drivers";

export interface TransportSessionUser {
  id: string;
  name: string;
  phone: string;
  employeeId: string;
}

interface TransportAuthState {
  user: TransportSessionUser | null;
  hydrated: boolean;
  signIn: (driver: DemoDriver) => void;
  signOut: () => void;
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

export function TransportAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<TransportSessionUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = storage.getItem(TRANSPORT_STORAGE_KEYS.session);
      if (raw) {
        const parsed = JSON.parse(raw) as TransportSessionUser;
        if (parsed?.id && parsed?.phone && isValidIndianMobile(parsed.phone)) {
          setUser(parsed);
        } else {
          clearTransportSession(storage);
        }
      }
    } catch {
      clearTransportSession(storage);
    }
    setHydrated(true);
  }, []);

  const signIn = useCallback((driver: DemoDriver) => {
    const sessionUser = toSessionUser(driver);
    setUser(sessionUser);
    storage.setItem(TRANSPORT_STORAGE_KEYS.session, JSON.stringify(sessionUser));
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    clearTransportSession(storage);
    resetTransportStores();
  }, []);

  const value = useMemo(
    () => ({ user, hydrated, signIn, signOut }),
    [user, hydrated, signIn, signOut],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTransportAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTransportAuth must be used within TransportAuthProvider");
  return ctx;
}
