import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useApp } from "@/lib/app-state";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import { connectQueryKeys } from "@/lib/connect-queries";
import {
  bindTeacherPortalQueryClient,
  invalidateTeacherPortalQueries,
  removeTeacherPortalQueries,
  useTeacherPortalRosterQuery,
  useTeacherPortalQueryClient,
} from "@/lib/teacher-classes/use-teacher-portal-query";
import { loadTeacherPortalBundle } from "@/lib/teachers/load";
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
  const { role, activeInstituteId } = useApp();
  const queryClient = useTeacherPortalQueryClient();
  const isTeacher = role === "teacher";
  const instituteOk =
    Boolean(activeInstituteId) && isInstituteUuid(activeInstituteId ?? "");

  useEffect(() => {
    bindTeacherPortalQueryClient(queryClient);
    return () => bindTeacherPortalQueryClient(null);
  }, [queryClient]);

  const rosterQuery = useTeacherPortalRosterQuery({
    instituteId: activeInstituteId,
    enabled: isTeacher,
  });

  // Leave teacher role / logout: drop cached roster so institutes cannot leak.
  useEffect(() => {
    if (isTeacher) return;
    removeTeacherPortalQueries(queryClient);
  }, [isTeacher, queryClient]);

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

  const bundleQuery = useQuery({
    queryKey: [
      ...connectQueryKeys.teacherPortalBundle(activeInstituteId ?? "_"),
      classSig,
    ],
    queryFn: () =>
      loadTeacherPortalBundle({
        instituteId: activeInstituteId!,
        classes: roster!.classes,
      }),
    enabled: bundleEnabled,
  });

  const profile = bundleQuery.data?.profile ?? null;
  const dashboard = bundleQuery.data?.dashboard ?? null;

  const refresh = useCallback(() => {
    if (!activeInstituteId) return;
    void invalidateTeacherPortalQueries(queryClient, activeInstituteId);
  }, [activeInstituteId, queryClient]);

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
    bundleQuery.isError && !bundleQuery.data
      ? bundleQuery.error instanceof Error
        ? bundleQuery.error.message
        : "Failed to load teacher profile"
      : !isApiAuthMode() && isTeacher
        ? "Connect teacher portal requires API authentication."
        : null;

  const errorMessage = rosterError ?? noIdentityError ?? bundleError;

  const isLoading =
    isTeacher &&
    ((rosterQuery.isLoading && !roster) ||
      (bundleEnabled && bundleQuery.isLoading && !profile && !dashboard));

  const value = useMemo<TeacherPortalState>(() => {
    if (!isTeacher) {
      return {
        isTeacher: false,
        teacherId: null,
        profile: null,
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
