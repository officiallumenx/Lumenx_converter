import { useMemo, useState } from "react";
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
import {
  getAssignmentVisualStatus,
  ASSIGNMENT_STATUS_LABEL,
  ASSIGNMENT_STATUS_DOT,
} from "@/lib/assignment-status";
import { BookOpen, Calendar, ChevronRight, ClipboardList, User } from "lucide-react";
import { cn } from "@lumenx/ui";

type WorkTab = "assignment" | "homework";

function WorkList({
  items,
  emptyMessage,
  onSelect,
}: {
  items: StudentAssignment[];
  emptyMessage: string;
  onSelect: (detail: StudentAssignmentDetail) => void;
}) {
  if (items.length === 0) {
    return <div className="parent-empty-state">{emptyMessage}</div>;
  }

  return (
    <ul className="space-y-2.5">
      {items.map((a) => {
        const visual = getAssignmentVisualStatus(a);
        const detail = resolveAssignmentDetail(a);
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
              <span
                className={cn("mt-1 size-2 shrink-0 rounded-full", ASSIGNMENT_STATUS_DOT[visual])}
              />
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
                    Due {a.due}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground line-clamp-1">
                  {hasFiles
                    ? `${detail.attachments.length} PDF${detail.attachments.length > 1 ? "s" : ""} · Tap to view & download`
                    : "Tap to view details"}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {ASSIGNMENT_STATUS_LABEL[visual]}
                </span>
                <ChevronRight className="size-4 text-muted-foreground/60" />
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function ParentHomeworkPage() {
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
        subtitle: `${snap.child.name} · ${snap.classTag} · view assigned work only (no online submission)`,
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
        subtitle: `${profile.name} · ${classTag} · view assigned work only (no online submission)`,
      };
    }

    return {
      assignments: [] as StudentAssignment[],
      homework: [] as StudentAssignment[],
      subtitle: "Assignments and homework — view only, submit at school",
    };
  }, [role, portal.isParent, portal.snapshot, studentPortal.isStudent, studentPortal.snapshot]);

  const activeItems = tab === "assignment" ? assignments : homework;
  const openDetail = (detail: StudentAssignmentDetail) => {
    setSelected(detail);
    setDetailOpen(true);
  };

  return (
    <div className="min-w-0 max-w-full space-y-5">
      <PageHeader title="Homework" subtitle={subtitle} />

      <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/30 p-1" role="tablist" aria-label="Homework type">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "assignment"}
          onClick={() => setTab("assignment")}
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
          onClick={() => setTab("homework")}
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
        emptyMessage={
          tab === "assignment" ? "No assignments right now." : "No homework right now."
        }
        onSelect={openDetail}
      />

      <AssignmentDetailDialog
        assignment={selected}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setSelected(null);
        }}
      />
    </div>
  );
}
