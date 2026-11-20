import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useApp } from "@/lib/app-state";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import { connectQueryKeys, scopedConnectKey } from "@/lib/connect-queries";
import { useConnectQueryUserId } from "@/lib/connect-queries/use-connect-query-user";
import { useConnectQueryRestoring } from "@/lib/connect-queries/PersistProvider";
import {
  bindTeacherPortalQueryClient,
  fetchTeacherPortalRoster,
  invalidateTeacherPortalQueries,
  removeTeacherPortalQueries,
  teacherPortalQueryKey,
  useTeacherPortalRosterQuery,
  useTeacherPortalQueryClient,
} from "@/lib/teacher-classes/use-teacher-portal-query";
import { bumpTeacherPortalRosterEpoch } from "@/lib/teacher-classes/load";
import { prefetchTeacherModuleQueries } from "@/lib/connect-queries/prefetch-teacher";
import { enrichTeacherDashboardSnapshot } from "@/lib/dashboard";
import { loadTeacherPortalBase } from "@/lib/teachers/load";
import { loadTeacherTimetable } from "@/lib/timetable/load";
import type {
  DashboardSnapshot,
  TeacherClass,
  TeacherProfile,
  TeacherStudent,
} from "@/lib/teacher/types";

/** Flat shape so consumers can read fields without brittle discriminant narrowing. */
export type TeacherPortalState = {
  isTeacher: boolean;
  /** Linked teacher id for the active institute (from roster query). */
  teacherId: string | null;
  profile: TeacherProfile | null;
  /** From roster/base portal self — hydrates TeacherSession without a third portal/me. */
  teachingScope: "subject_teacher" | "activity_coordinator" | "dual_role" | null;
  portalAccessLevel: "faculty_grading" | "faculty_only" | "read_only" | null;
  classes: TeacherClass[];
  dashboard: DashboardSnapshot | null;
  students: TeacherStudent[];
  isLoading: boolean;
  /** Real API/load error — never falls back to demo data. */
  errorMessage: string | null;
  refresh: () => void;
};

const TeacherPortalCtx = createContext<TeacherPortalState | undefined>(undefined);

const EMPTY_CLASSES: TeacherClass[] = [];
const EMPTY_STUDENTS: TeacherStudent[] = [];

export function TeacherPortalRegistry({ children }: { children: ReactNode }) {
  const { role, activeInstituteId, user } = useApp();
  const queryClient = useTeacherPortalQueryClient();
  const isRestoring = useConnectQueryRestoring();
  const userId = useConnectQueryUserId();
  const isTeacher = role === "teacher";
  const instituteOk =
    Boolean(activeInstituteId) && isInstituteUuid(activeInstituteId ?? "");

  useEffect(() => {
    bindTeacherPortalQueryClient(queryClient);
    return () => bindTeacherPortalQueryClient(null);
  }, [queryClient]);

  // Home shell roster: catalog + portalSelf only (no enrollments/photos on critical path).
  const rosterQuery = useTeacherPortalRosterQuery({
    instituteId: activeInstituteId,
    userId,
    enabled: isTeacher && Boolean(user?.id),
    includeStudents: false,
  });

  // Timetable only needs instituteId — start in parallel with roster (not after it).
  const timetableQuery = useQuery({
    queryKey: scopedConnectKey(
      userId,
      connectQueryKeys.timetableTeacher(activeInstituteId ?? "_", "self"),
    ),
    queryFn: () =>
      loadTeacherTimetable({
        instituteId: activeInstituteId!,
      }),
    enabled:
      isTeacher &&
      isApiAuthMode() &&
      instituteOk &&
      Boolean(user?.id) &&
      Boolean(activeInstituteId),
    placeholderData: (previous) => previous,
  });

  // Leave teacher role / logout: drop cached roster so institutes cannot leak.
  useEffect(() => {
    if (isTeacher) return;
    removeTeacherPortalQueries(queryClient);
  }, [isTeacher, queryClient]);

  // Institute switch: invalidate module roster so an in-flight prior load cannot publish.
  const prevInstituteRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevInstituteRef.current;
    const next = activeInstituteId ?? null;
    prevInstituteRef.current = next;
    if (prev && next && prev !== next) {
      bumpTeacherPortalRosterEpoch();
    }
  }, [activeInstituteId]);

  const roster = rosterQuery.data ?? null;
  const classes = roster?.classes ?? EMPTY_CLASSES;
  const students = roster?.allStudents ?? EMPTY_STUDENTS;
  const teacherId = roster?.teacherId ?? null;
  const classSig = classes.map((c) => c.id).sort().join(",");

  const bundleEnabled =
    isTeacher &&
    isApiAuthMode() &&
    instituteOk &&
    Boolean(roster) &&
    Boolean(activeInstituteId);

  // Base waits for roster shell + timetable (timetable likely already in flight/done).
  const timetableReady =
    timetableQuery.isFetched ||
    timetableQuery.isError ||
    Boolean(timetableQuery.data);

  const bundleKeyBase = [
    ...scopedConnectKey(
      userId,
      connectQueryKeys.teacherPortalBundle(activeInstituteId ?? "_"),
    ),
    classSig,
  ] as const;

  // Phase 1: profile + timetable shell — unblocks first usable Home paint.
  const baseQuery = useQuery({
    queryKey: [...bundleKeyBase, "base", timetableQuery.dataUpdatedAt],
    queryFn: ({ signal }) =>
      loadTeacherPortalBase({
        instituteId: activeInstituteId!,
        classes: roster!.classes,
        signal,
        schedule: timetableQuery.data?.schedule,
      }),
    enabled: bundleEnabled && timetableReady,
    placeholderData: (previous) => previous,
  });

  // Phase 2: homework/exams/inbox/attendance widgets — must not block shell paint.
  const enrichQuery = useQuery({
    queryKey: [...bundleKeyBase, "enrich"],
    queryFn: () =>
      enrichTeacherDashboardSnapshot({
        instituteId: activeInstituteId!,
        teacherId: baseQuery.data!.teacherId,
        classes: roster!.classes,
        base: baseQuery.data!.dashboard,
      }),
    enabled: bundleEnabled && Boolean(baseQuery.data),
    placeholderData: (previous) => previous,
  });

  const profile = baseQuery.data?.profile ?? null;
  // Prefer enriched widgets when ready; keep base schedule/classes if enrich fails/lags.
  const dashboard = enrichQuery.data ?? baseQuery.data?.dashboard ?? null;
  const teachingScope =
    baseQuery.data?.portalSelf?.teachingScope ??
    roster?.portalSelf?.teachingScope ??
    null;
  const portalAccessLevel =
    baseQuery.data?.portalSelf?.portalAccessLevel ??
    roster?.portalSelf?.portalAccessLevel ??
    null;

  // Upgrade shell roster with enrollments/photos in the background (My Classes / search).
  useEffect(() => {
    if (!isTeacher || !activeInstituteId || !instituteOk || !roster) return;
    if (roster.studentsLoaded) return;
    let cancelled = false;
    void fetchTeacherPortalRoster(activeInstituteId, { includeStudents: true }).then(
      (full) => {
        if (cancelled || !full) return;
        queryClient.setQueryData(
          teacherPortalQueryKey(userId, activeInstituteId),
          full,
        );
      },
    );
    return () => {
      cancelled = true;
    };
  }, [
    isTeacher,
    activeInstituteId,
    instituteOk,
    roster,
    queryClient,
    userId,
  ]);

  // Warm module caches once roster identity is known (background; no UI block).
  useEffect(() => {
    if (!isTeacher || isRestoring || !activeInstituteId || !teacherId || !instituteOk) {
      return;
    }
    if (!roster) return;
    return prefetchTeacherModuleQueries(
      queryClient,
      userId,
      activeInstituteId,
      teacherId,
    );
  }, [
    isTeacher,
    isRestoring,
    activeInstituteId,
    teacherId,
    instituteOk,
    roster,
    queryClient,
    userId,
  ]);

  const refresh = useCallback(() => {
    if (!activeInstituteId) return;
    void invalidateTeacherPortalQueries(queryClient, userId, activeInstituteId);
  }, [activeInstituteId, queryClient, userId]);

  const rosterError =
    rosterQuery.isError && !roster
      ? rosterQuery.error instanceof Error
        ? rosterQuery.error.message
        : "Failed to load classes"
      : null;

  const noIdentityError =
    isTeacher &&
    isApiAuthMode() &&
    instituteOk &&
    rosterQuery.isSuccess &&
    roster === null
      ? "No teacher identity linked for this institute. Sign in with the phone used when Admin created your teacher profile."
      : null;

  const bundleError =
    baseQuery.isError && !baseQuery.data
      ? baseQuery.error instanceof Error
        ? baseQuery.error.message
        : "Failed to load teacher profile"
      : !isApiAuthMode() && isTeacher
        ? "Connect teacher portal requires API authentication."
        : null;

  const errorMessage = rosterError ?? noIdentityError ?? bundleError;

  // Treat IDB restore as loading only when we have nothing to show yet (avoids empty flash
  // and avoids blocking forever when dehydrated cache already has roster/dashboard).
  // Enrichment lag must not keep the whole Home in loading — base shell is usable.
  const isLoading =
    isTeacher &&
    ((isRestoring && !roster && !dashboard) ||
      (rosterQuery.isLoading && !roster) ||
      (bundleEnabled && baseQuery.isLoading && !profile && !dashboard));

  const value = useMemo<TeacherPortalState>(() => {
    if (!isTeacher) {
      return {
        isTeacher: false,
        teacherId: null,
        profile: null,
        teachingScope: null,
        portalAccessLevel: null,
        classes: [],
        dashboard: null,
        students: [],
        isLoading: false,
        errorMessage: null,
        refresh,
      };
    }
    return {
      isTeacher: true,
      teacherId,
      profile,
      teachingScope,
      portalAccessLevel,
      classes,
      dashboard,
      students,
      isLoading,
      errorMessage,
      refresh,
    };
  }, [
    isTeacher,
    teacherId,
    profile,
    teachingScope,
    portalAccessLevel,
    classes,
    dashboard,
    students,
    isLoading,
    errorMessage,
    refresh,
  ]);

  return <TeacherPortalCtx.Provider value={value}>{children}</TeacherPortalCtx.Provider>;
}

export function useTeacherPortal(): TeacherPortalState {
  const ctx = useContext(TeacherPortalCtx);
  if (!ctx) throw new Error("useTeacherPortal must be used within TeacherPortalRegistry");
  return ctx;
}
