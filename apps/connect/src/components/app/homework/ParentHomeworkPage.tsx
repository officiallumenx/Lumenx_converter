import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { AssignmentDetailDialog } from "@/components/app/assignments/AssignmentDetailDialog";
import { useParentPortal } from "@/context/ParentPortalContext";
import { useStudentPortal } from "@/context/StudentPortalContext";
import { resolveAssignmentDetail } from "@/lib/assignment-details";
import type { StudentAssignmentDetail } from "@/lib/assignment-details";
import { getConnectStudentProfile } from "@/lib/mock-data";
import type { StudentAssignment } from "@/lib/mock-data";
import { assignmentsForClass } from "@/lib/parent-portal-data";
import { useApp } from "@/lib/app-state";
import { formatAssignmentDueLabel } from "@/lib/assignment-status";
import { isApiAuthMode } from "@/auth/auth-mode";
import { getConnectApiClient } from "@/lib/connect-api";
import type { MeResponse } from "@/lib/api/me-types";
import {
  learnerItemToDetail,
  learnerItemToStudentAssignment,
  loadParentHomeworkItems,
  loadStudentHomeworkItems,
} from "@/lib/homework";
import type { StudentDto } from "@/lib/students/types";
import { BookOpen, Calendar, ChevronRight, ClipboardList, User } from "lucide-react";
import { cn, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@lumenx/ui";
import { PageSkeleton } from "@/student-portal/shared/ui";

type WorkTab = "assignment" | "homework";

function WorkList({
  items,
  detailsById,
  emptyMessage,
  onSelect,
}: {
  items: StudentAssignment[];
  detailsById: Map<string, StudentAssignmentDetail>;
  emptyMessage: string;
  onSelect: (detail: StudentAssignmentDetail) => void;
}) {
  if (items.length === 0) {
    return <div className="parent-empty-state">{emptyMessage}</div>;
  }

  return (
    <ul className="space-y-2.5">
      {items.map((a) => {
        const detail = detailsById.get(a.id) ?? resolveAssignmentDetail(a);
        const hasFiles = detail.attachments.length > 0;

        return (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => onSelect(detail)}
              className={cn(
                "parent-work-list-item flex w-full min-w-0 items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-soft",
                "hover:border-primary/30 hover:bg-primary/[0.03]",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-snug break-words">{a.title}</p>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <BookOpen className="size-3.5 text-primary" />
                    {a.subject}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <User className="size-3.5 text-primary" />
                    {detail.teacherName}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="size-3.5 text-primary" />
                    Due {formatAssignmentDueLabel(a.dueDate, a.due)}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground line-clamp-1">
                  {hasFiles
                    ? `${detail.attachments.length} file${detail.attachments.length > 1 ? "s" : ""} · Tap to view & download`
                    : "Tap to view details"}
                </p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground/60" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function ParentHomeworkPage() {
  if (isApiAuthMode()) return <ApiParentHomeworkPage />;
  return <DemoParentHomeworkPage />;
}

function DemoParentHomeworkPage() {
  const { role } = useApp();
  const portal = useParentPortal();
  const studentPortal = useStudentPortal();
  const [tab, setTab] = useState<WorkTab>("assignment");
  const [selected, setSelected] = useState<StudentAssignmentDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { assignments, homework, subtitle } = useMemo(() => {
    if (role === "parent" && portal.isParent && portal.snapshot) {
      const snap = portal.snapshot;
      const list = snap.assignments;
      return {
        assignments: list.filter((a) => (a.type ?? "assignment") === "assignment"),
        homework: list.filter((a) => a.type === "homework"),
        subtitle: `${snap.child.name} · ${snap.classTag} · view assigned work (hand in at school)`,
      };
    }

    if (role === "student") {
      const profile =
        studentPortal.isStudent && studentPortal.snapshot
          ? studentPortal.snapshot.profile
          : getConnectStudentProfile();
      const classNum = profile.class.match(/\d+/)?.[0] ?? profile.class;
      const classTag = `${classNum}-${profile.section}`;
      const list = assignmentsForClass(classTag, profile.id);
      return {
        assignments: list.filter((a) => (a.type ?? "assignment") === "assignment"),
        homework: list.filter((a) => a.type === "homework"),
        subtitle: `${profile.name} · ${classTag} · view assigned work (hand in at school)`,
      };
    }

    return {
      assignments: [] as StudentAssignment[],
      homework: [] as StudentAssignment[],
      subtitle: "Assignments and homework — view only; hand in at school",
    };
  }, [role, portal.isParent, portal.snapshot, studentPortal.isStudent, studentPortal.snapshot]);

  const activeItems = tab === "assignment" ? assignments : homework;
  const detailsById = useMemo(() => new Map<string, StudentAssignmentDetail>(), []);
  const openDetail = (detail: StudentAssignmentDetail) => {
    setSelected(detail);
    setDetailOpen(true);
  };

  return (
    <HomeworkPageLayout
      subtitle={subtitle}
      tab={tab}
      onTabChange={setTab}
      assignments={assignments}
      homework={homework}
      activeItems={activeItems}
      detailsById={detailsById}
      onSelect={openDetail}
      selected={selected}
      detailOpen={detailOpen}
      onDetailOpenChange={(open) => {
        setDetailOpen(open);
        if (!open) setSelected(null);
      }}
    />
  );
}

function ApiParentHomeworkPage() {
  const { role, activeInstituteId, activeChildId, setActiveChildId } = useApp();
  const [tab, setTab] = useState<WorkTab>("assignment");
  const [selected, setSelected] = useState<StudentAssignmentDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentDto[]>([]);
  const [childId, setChildId] = useState(activeChildId);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [itemsByStudentId, setItemsByStudentId] = useState<
    Map<string, import("@/lib/homework").LearnerHomeworkItemDto[]>
  >(new Map());
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [details, setDetails] = useState<StudentAssignmentDetail[]>([]);
  const [subtitle, setSubtitle] = useState("Loading homework…");

  useEffect(() => {
    if (role !== "student" || !activeInstituteId) return;
    let cancelled = false;
    void getConnectApiClient()
      .get<MeResponse>("/api/v1/me")
      .then((me) => {
        if (cancelled) return;
        const identity =
          me.identities.students.find((s) => s.instituteId === activeInstituteId) ?? null;
        setStudentId(identity?.studentId ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [role, activeInstituteId]);

  useEffect(() => {
    if (!activeInstituteId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    if (role === "parent") {
      void loadParentHomeworkItems({ instituteId: activeInstituteId }).then((result) => {
        if (cancelled) return;
        setStudents(result.students);
        setItemsByStudentId(result.itemsByStudentId);
        if (result.students.length > 0) {
          const valid = childId && result.students.some((s) => s.id === childId);
          const next =
            valid ? childId : result.students.find((s) => s.id === activeChildId)?.id ?? result.students[0]!.id;
          if (next !== childId) {
            setChildId(next);
            setActiveChildId(next);
          }
        }
        setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }

    if (role === "student" && studentId) {
      void loadStudentHomeworkItems({
        instituteId: activeInstituteId,
        studentId,
      }).then((result) => {
        if (cancelled) return;
        setAssignments(result.assignments);
        setDetails(result.details);
        setSubtitle("View assigned work (hand in at school)");
        setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }

    if (role === "student" && !studentId) {
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [activeInstituteId, role, activeChildId, setActiveChildId, studentId]);

  useEffect(() => {
    if (role !== "parent") return;
    const student = students.find((s) => s.id === childId) ?? students[0];
    if (!student) {
      setAssignments([]);
      setDetails([]);
      setSubtitle("No linked students");
      return;
    }
    const items = itemsByStudentId.get(student.id) ?? [];
    const classLabel =
      student.classLabel && student.sectionLabel
        ? `${student.classLabel}-${student.sectionLabel}`
        : "Class";
    setAssignments(items.map((item) => learnerItemToStudentAssignment(item, classLabel)));
    setDetails(items.map((item) => learnerItemToDetail(item, classLabel)));
    setSubtitle(`${student.displayName} · ${classLabel} · view assigned work (hand in at school)`);
  }, [role, students, childId, itemsByStudentId]);

  const detailsById = useMemo(() => {
    const map = new Map<string, StudentAssignmentDetail>();
    for (const d of details) map.set(d.id, d);
    return map;
  }, [details]);

  const homework = useMemo(
    () => assignments.filter((a) => a.type === "homework"),
    [assignments],
  );
  const assignmentItems = useMemo(
    () => assignments.filter((a) => (a.type ?? "assignment") === "assignment"),
    [assignments],
  );
  const activeItems = tab === "assignment" ? assignmentItems : homework;

  if (loading) return <PageSkeleton rows={5} />;

  const childPicker =
    role === "parent" && students.length > 1 ? (
      <Select
        value={childId}
        onValueChange={(id) => {
          setChildId(id);
          setActiveChildId(id);
        }}
      >
        <SelectTrigger className="h-10 max-w-xs rounded-xl">
          <SelectValue placeholder="Select child" />
        </SelectTrigger>
        <SelectContent position="popper" className="z-[100]">
          {students.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.displayName}
              {s.classLabel && s.sectionLabel ? ` · ${s.classLabel}-${s.sectionLabel}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ) : null;

  return (
    <HomeworkPageLayout
      subtitle={subtitle}
      tab={tab}
      onTabChange={setTab}
      assignments={assignmentItems}
      homework={homework}
      activeItems={activeItems}
      detailsById={detailsById}
      onSelect={(detail) => {
        setSelected(detail);
        setDetailOpen(true);
      }}
      selected={selected}
      detailOpen={detailOpen}
      onDetailOpenChange={(open) => {
        setDetailOpen(open);
        if (!open) setSelected(null);
      }}
      headerExtra={childPicker}
    />
  );
}

function HomeworkPageLayout({
  subtitle,
  tab,
  onTabChange,
  assignments,
  homework,
  activeItems,
  detailsById,
  onSelect,
  selected,
  detailOpen,
  onDetailOpenChange,
  headerExtra,
}: {
  subtitle: string;
  tab: WorkTab;
  onTabChange: (tab: WorkTab) => void;
  assignments: StudentAssignment[];
  homework: StudentAssignment[];
  activeItems: StudentAssignment[];
  detailsById: Map<string, StudentAssignmentDetail>;
  onSelect: (detail: StudentAssignmentDetail) => void;
  selected: StudentAssignmentDetail | null;
  detailOpen: boolean;
  onDetailOpenChange: (open: boolean) => void;
  headerExtra?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 max-w-full space-y-5">
      <PageHeader title="Homework" subtitle={subtitle} />
      {headerExtra ? <div>{headerExtra}</div> : null}

      <div
        className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/30 p-1"
        role="tablist"
        aria-label="Homework type"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "assignment"}
          onClick={() => onTabChange("assignment")}
          className={cn("parent-work-tab", tab === "assignment" && "is-active")}
        >
          <ClipboardList className="size-4 shrink-0" />
          Assignments
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-xs tabular-nums",
              tab === "assignment" ? "bg-primary-foreground/20" : "bg-muted",
            )}
          >
            {assignments.length}
          </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "homework"}
          onClick={() => onTabChange("homework")}
          className={cn("parent-work-tab", tab === "homework" && "is-active")}
        >
          <BookOpen className="size-4 shrink-0" />
          Homework
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-xs tabular-nums",
              tab === "homework" ? "bg-primary-foreground/20" : "bg-muted",
            )}
          >
            {homework.length}
          </span>
        </button>
      </div>

      <WorkList
        items={activeItems}
        detailsById={detailsById}
        emptyMessage={
          tab === "assignment" ? "No assignments right now." : "No homework right now."
        }
        onSelect={onSelect}
      />

      <AssignmentDetailDialog
        assignment={selected}
        open={detailOpen}
        onOpenChange={onDetailOpenChange}
      />
    </div>
  );
}
