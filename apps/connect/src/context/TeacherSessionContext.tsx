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
import { loadTeacherPortalProfile } from "@/lib/teachers/load";

function mapTeachingScope(scope: string | undefined): TeacherAssignmentType {
  if (scope === "activity_coordinator") return "activity_coordinator";
  if (scope === "dual_role") return "dual_role";
  return "subject_teacher";
}

/**
 * Resolve assignment from GET teacher self-portal (real DB teaching_scope + portal_access_level).
 */
async function loadApiTeacherAssignment(
  instituteId: string,
  teacherId: string,
): Promise<TeacherAssignment> {
  const dto = await loadTeacherPortalProfile({ instituteId });
  const portalAccess =
    parseTeacherPortalAccess(dto.portalAccessLevel) ?? "faculty_only";

  return {
    teacherId: dto.teacherId || teacherId,
    assignmentType: mapTeachingScope(dto.teachingScope),
    portalAccess,
  };
}

/**
 * Hydrates the client teacher session from the Teacher Session repository
 * when a teacher profile is available. API mode uses the teacher self-portal;
 * demo mode keeps the mock repository.
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
    const teacherId = profile?.id;
    if (!teacherId) return;

    const my = ++seq.current;
    const task =
      isApiAuthMode() && activeInstituteId
        ? loadApiTeacherAssignment(activeInstituteId, teacherId).catch(() => {
            // Fail closed — do not fall back to mock dual_role.
            return {
              teacherId,
              assignmentType: "subject_teacher" as const,
              portalAccess: "read_only" as const,
            };
          })
        : isApiAuthMode()
          ? Promise.resolve({
              teacherId,
              assignmentType: "subject_teacher" as const,
              portalAccess: "read_only" as const,
            })
          : teacherSessionRepository.getAssignment(teacherId, {
              email: profile.email,
              phone: profile.phone,
            });

    task.then((assignment) => {
      if (seq.current !== my) return;
      teacherSessionStore.hydrate(assignment);
    });
  }, [
    hydrated,
    role,
    activeInstituteId,
    teacherPortal.isTeacher,
    teacherPortal.profile?.id,
    teacherPortal.profile?.email,
    teacherPortal.profile?.phone,
  ]);

  return children;
}
