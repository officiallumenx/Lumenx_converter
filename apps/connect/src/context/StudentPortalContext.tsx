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
import { loadStudentPortalSnapshot } from "@/lib/students";
import { studentRepository } from "@/lib/student/repositories";
import type { StudentSnapshot } from "@/lib/student/types";

/** Flat shape so consumers can read fields without brittle discriminant narrowing. */
export type StudentPortalState = {
  isStudent: boolean;
  snapshot: StudentSnapshot | null;
  isLoading: boolean;
  refresh: () => void;
};

const StudentPortalCtx = createContext<StudentPortalState | undefined>(undefined);

export function StudentPortalRegistry({ children }: { children: ReactNode }) {
  const { role, activeInstituteId, user } = useApp();
  const [snapshot, setSnapshot] = useState<StudentSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tick, setTick] = useState(0);
  const seq = useRef(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (role !== "student") {
      setSnapshot((s) => (s === null ? s : null));
      setIsLoading((loading) => (loading ? false : loading));
      return;
    }

    const my = ++seq.current;
    setIsLoading(true);

    const load = isApiAuthMode()
      ? loadStudentPortalSnapshot({
          instituteId: activeInstituteId,
          userDisplayName: user?.name,
          userEmail: user?.email,
        }).then((result) => (result.status === "ready" ? result.snapshot : null))
      : studentRepository.getSnapshot();

    load
      .then((s) => {
        if (seq.current !== my) return;
        setSnapshot(s);
        setIsLoading(false);
      })
      .catch(() => {
        if (seq.current !== my) return;
        setIsLoading(false);
      });
  }, [role, tick, activeInstituteId, user?.name, user?.email]);

  const value = useMemo<StudentPortalState>(() => {
    if (role !== "student") {
      return { isStudent: false, snapshot: null, isLoading: false, refresh };
    }
    return { isStudent: true, snapshot, isLoading, refresh };
  }, [role, snapshot, isLoading, refresh]);

  return <StudentPortalCtx.Provider value={value}>{children}</StudentPortalCtx.Provider>;
}

export function useStudentPortal(): StudentPortalState {
  const ctx = useContext(StudentPortalCtx);
  if (!ctx) throw new Error("useStudentPortal must be used within StudentPortalRegistry");
  return ctx;
}
