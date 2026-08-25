import {
  resolveActivePortal,
  type TeacherActivePortal,
  type TeacherAssignment,
  type TeacherPortalAccessLevel,
  type TeacherSession,
} from "@lumenx/teacher-session";

const STORAGE_KEY = "lumenx-teacher-session";

type PersistedSession = Pick<TeacherSession, "teacherId" | "activePortal">;

type Listener = () => void;

function readPersisted(): PersistedSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSession;
    if (!parsed?.teacherId || !parsed.activePortal) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writePersisted(session: TeacherSession) {
  try {
    const payload: PersistedSession = {
      teacherId: session.teacherId,
      activePortal: session.activePortal,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota / private mode */
  }
}

function clearPersisted() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

let session: TeacherSession | null = null;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
}

export const teacherSessionStore = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get(): TeacherSession | null {
    return session;
  },
  /** Load assignment from repository and merge persisted portal preference. */
  hydrate(assignment: TeacherAssignment) {
    const persisted = readPersisted();
    const preferredPortal =
      persisted?.teacherId === assignment.teacherId ? persisted.activePortal : "subject";
    const next: TeacherSession = {
      teacherId: assignment.teacherId,
      assignmentType: assignment.assignmentType,
      activePortal: resolveActivePortal(assignment.assignmentType, preferredPortal),
      portalAccess: assignment.portalAccess,
    };
    if (
      session?.teacherId === next.teacherId &&
      session.assignmentType === next.assignmentType &&
      session.activePortal === next.activePortal &&
      session.portalAccess === next.portalAccess
    ) {
      return;
    }
    session = next;
    writePersisted(next);
    emit();
  },
  setActivePortal(portal: TeacherActivePortal) {
    if (!session || session.assignmentType !== "dual_role") return;
    const nextPortal = resolveActivePortal(session.assignmentType, portal);
    if (session.activePortal === nextPortal) return;
    session = { ...session, activePortal: nextPortal };
    writePersisted(session);
    emit();
  },
  /** Drop in-memory session only — keeps localStorage preference for next teacher login. */
  clearMemory() {
    if (session === null) return;
    session = null;
    emit();
  },
  reset() {
    session = null;
    clearPersisted();
    emit();
  },
};

export function getTeacherPortalAccessLevel(): TeacherPortalAccessLevel {
  return session?.portalAccess ?? "faculty_grading";
}
