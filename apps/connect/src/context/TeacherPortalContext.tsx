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
import { useApp } from "@/lib/app-state";
import { teacherRepository } from "@/lib/teacher/repositories";
import type {
  DashboardSnapshot,
  TeacherClass,
  TeacherProfile,
  TeacherStudent,
} from "@/lib/teacher/types";

export type TeacherPortalState =
  | { isTeacher: false }
  | {
      isTeacher: true;
      profile: TeacherProfile | null;
      classes: TeacherClass[];
      dashboard: DashboardSnapshot | null;
      students: TeacherStudent[];
      isLoading: boolean;
      refresh: () => void;
    };

const TeacherPortalCtx = createContext<TeacherPortalState | undefined>(undefined);

export function TeacherPortalRegistry({ children }: { children: ReactNode }) {
  const { role } = useApp();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [dashboard, setDashboard] = useState<DashboardSnapshot | null>(null);
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tick, setTick] = useState(0);
  const seq = useRef(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (role !== "teacher") {
      setProfile(null);
      setClasses([]);
      setDashboard(null);
      setStudents([]);
      setIsLoading(false);
      return;
    }

    const my = ++seq.current;
    setIsLoading(true);

    Promise.all([
      teacherRepository.getProfile(),
      teacherRepository.getClasses(),
      teacherRepository.getDashboard(),
      teacherRepository.getStudents(),
    ])
      .then(([p, c, d, s]) => {
        if (seq.current !== my) return;
        setProfile(p);
        setClasses(c);
        setDashboard(d);
        setStudents(s);
        setIsLoading(false);
      })
      .catch(() => {
        if (seq.current !== my) return;
        setIsLoading(false);
      });
  }, [role, tick]);

  const value = useMemo<TeacherPortalState>(() => {
    if (role !== "teacher") return { isTeacher: false };
    return {
      isTeacher: true,
      profile,
      classes,
      dashboard,
      students,
      isLoading,
      refresh,
    };
  }, [role, profile, classes, dashboard, students, isLoading, refresh]);

  return <TeacherPortalCtx.Provider value={value}>{children}</TeacherPortalCtx.Provider>;
}

export function useTeacherPortal(): TeacherPortalState {
  const ctx = useContext(TeacherPortalCtx);
  if (!ctx) throw new Error("useTeacherPortal must be used within TeacherPortalRegistry");
  return ctx;
}
