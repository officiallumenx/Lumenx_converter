import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { PageStack, Pill } from "@lumenx/ui-admin";
import { ADMIN_MODULE_LABELS as M } from "@/lib/admin-module-labels";
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
  /** Show links to insights / settings (Admin shell). */
  showRelatedLinks?: boolean;
};

/**
 * Central Student Attendance workspace.
 * Filters + summary + mark sheet. Marking uses the shared Attendance Engine only.
 */
export function StudentAttendanceWorkspace({
  state: controlledState,
  onStateChange,
  showRelatedLinks = true,
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
      {showRelatedLinks ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Pill tone="neutral">{M.attendance}</Pill>
          <Pill tone="info">{access.label}</Pill>
          {access.scopeMode === "assigned_classes" || access.scopeMode === "assigned_class" ? (
            <span>Assigned classes only</span>
          ) : access.canMark ? (
            <span>Central workspace</span>
          ) : access.canMonitor ? (
            <span>Monitor only</span>
          ) : (
            <span>View only</span>
          )}
          <span className="text-border">·</span>
          <Link to="/attendance" className="font-medium text-primary hover:underline">
            Monitor & analytics
          </Link>
          <span className="text-border">·</span>
          <Link
            to="/academic-management"
            search={{ view: "settings" }}
            className="font-medium text-primary hover:underline"
          >
            Attendance settings
          </Link>
        </div>
      ) : null}

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

      <StudentAttendanceFilters
        state={state}
        classOptions={classOptions}
        sectionOptions={sectionOptions}
        onChange={setState}
        disabled={access.permission === "none"}
      />

      <StudentAttendanceSummary
        summary={summary}
        dateLabel={state.date || undefined}
        scopeLabel={scopeLabel}
      />

      <StudentAttendanceMarkPanel
        state={state}
        access={access}
        onSummaryChange={setSummary}
      />
    </PageStack>
  );
}
