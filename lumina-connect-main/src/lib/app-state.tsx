import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Institute, Role, User } from "./types";
import { children as linkedChildren, registeredInstitutes } from "./mock-data";
import { LINKED_CHILD_IDS, resolveLinkedChildId } from "./parent-portal-data";

function resolveInstitute(id: string | null): Institute | null {
  if (!id) return null;
  return registeredInstitutes.find((i) => i.id === id) ?? null;
}

interface AppState {
  user: User | null;
  role: Role | null;
  activeInstituteId: string | null;
  institute: Institute | null;
  theme: "light" | "dark";
  activeChildId: string;
  /** Parent: show student-facing nav (growth, ID card) for a child without their own device. */
  studentIncludedMode: boolean;
  setActiveChildId: (id: string) => void;
  setStudentIncludedMode: (value: boolean) => void;
  signIn: (phone: string, role: Role, instituteId: string) => void;
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
      const u = localStorage.getItem("ues_user");
      const r = localStorage.getItem("ues_role") as Role | null;
      const t = localStorage.getItem("ues_theme") as "light" | "dark" | null;
      const c = localStorage.getItem("ues_child");
      const ins = localStorage.getItem("ues_institute");
      const sim = localStorage.getItem("ues_student_included");
      if (u) setUser(JSON.parse(u));
      if (r) setRoleState(r);
      if (t) setTheme(t);
      if (c) setActiveChildIdState(resolveLinkedChildId(c));
      if (ins) setActiveInstituteIdState(ins);
      else if (u && r && registeredInstitutes[0])
        setActiveInstituteIdState(registeredInstitutes[0].id);
      if (sim === "1") setStudentIncludedModeState(true);
    } catch {
      void 0;
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("ues_theme", theme);
  }, [theme, hydrated]);

  const institute = useMemo(() => resolveInstitute(activeInstituteId), [activeInstituteId]);

  const signIn = useCallback((phone: string, r: Role, instituteId: string) => {
    const u: User = { ...DEMO_USER, phone };
    setUser(u);
    setRoleState(r);
    setActiveInstituteIdState(instituteId);
    localStorage.setItem("ues_user", JSON.stringify(u));
    localStorage.setItem("ues_role", r);
    localStorage.setItem("ues_institute", instituteId);
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    setRoleState(null);
    setActiveInstituteIdState(null);
    localStorage.removeItem("ues_user");
    localStorage.removeItem("ues_role");
    localStorage.removeItem("ues_institute");
  }, []);

  const setActiveChildId = useCallback((id: string) => {
    if (!LINKED_CHILD_IDS.has(id)) return;
    setActiveChildIdState(id);
    localStorage.setItem("ues_child", id);
  }, []);

  const setStudentIncludedMode = useCallback((value: boolean) => {
    setStudentIncludedModeState(value);
    localStorage.setItem("ues_student_included", value ? "1" : "0");
  }, []);

  const updateProfile = useCallback(
    (patch: Partial<Pick<User, "name" | "phone" | "email" | "address" | "avatar">>) => {
      setUser((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...patch };
        localStorage.setItem("ues_user", JSON.stringify(next));
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
