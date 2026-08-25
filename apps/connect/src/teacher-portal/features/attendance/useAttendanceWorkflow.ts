import { useMemo } from "react";
import {
  openAttendanceWorkflow,
  attendanceMethodLabel,
  attendanceOwnerLabel,
  isAttendanceSectionAllowed,
  periodsFromTimetableSlots,
  type AttendanceOwner,
  type AttendanceWorkflow,
} from "@lumenx/module-attendance";
import { attendanceSectionKey } from "@/lib/attendance/section-key";
import {
  buildTeacherAttendanceActorFromPermission,
  resolveTeacherAttendancePermission,
  taughtSectionKeysForTeacher,
} from "@/lib/attendance/teacher-permissions";
import type { TeacherClass, TeacherProfile, TimetableSlot } from "@/lib/teacher/types";
import { getClassTimetableForDay, getTodayDayName } from "@/lib/teacher/mock-data";

export { attendanceSectionKey };

export type TeacherMarkGate = {
  /** False when this teacher cannot mark under permission + configuration owner. */
  markingEnabled: boolean;
  banner: string | null;
  bannerTone: "info" | "warning";
};

/**
 * Teacher-portal mark gate — permission scope + engine ownership only.
 * No duplicate Taken By rules (configuration alone determines owner behavior).
 */
export function resolveTeacherMarkGate(
  workflow: AttendanceWorkflow | null,
  opts?: { permissionCanMark?: boolean },
): TeacherMarkGate {
  if (opts?.permissionCanMark === false) {
    return {
      markingEnabled: false,
      banner: "Your attendance role cannot mark this class.",
      bannerTone: "warning",
    };
  }

  if (!workflow) {
    return {
      markingEnabled: false,
      banner: "Attendance is not configured for this date.",
      bannerTone: "warning",
    };
  }

  if (!workflow.canMarkAny) {
    return {
      markingEnabled: false,
      banner:
        workflow.blockedReason ??
        "You cannot mark attendance under the current configuration.",
      bannerTone: "warning",
    };
  }

  return { markingEnabled: true, banner: null, bannerTone: "info" };
}

export function teacherOwnerPolicyLabel(owner: AttendanceOwner): string {
  return attendanceOwnerLabel(owner);
}

export function periodsFromTimetable(slots: TimetableSlot[]) {
  return periodsFromTimetableSlots(
    slots.map((s) => ({ subject: s.subject, time: s.time })),
  );
}

/** Prefer buildTeacherAttendanceActorFromPermission for new call sites. */
export function buildAttendanceActor(
  profile: TeacherProfile,
  selectedClass: TeacherClass | null | undefined,
) {
  const decision = resolveTeacherAttendancePermission(
    profile,
    selectedClass ? [selectedClass] : [],
    selectedClass,
  );
  if (!selectedClass) {
    return {
      teacherId: profile.id,
      teacherName: profile.name,
      subjects: profile.subjects ?? [],
      isClassTeacherForSection: false,
      isAttendanceIncharge: Boolean(profile.isAttendanceIncharge),
      teachesSection: false,
    };
  }
  return buildTeacherAttendanceActorFromPermission(
    profile,
    selectedClass,
    decision,
    taughtSectionKeysForTeacher([selectedClass]),
  );
}

export function useAttendanceWorkflow(opts: {
  date: string;
  selectedClass: TeacherClass | null | undefined;
  profile: TeacherProfile | null | undefined;
  teacherClasses?: readonly TeacherClass[];
}): {
  workflow: AttendanceWorkflow | null;
  methodLabel: string;
  ownerLabel: string;
  sectionKey: string;
  markGate: TeacherMarkGate;
} {
  const { date, selectedClass, profile, teacherClasses = [] } = opts;

  return useMemo(() => {
    if (!selectedClass || !profile) {
      return {
        workflow: null,
        methodLabel: "—",
        ownerLabel: "—",
        sectionKey: "",
        markGate: resolveTeacherMarkGate(null),
      };
    }

    const classes =
      teacherClasses.length > 0 ? teacherClasses : [selectedClass];
    const decision = resolveTeacherAttendancePermission(
      profile,
      classes,
      selectedClass,
    );
    const taught = taughtSectionKeysForTeacher(classes);
    const sectionKey = attendanceSectionKey(
      selectedClass.className,
      selectedClass.section,
    );
    const scopeOk =
      decision.canMark &&
      isAttendanceSectionAllowed(sectionKey, decision, {
        taughtSectionKeys: taught,
      });

    const dayName = (() => {
      try {
        const d = new Date(`${date}T12:00:00`);
        return d.toLocaleDateString("en-US", { weekday: "long" });
      } catch {
        return getTodayDayName();
      }
    })();

    const periods = periodsFromTimetable(
      getClassTimetableForDay(selectedClass.id, dayName),
    );
    const actor = buildTeacherAttendanceActorFromPermission(
      profile,
      selectedClass,
      decision,
      taught,
    );
    const workflow = openAttendanceWorkflow(
      {
        date,
        classLabel: selectedClass.className,
        section: selectedClass.section,
        sectionKey,
        periods,
      },
      actor,
    );

    return {
      workflow,
      methodLabel: workflow ? attendanceMethodLabel(workflow.method) : "—",
      ownerLabel: workflow ? attendanceOwnerLabel(workflow.owner) : "—",
      sectionKey,
      markGate: resolveTeacherMarkGate(workflow, {
        permissionCanMark: scopeOk,
      }),
    };
  }, [date, selectedClass, profile, teacherClasses]);
}
