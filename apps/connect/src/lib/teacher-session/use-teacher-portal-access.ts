import { useSyncExternalStore } from "react";
import {
  isActivityWorkspaceActive,
  isSubjectWorkspaceActive,
  teacherCanAccessActivityWorkspace,
  teacherCanAccessSubjectWorkspace,
  type TeacherActivePortal,
  type TeacherAssignmentType,
} from "@lumenx/teacher-session";
import { useApp } from "@/lib/app-state";
import { teacherSessionStore } from "./teacher-session-store";

export type TeacherPortalAccess = {
  isTeacher: boolean;
  isReady: boolean;
  teacherId: string | null;
  assignmentType: TeacherAssignmentType | null;
  /** Active workspace mode for dual-role teachers (`subject` | `activity`). */
  activePortal: TeacherActivePortal;
  isActivityWorkspaceActive: boolean;
  isSubjectWorkspaceActive: boolean;
  canAccessActivityWorkspace: boolean;
  canAccessSubjectWorkspace: boolean;
  setActivePortal: (portal: TeacherActivePortal) => void;
  /** @deprecated Use isActivityWorkspaceActive */
  isActivityPortalActive: boolean;
  /** @deprecated Use isSubjectWorkspaceActive */
  isSubjectPortalActive: boolean;
  /** @deprecated Use canAccessActivityWorkspace */
  canAccessActivityPortal: boolean;
  /** @deprecated Use canAccessSubjectWorkspace */
  canAccessSubjectPortal: boolean;
};

export function useTeacherPortalAccess(): TeacherPortalAccess {
  const { role } = useApp();
  const session = useSyncExternalStore(
    teacherSessionStore.subscribe,
    teacherSessionStore.get,
    () => null,
  );

  const isTeacher = role === "teacher";
  const isReady = !isTeacher || session !== null;
  const assignmentType = session?.assignmentType ?? null;

  const canAccessActivity =
    assignmentType !== null && teacherCanAccessActivityWorkspace(assignmentType);
  const canAccessSubject =
    assignmentType !== null && teacherCanAccessSubjectWorkspace(assignmentType);

  const activityActive = session !== null && isActivityWorkspaceActive(session);
  const subjectActive = session !== null && isSubjectWorkspaceActive(session);

  const isActivityWorkspaceActiveFlag = isTeacher && activityActive;
  const isSubjectWorkspaceActiveFlag = isTeacher && subjectActive;

  return {
    isTeacher,
    isReady,
    teacherId: session?.teacherId ?? null,
    assignmentType,
    activePortal: session?.activePortal ?? "subject",
    isActivityWorkspaceActive: isActivityWorkspaceActiveFlag,
    isSubjectWorkspaceActive: isSubjectWorkspaceActiveFlag,
    canAccessActivityWorkspace: canAccessActivity,
    canAccessSubjectWorkspace: canAccessSubject,
    setActivePortal: teacherSessionStore.setActivePortal,
    isActivityPortalActive: isActivityWorkspaceActiveFlag,
    isSubjectPortalActive: isSubjectWorkspaceActiveFlag,
    canAccessActivityPortal: canAccessActivity,
    canAccessSubjectPortal: canAccessSubject,
  };
}
