import { useEffect, useMemo, useState } from "react";
import { PageStack } from "@lumenx/ui-admin";
import { useAuth } from "@/auth/AuthContext";
import {
  adminAttendanceAccessBanner,
  getAttendanceModuleAccess,
} from "@/lib/attendance-coordinator-access";
import {
  listStudentAttendanceClassOptions,
  listStudentAttendanceSectionOptions,
} from "./class-section-options";
import { StudentAttendanceFilters } from "./StudentAttendanceFilters";
import { StudentAttendanceSummary } from "./StudentAttendanceSummary";
import { StudentAttendanceMarkPanel } from "./StudentAttendanceMarkPanel";
import {
  EMPTY_ATTENDANCE_SUMMARY,
  defaultStudentAttendanceWorkspaceState,
  type StudentAttendanceSummaryModel,
  type StudentAttendanceWorkspaceState,
} from "./types";

export type StudentAttendanceWorkspaceProps = {
  /** Optional controlled state; omit for self-contained page usage. */
  state?: StudentAttendanceWorkspaceState;
  onStateChange?: (next: StudentAttendanceWorkspaceState) => void;
};

/**
 * Central Student Attendance workspace.
 * Filters + summary + mark sheet. Marking uses the shared Attendance Engine only.
 */
export function StudentAttendanceWorkspace({
  state: controlledState,
  onStateChange,
}: StudentAttendanceWorkspaceProps) {
  const { user } = useAuth();
  const access = useMemo(() => getAttendanceModuleAccess(user), [user]);

  const [internal, setInternal] = useState(() => defaultStudentAttendanceWorkspaceState());
  const state = controlledState ?? internal;
  const [summary, setSummary] = useState<StudentAttendanceSummaryModel>(EMPTY_ATTENDANCE_SUMMARY);

  const setState = (patch: Partial<StudentAttendanceWorkspaceState>) => {
    const next = { ...state, ...patch };
    if (onStateChange) onStateChange(next);
    else setInternal(next);
  };

  const classOptions = useMemo(
    () => listStudentAttendanceClassOptions(access),
    [access],
  );
  const sectionOptions = useMemo(
    () => listStudentAttendanceSectionOptions(state.classId, access),
    [state.classId, access],
  );

  const classOptionKey = classOptions.map((c) => c.id).join("|");
  const sectionOptionKey = sectionOptions.map((s) => s.id).join("|");

  // Drop selection if it falls outside assigned scope (e.g. after role change).
  useEffect(() => {
    if (state.classId && !classOptions.some((c) => c.id === state.classId)) {
      setState({ classId: "", sectionId: "" });
      return;
    }
    if (state.sectionId && !sectionOptions.some((s) => s.id === state.sectionId)) {
      setState({ sectionId: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-validate when option ids change
  }, [classOptionKey, sectionOptionKey]);

  const classLabel = classOptions.find((c) => c.id === state.classId)?.label;
  const sectionLabel = sectionOptions.find((s) => s.id === state.sectionId)?.label;
  const scopeLabel =
    classLabel && sectionLabel ? `${classLabel}-${sectionLabel}` : classLabel ?? undefined;

  const readOnly = !access.canMark;
  const accessBanner = adminAttendanceAccessBanner(access);

  return (
    <PageStack>
      {accessBanner ? (
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          {accessBanner}
        </div>
      ) : null}

      {access.isAttendanceCoordinator && access.assignedSectionKeys.length === 0 ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
          No classes are assigned to this Attendance Coordinator. Ask an admin to set assigned
          classes under Roles & Access.
        </div>
      ) : null}

      {readOnly && !accessBanner ? (
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          Your role cannot mark attendance. Viewing is allowed.
        </div>
      ) : null}

      <StudentAttendanceSummary
        summary={summary}
        dateLabel={state.date || undefined}
        scopeLabel={scopeLabel}
      />

      <StudentAttendanceFilters
        state={state}
        classOptions={classOptions}
        sectionOptions={sectionOptions}
        onChange={setState}
        disabled={access.permission === "none"}
      />

      <StudentAttendanceMarkPanel
        state={state}
        access={access}
        onSummaryChange={setSummary}
      />
    </PageStack>
  );
}
