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
import { isApiAuthMode } from "@/auth/auth-mode";
import {
  clearTeacherPortalApiCache,
  loadTeacherPortalApiData,
} from "@/lib/teacher-classes";
import { loadTeacherPortalBundle } from "@/lib/teachers/load";
import { teacherRepository } from "@/lib/teacher/repositories";
import type {
  DashboardSnapshot,
  TeacherClass,
  TeacherProfile,
  TeacherStudent,
} from "@/lib/teacher/types";

/** Flat shape so consumers can read fields without brittle discriminant narrowing. */
export type TeacherPortalState = {
  isTeacher: boolean;
  profile: TeacherProfile | null;
  classes: TeacherClass[];
  dashboard: DashboardSnapshot | null;
  students: TeacherStudent[];
  isLoading: boolean;
  refresh: () => void;
};

const TeacherPortalCtx = createContext<TeacherPortalState | undefined>(undefined);

export function TeacherPortalRegistry({ children }: { children: ReactNode }) {
  const { role, activeInstituteId } = useApp();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [dashboard, setDashboard] = useState<DashboardSnapshot | null>(null);
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tick, setTick] = useState(0);
  const seq = useRef(0);
  const loadedRef = useRef(false);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (role !== "teacher") {
      loadedRef.current = false;
      clearTeacherPortalApiCache();
      setProfile((p) => (p === null ? p : null));
      setClasses((c) => (c.length === 0 ? c : []));
      setDashboard((d) => (d === null ? d : null));
      setStudents((s) => (s.length === 0 ? s : []));
      setIsLoading((v) => (v === false ? v : false));
      return;
    }

    const my = ++seq.current;
    const showSpinner = !loadedRef.current;
    if (showSpinner) setIsLoading(true);

    const loadDemo = async (): Promise<{
      profile: TeacherProfile;
      classes: TeacherClass[];
      dashboard: DashboardSnapshot;
      students: TeacherStudent[];
    }> => {
      const [p, roster, d] = await Promise.all([
        teacherRepository.getProfile(),
        Promise.all([
          teacherRepository.getClasses(),
          teacherRepository.getStudents(),
        ]),
        teacherRepository.getDashboard(),
      ]);
      return {
        profile: p,
        classes: roster[0],
        students: roster[1],
        dashboard: d,
      };
    };

    const loadApi = async (): Promise<{
      profile: TeacherProfile;
      classes: TeacherClass[];
      dashboard: DashboardSnapshot;
      students: TeacherStudent[];
    } | null> => {
      if (!activeInstituteId) return null;
      const roster = await loadTeacherPortalApiData(activeInstituteId);
      if (!roster) return null;
      const bundle = await loadTeacherPortalBundle({
        instituteId: activeInstituteId,
        classes: roster.classes,
      });
      return {
        profile: bundle.profile,
        classes: roster.classes,
        students: roster.allStudents,
        dashboard: bundle.dashboard,
      };
    };

    void (isApiAuthMode() && activeInstituteId ? loadApi() : loadDemo())
      .then((result) => {
        if (seq.current !== my) return;
        if (!result) {
          if (showSpinner) setIsLoading(false);
          return;
        }
        setProfile(result.profile);
        setClasses(result.classes);
        setDashboard(result.dashboard);
        setStudents(result.students);
        loadedRef.current = true;
        if (showSpinner) setIsLoading(false);
      })
      .catch(() => {
        if (seq.current !== my) return;
        if (showSpinner) setIsLoading(false);
      });
  }, [role, tick, activeInstituteId]);

  const value = useMemo<TeacherPortalState>(() => {
    if (role !== "teacher") {
      return {
        isTeacher: false,
        profile: null,
        classes: [],
        dashboard: null,
        students: [],
        isLoading: false,
        refresh,
      };
    }
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
