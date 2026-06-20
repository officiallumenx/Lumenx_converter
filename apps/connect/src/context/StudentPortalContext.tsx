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
import { studentRepository } from "@/lib/student/repositories";
import type { StudentSnapshot } from "@/lib/student/types";

export type StudentPortalState =
  | { isStudent: false }
  | {
      isStudent: true;
      snapshot: StudentSnapshot | null;
      isLoading: boolean;
      refresh: () => void;
    };

const StudentPortalCtx = createContext<StudentPortalState | undefined>(undefined);

export function StudentPortalRegistry({ children }: { children: ReactNode }) {
  const { role } = useApp();
  const [snapshot, setSnapshot] = useState<StudentSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tick, setTick] = useState(0);
  const seq = useRef(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (role !== "student") {
      setSnapshot(null);
      setIsLoading(false);
      return;
    }

    const my = ++seq.current;
    setIsLoading(true);

    studentRepository
      .getSnapshot()
      .then((s) => {
        if (seq.current !== my) return;
        setSnapshot(s);
        setIsLoading(false);
      })
      .catch(() => {
        if (seq.current !== my) return;
        setIsLoading(false);
      });
  }, [role, tick]);

  const value = useMemo<StudentPortalState>(() => {
    if (role !== "student") return { isStudent: false };
    return { isStudent: true, snapshot, isLoading, refresh };
  }, [role, snapshot, isLoading, refresh]);

  return <StudentPortalCtx.Provider value={value}>{children}</StudentPortalCtx.Provider>;
}

export function useStudentPortal(): StudentPortalState {
  const ctx = useContext(StudentPortalCtx);
  if (!ctx) throw new Error("useStudentPortal must be used within StudentPortalRegistry");
  return ctx;
}
