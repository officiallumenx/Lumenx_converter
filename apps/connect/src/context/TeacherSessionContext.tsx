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

    const profile = teacherPortal.isTeacher ? teacherPortal.profile : undefined;
    const teacherId = profile?.id;
    if (!teacherId) return;

    const my = ++seq.current;
    teacherSessionRepository
      .getAssignment(teacherId, { email: profile.email, phone: profile.phone })
      .then((assignment) => {
        if (seq.current !== my) return;
        teacherSessionStore.hydrate(assignment);
      });
  }, [
    hydrated,
    role,
    teacherPortal.isTeacher,
    teacherPortal.profile?.id,
    teacherPortal.profile?.email,
    teacherPortal.profile?.phone,
  ]);

  return children;
}
