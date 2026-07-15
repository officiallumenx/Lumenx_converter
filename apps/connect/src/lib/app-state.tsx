import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Capacitor } from "@capacitor/core";
import type { Institute, Role, User } from "@lumenx/types";
import { CONNECT_STORAGE_KEYS } from "@lumenx/auth";
import { registeredInstitutes, children as linkedChildren } from "./mock-data";
import { LINKED_CHILD_IDS, resolveLinkedChildId } from "./parent-portal-data";
import { appLockStore } from "./app-lock-store";
import { resetAllConnectStores } from "./reset-stores";

function resolveInstitute(id: string | null): Institute | null {
  if (!id) return null;
  return registeredInstitutes.find((i) => i.id === id) ?? null;
}

interface AppState {
  user: User | null;
  role: Role | null;
  /** False until localStorage session is restored (avoids login redirect flash). */
  hydrated: boolean;
  activeInstituteId: string | null;
  institute: Institute | null;
  theme: "light" | "dark";
  activeChildId: string;
  /** Parent: show student-facing nav (growth, ID card) for a child without their own device. */
  studentIncludedMode: boolean;
  setActiveChildId: (id: string) => void;
  setStudentIncludedMode: (value: boolean) => void;
  signIn: (phone: string, role: Role, instituteId: string, opts?: { displayName?: string }) => void;
  updateProfile: (
    patch: Partial<Pick<User, "name" | "phone" | "email" | "address" | "avatar">>,
  ) => void;
  signOut: () => void;
  toggleTheme: () => void;
}

const Ctx = createContext<AppState | null>(null);

const DEMO_USER: Omit<User, "phone"> = {
  id: "u_demo",
  name: "Aarav Sharma",
  roles: ["parent", "teacher", "student"],
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRoleState] = useState<Role | null>(null);
  const [activeInstituteId, setActiveInstituteIdState] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [activeChildId, setActiveChildIdState] = useState<string>(linkedChildren[0]?.id ?? "C1");
  const [studentIncludedMode, setStudentIncludedModeState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const u = localStorage.getItem(CONNECT_STORAGE_KEYS.user);
      const r = localStorage.getItem(CONNECT_STORAGE_KEYS.role) as Role | null;
      const t = localStorage.getItem(CONNECT_STORAGE_KEYS.theme) as "light" | "dark" | null;
      const c = localStorage.getItem(CONNECT_STORAGE_KEYS.child);
      const ins = localStorage.getItem(CONNECT_STORAGE_KEYS.institute);
      const sim = localStorage.getItem(CONNECT_STORAGE_KEYS.studentIncluded);
      if (u) setUser(JSON.parse(u));
      if (r) setRoleState(r);
      if (t) setTheme(t);
      if (c) setActiveChildIdState(resolveLinkedChildId(c));
      if (ins) setActiveInstituteIdState(ins);
      else if (u && r && registeredInstitutes[0]) setActiveInstituteIdState(registeredInstitutes[0].id);
      if (sim === "1") setStudentIncludedModeState(true);
    } catch {
      void 0;
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(CONNECT_STORAGE_KEYS.theme, theme);
    // Sync native status-bar icon color to the in-app theme (the app's theme is a manual
    // toggle, independent of the system light/dark setting). No-op on web.
    if (Capacitor.isNativePlatform()) {
      void import("@capacitor/status-bar")
        .then(({ StatusBar, Style }) =>
          StatusBar.setStyle({ style: theme === "dark" ? Style.Dark : Style.Light }),
        )
        .catch(() => {
          /* status-bar plugin unavailable — native theme fallback still applies */
        });
    }
  }, [theme, hydrated]);

  const institute = useMemo(() => resolveInstitute(activeInstituteId), [activeInstituteId]);

  const signIn = useCallback((phone: string, r: Role, instituteId: string, opts?: { displayName?: string }) => {
    const u: User = { ...DEMO_USER, phone, name: opts?.displayName ?? DEMO_USER.name };
    setUser(u);
    setRoleState(r);
    setActiveInstituteIdState(instituteId);
    localStorage.setItem(CONNECT_STORAGE_KEYS.user, JSON.stringify(u));
    localStorage.setItem(CONNECT_STORAGE_KEYS.role, r);
    localStorage.setItem(CONNECT_STORAGE_KEYS.institute, instituteId);
  }, []);

  const signOut = useCallback(() => {
    appLockStore.lockSession();
    resetAllConnectStores();
    setUser(null);
    setRoleState(null);
    setActiveInstituteIdState(null);
    setActiveChildIdState(linkedChildren[0]?.id ?? "C1");
    setStudentIncludedModeState(false);
    localStorage.removeItem(CONNECT_STORAGE_KEYS.user);
    localStorage.removeItem(CONNECT_STORAGE_KEYS.role);
    localStorage.removeItem(CONNECT_STORAGE_KEYS.institute);
    localStorage.removeItem(CONNECT_STORAGE_KEYS.child);
    localStorage.removeItem(CONNECT_STORAGE_KEYS.studentIncluded);
  }, []);

  const setActiveChildId = useCallback((id: string) => {
    if (!LINKED_CHILD_IDS.has(id)) return;
    setActiveChildIdState(id);
    localStorage.setItem(CONNECT_STORAGE_KEYS.child, id);
  }, []);

  const setStudentIncludedMode = useCallback((value: boolean) => {
    setStudentIncludedModeState(value);
    localStorage.setItem(CONNECT_STORAGE_KEYS.studentIncluded, value ? "1" : "0");
  }, []);

  const updateProfile = useCallback(
    (patch: Partial<Pick<User, "name" | "phone" | "email" | "address" | "avatar">>) => {
      setUser((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...patch };
        localStorage.setItem(CONNECT_STORAGE_KEYS.user, JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  const toggleTheme = useCallback(() => setTheme((t) => (t === "light" ? "dark" : "light")), []);

  const value = useMemo<AppState>(
    () => ({
      user,
      role,
      hydrated,
      activeInstituteId,
      institute,
      theme,
      activeChildId,
      studentIncludedMode,
      setActiveChildId,
      setStudentIncludedMode,
      signIn,
      updateProfile,
      signOut,
      toggleTheme,
    }),
    [
      user,
      role,
      hydrated,
      activeInstituteId,
      institute,
      theme,
      activeChildId,
      studentIncludedMode,
      setActiveChildId,
      setStudentIncludedMode,
      signIn,
      updateProfile,
      signOut,
      toggleTheme,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside provider");
  return v;
}
