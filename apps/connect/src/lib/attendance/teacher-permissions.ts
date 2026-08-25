/**
 * Connect Teacher attendance permissions — uses shared module policy only.
 * Teacher → own classes · Class Teacher → assigned class.
 * Actor flags are factual — Taken By comes only from configuration.
 */

import {
  resolveAttendancePermission,
  isAttendanceSectionAllowed,
  attendanceActorFlagsForSection,
  type AttendancePermissionDecision,
  type AttendancePersona,
} from "@lumenx/module-attendance";
import { attendanceSectionKey } from "@/lib/attendance/section-key";
import type { TeacherClass, TeacherProfile } from "@/lib/teacher/types";

/**
 * Persona for RBAC scope only (not Taken By).
 * Incharge profile expands assigned-class scope; ownership still needs factual flags.
 */
export function resolveTeacherAttendancePersona(
  profile: TeacherProfile | null | undefined,
  selectedClass: TeacherClass | null | undefined,
): AttendancePersona {
  // Prefer class-teacher scope when marking their assigned class.
  if (selectedClass?.isClassTeacher) return "class_teacher";
  if (profile?.isAttendanceIncharge) return "attendance_coordinator";
  return "teacher";
}

export function resolveTeacherAttendancePermission(
  profile: TeacherProfile | null | undefined,
  classes: readonly TeacherClass[],
  selectedClass?: TeacherClass | null,
): AttendancePermissionDecision {
  const persona = resolveTeacherAttendancePersona(profile, selectedClass ?? null);
  const assignedSectionKeys =
    persona === "class_teacher"
      ? classes
          .filter((c) => c.isClassTeacher)
          .map((c) => attendanceSectionKey(c.className, c.section))
      : persona === "attendance_coordinator"
        ? classes.map((c) => attendanceSectionKey(c.className, c.section))
        : [];

  return resolveAttendancePermission({ persona, assignedSectionKeys });
}

export function taughtSectionKeysForTeacher(
  classes: readonly TeacherClass[],
): string[] {
  return classes.map((c) => attendanceSectionKey(c.className, c.section));
}

export function filterTeacherClassesByAttendancePermission(
  classes: readonly TeacherClass[],
  decision: AttendancePermissionDecision,
): TeacherClass[] {
  const taught = taughtSectionKeysForTeacher(classes);
  return classes.filter((c) =>
    isAttendanceSectionAllowed(
      attendanceSectionKey(c.className, c.section),
      decision,
      { taughtSectionKeys: taught },
    ),
  );
}

export function buildTeacherAttendanceActorFromPermission(
  profile: TeacherProfile,
  selectedClass: TeacherClass,
  decision: AttendancePermissionDecision,
  taughtSectionKeys: readonly string[],
) {
  const sectionKey = attendanceSectionKey(
    selectedClass.className,
    selectedClass.section,
  );
  const flags = attendanceActorFlagsForSection(decision, sectionKey, {
    taughtSectionKeys,
    isClassTeacherForSection: Boolean(selectedClass.isClassTeacher),
    isAttendanceIncharge: Boolean(profile.isAttendanceIncharge),
    teachesSection: taughtSectionKeys.some(
      (k) => k === sectionKey,
    ),
  });
  return {
    teacherId: profile.id,
    teacherName: profile.name,
    subjects: profile.subjects ?? [],
    ...flags,
  };
}
