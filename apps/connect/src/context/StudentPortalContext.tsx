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
import { connectQueryKeys, scopedConnectKey } from "@/lib/connect-queries";
import { useConnectQueryUserId } from "@/lib/connect-queries/use-connect-query-user";
import { useConnectQueryRestoring } from "@/lib/connect-queries/PersistProvider";
import { prefetchStudentModuleQueries } from "@/lib/connect-queries/prefetch-student";
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
  const isRestoring = useConnectQueryRestoring();
  const userId = useConnectQueryUserId();
  const isStudent = role === "student";
  const canRun =
    isStudent &&
    Boolean(user?.id) &&
    Boolean(activeInstituteId) &&
    (isApiAuthMode() ? isInstituteUuid(activeInstituteId ?? "") : true);

  const query = useQuery({
    queryKey: scopedConnectKey(
      userId,
      connectQueryKeys.studentPortal(activeInstituteId ?? "_"),
    ),
    queryFn: async () => {
      if (isApiAuthMode()) {
        const result = await loadStudentPortalSnapshot({
          instituteId: activeInstituteId,
          userDisplayName: user?.name,
          userEmail: user?.email,
        });
        if (result.status === "ready" && result.snapshot) return result.snapshot;
        // Empty linkage is a stable outcome; other statuses are retried by React Query.
        if (result.status === "empty" || result.status === "needs_institute") {
          return null;
        }
        throw new Error(result.errorMessage ?? `Student portal load: ${result.status}`);
      }
      return studentRepository.getSnapshot();
    },
    enabled: canRun && !isRestoring,
    retry: 2,
  });

  useEffect(() => {
    if (isStudent) return;
    queryClient.removeQueries({ queryKey: ["student-portal"] });
  }, [isStudent, queryClient]);

  const refresh = useCallback(() => {
    if (!activeInstituteId) return;
    void queryClient.invalidateQueries({
      queryKey: scopedConnectKey(
        userId,
        connectQueryKeys.studentPortal(activeInstituteId),
      ),
    });
  }, [activeInstituteId, queryClient, userId]);

  const snapshot = query.data ?? null;
  // While IndexedDB restore blocks the query (`enabled: !isRestoring`), keep portals in a
  // loading state — otherwise consumers flash "No linked student" for up to the restore window.
  const isLoading =
    isStudent &&
    (isRestoring || (canRun && !snapshot && (query.isLoading || query.isPending)));

  useEffect(() => {
    if (!isStudent || isRestoring || !snapshot || !activeInstituteId) return;
    const studentId = snapshot.profile.id;
    if (!isInstituteUuid(activeInstituteId) || !isInstituteUuid(studentId)) return;
    return prefetchStudentModuleQueries(
      queryClient,
      userId,
      activeInstituteId,
      studentId,
    );
  }, [isStudent, isRestoring, snapshot, activeInstituteId, queryClient, userId]);

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
