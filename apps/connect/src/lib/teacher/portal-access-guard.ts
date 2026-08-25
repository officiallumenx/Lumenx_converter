import { toast } from "sonner";
import { teacherCanGrade, teacherCanWrite } from "@lumenx/teacher-session";
import { getTeacherPortalAccessLevel } from "@/lib/teacher-session/teacher-session-store";

export class TeacherAccessDeniedError extends Error {
  readonly code = "TEACHER_ACCESS_DENIED" as const;
  readonly capability: "write" | "grade";

  constructor(capability: "write" | "grade", message: string) {
    super(message);
    this.name = "TeacherAccessDeniedError";
    this.capability = capability;
  }
}

export function isTeacherAccessDenied(error: unknown): error is TeacherAccessDeniedError {
  return error instanceof TeacherAccessDeniedError;
}

/** Block create/edit/submit actions for Read-only accounts. */
export function assertTeacherCanWrite(): void {
  const level = getTeacherPortalAccessLevel();
  if (teacherCanWrite(level)) return;
  const message = "Your account is read-only. Contact Admin to request write access.";
  toast.error(message);
  throw new TeacherAccessDeniedError("write", message);
}

/** Block marks entry / publish for Faculty only and Read-only accounts. */
export function assertTeacherCanGrade(): void {
  const level = getTeacherPortalAccessLevel();
  if (teacherCanGrade(level)) return;
  const message =
    level === "read_only"
      ? "Your account is read-only. Contact Admin to request write access."
      : "Grading is not enabled for your account. Contact Admin for Faculty + Grading access.";
  toast.error(message);
  throw new TeacherAccessDeniedError("grade", message);
}
