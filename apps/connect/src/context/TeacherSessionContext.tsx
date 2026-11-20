import { useEffect, useRef, type ReactNode } from "react";
import {
  teacherSessionRepository,
  parseTeacherPortalAccess,
  type TeacherAssignment,
  type TeacherAssignmentType,
} from "@lumenx/teacher-session";
import { useApp } from "@/lib/app-state";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useTeacherPortal } from "@/context/TeacherPortalContext";
import { teacherSessionStore } from "@/lib/teacher-session/teacher-session-store";

function mapTeachingScope(scope: string | undefined | null): TeacherAssignmentType {
  if (scope === "activity_coordinator") return "activity_coordinator";
  if (scope === "dual_role") return "dual_role";
  return "subject_teacher";
}

/**
 * Hydrates the client teacher session when a teacher profile is available.
 * API mode reuses teachingScope / portalAccessLevel from TeacherPortalContext
 * (already loaded by roster/base) — no extra GET /teachers/portal/me.
 * Demo mode keeps the mock repository.
 */
export function TeacherSessionRegistry({ children }: { children: ReactNode }) {
  const { role, hydrated, activeInstituteId } = useApp();
  const teacherPortal = useTeacherPortal();
  const seq = useRef(0);

  useEffect(() => {
    if (!hydrated) return;

    if (role !== "teacher") {
      teacherSessionStore.clearMemory();
      return;
    }

    const profile = teacherPortal.isTeacher ? teacherPortal.profile : undefined;
    const teacherId = profile?.id ?? (teacherPortal.isTeacher ? teacherPortal.teacherId : null);
    if (!teacherId) return;

    const my = ++seq.current;

    if (isApiAuthMode()) {
      // Prefer roster/base teachingScope; while scopes are still loading use a
      // provisional subject_teacher session so Home is not gated on a third portal/me.
      const scopesReady = Boolean(
        teacherPortal.teachingScope || teacherPortal.portalAccessLevel,
      );
      if (activeInstituteId && !scopesReady && teacherPortal.isLoading) {
        teacherSessionStore.hydrate({
          teacherId,
          assignmentType: "subject_teacher",
          portalAccess: "faculty_only",
        });
        return;
      }

      const portalAccess =
        parseTeacherPortalAccess(teacherPortal.portalAccessLevel) ??
        (scopesReady ? "read_only" : "faculty_only");
      const assignment: TeacherAssignment = {
        teacherId,
        assignmentType: mapTeachingScope(teacherPortal.teachingScope),
        portalAccess,
      };
      if (seq.current !== my) return;
      teacherSessionStore.hydrate(assignment);
      return;
    }

    void teacherSessionRepository
      .getAssignment(teacherId, {
        email: profile?.email,
        phone: profile?.phone,
      })
      .then((assignment) => {
        if (seq.current !== my) return;
        teacherSessionStore.hydrate(assignment);
      });
  }, [
    hydrated,
    role,
    activeInstituteId,
    teacherPortal.isTeacher,
    teacherPortal.isLoading,
    teacherPortal.teacherId,
    teacherPortal.teachingScope,
    teacherPortal.portalAccessLevel,
    teacherPortal.profile?.id,
    teacherPortal.profile?.email,
    teacherPortal.profile?.phone,
  ]);

  return children;
}
