import { useEffect, useRef, type ReactNode } from "react";
import { teacherSessionRepository } from "@lumenx/teacher-session";
import { useApp } from "@/lib/app-state";
import { useTeacherPortal } from "@/context/TeacherPortalContext";
import { teacherSessionStore } from "@/lib/teacher-session/teacher-session-store";

/**
 * Hydrates the client teacher session from the Teacher Session repository
 * when a teacher profile is available. Assignment resolution stays behind
 * the repository abstraction (mock today, backend later).
 */
export function TeacherSessionRegistry({ children }: { children: ReactNode }) {
  const { role, hydrated } = useApp();
  const teacherPortal = useTeacherPortal();
  const seq = useRef(0);

  useEffect(() => {
    if (!hydrated) return;

    if (role !== "teacher") {
      teacherSessionStore.clearMemory();
      return;
    }

    const teacherId = teacherPortal.isTeacher ? teacherPortal.profile?.id : undefined;
    if (!teacherId) return;

    const my = ++seq.current;
    teacherSessionRepository.getAssignment(teacherId).then((assignment) => {
      if (seq.current !== my) return;
      teacherSessionStore.hydrate(assignment);
    });
  }, [hydrated, role, teacherPortal.isTeacher, teacherPortal.profile?.id]);

  return children;
}
