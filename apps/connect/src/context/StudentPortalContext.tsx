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
import { loadStudentPortalBase } from "@/lib/students";
import { studentRepository } from "@/lib/student/repositories";
import { connectQueryKeys, scopedConnectKey } from "@/lib/connect-queries";
import { useConnectQueryUserId } from "@/lib/connect-queries/use-connect-query-user";
import { useConnectQueryRestoring } from "@/lib/connect-queries/PersistProvider";
import { prefetchStudentModuleQueries } from "@/lib/connect-queries/prefetch-student";
import { loadConnectPortalInbox } from "@/lib/connect-inbox/load";
import { enrichStudentDashboardSnapshot } from "@/lib/dashboard";
import type { StudentSnapshot } from "@/lib/student/types";
import type { AppNotification } from "@lumenx/types";

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

  const portalKey = scopedConnectKey(
    userId,
    connectQueryKeys.studentPortal(activeInstituteId ?? "_"),
  );

  // Phase 1: profile shell — unblocks Home greeting without waiting on widgets.
  const baseQuery = useQuery({
    queryKey: [...portalKey, "base"],
    queryFn: async () => {
      if (isApiAuthMode()) {
        const result = await loadStudentPortalBase({
          instituteId: activeInstituteId,
          userDisplayName: user?.name,
          userEmail: user?.email,
        });
        if (result.status === "ready" && result.snapshot) return result.snapshot;
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

  // Phase 2: marks/exams/events/timetable/attendance/inbox — must not block greeting.
  const enrichQuery = useQuery({
    queryKey: [...portalKey, "enrich"],
    queryFn: async () => {
      const inboxPromise = queryClient.ensureQueryData({
        queryKey: scopedConnectKey(
          userId,
          connectQueryKeys.inbox(activeInstituteId!, "student"),
        ),
        queryFn: () => loadConnectPortalInbox(activeInstituteId!),
      }) as Promise<AppNotification[]>;
      return enrichStudentDashboardSnapshot({
        instituteId: activeInstituteId!,
        snapshot: baseQuery.data!,
        inbox: inboxPromise,
      });
    },
    enabled: canRun && !isRestoring && isApiAuthMode() && Boolean(baseQuery.data),
    placeholderData: (previous) => previous,
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

  // Prefer enriched widgets; keep profile shell while enrich lags or fails.
  const snapshot = enrichQuery.data ?? baseQuery.data ?? null;
  const isLoading =
    isStudent &&
    (isRestoring ||
      (canRun && !snapshot && (baseQuery.isLoading || baseQuery.isPending)));

  useEffect(() => {
    if (!isStudent || isRestoring || !baseQuery.data || !activeInstituteId) return;
    const studentId = baseQuery.data.profile.id;
    if (!isInstituteUuid(activeInstituteId) || !isInstituteUuid(studentId)) return;
    return prefetchStudentModuleQueries(
      queryClient,
      userId,
      activeInstituteId,
      studentId,
    );
  }, [isStudent, isRestoring, baseQuery.data, activeInstituteId, queryClient, userId]);

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
