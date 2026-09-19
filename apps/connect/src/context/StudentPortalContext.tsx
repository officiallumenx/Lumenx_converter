import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApp } from "@/lib/app-state";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import { loadStudentPortalSnapshot } from "@/lib/students";
import { studentRepository } from "@/lib/student/repositories";
import { connectQueryKeys } from "@/lib/connect-queries";
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
  const queryClient = useQueryClient();
  const isStudent = role === "student";
  const canRun =
    isStudent &&
    Boolean(activeInstituteId) &&
    (isApiAuthMode() ? isInstituteUuid(activeInstituteId ?? "") : true);

  const query = useQuery({
    queryKey: connectQueryKeys.studentPortal(activeInstituteId ?? "_"),
    queryFn: async () => {
      if (isApiAuthMode()) {
        const result = await loadStudentPortalSnapshot({
          instituteId: activeInstituteId,
          userDisplayName: user?.name,
          userEmail: user?.email,
        });
        return result.status === "ready" ? result.snapshot : null;
      }
      return studentRepository.getSnapshot();
    },
    enabled: canRun,
  });

  useEffect(() => {
    if (isStudent) return;
    queryClient.removeQueries({ queryKey: ["student-portal"] });
  }, [isStudent, queryClient]);

  const refresh = useCallback(() => {
    if (!activeInstituteId) return;
    void queryClient.invalidateQueries({
      queryKey: connectQueryKeys.studentPortal(activeInstituteId),
    });
  }, [activeInstituteId, queryClient]);

  const snapshot = query.data ?? null;
  const isLoading = isStudent && canRun && query.isLoading && !snapshot;

  const value = useMemo<StudentPortalState>(() => {
    if (!isStudent) {
      return { isStudent: false, snapshot: null, isLoading: false, refresh };
    }
    return { isStudent: true, snapshot, isLoading, refresh };
  }, [isStudent, snapshot, isLoading, refresh]);

  return <StudentPortalCtx.Provider value={value}>{children}</StudentPortalCtx.Provider>;
}

export function useStudentPortal(): StudentPortalState {
  const ctx = useContext(StudentPortalCtx);
  if (!ctx) throw new Error("useStudentPortal must be used within StudentPortalRegistry");
  return ctx;
}
