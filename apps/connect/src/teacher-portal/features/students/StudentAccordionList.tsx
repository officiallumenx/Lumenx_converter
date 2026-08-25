import { useCallback, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback, Badge, cn } from "@lumenx/ui";
import { teacherRepository } from "@/lib/teacher/repositories";
import { isTeacherAccessDenied } from "@/lib/teacher/portal-access-guard";
import { PageSkeleton } from "@/teacher-portal/shared/ui/PageSkeleton";
import { StudentDetailPanel } from "./StudentDetailPanel";
import { toast } from "sonner";
import type { RemarkType, StudentDetail, TeacherStudent } from "@/lib/teacher/types";

export function StudentAccordionList({
  students,
  showClassLabel = true,
}: {
  students: TeacherStudent[];
  showClassLabel?: boolean;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, StudentDetail>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const loadDetail = useCallback(async (id: string) => {
    setLoadingId(id);
    const d = await teacherRepository.getStudent(id);
    if (d) setDetails((prev) => ({ ...prev, [id]: d }));
    setLoadingId(null);
  }, []);

  const toggle = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!details[id]) void loadDetail(id);
  };

  const addRemark = async (studentId: string, type: RemarkType, text: string) => {
    try {
      await teacherRepository.addRemark(studentId, { type, text });
    } catch (error) {
      if (isTeacherAccessDenied(error)) return;
      throw error;
    }
    toast.success("Remark added");
    await loadDetail(studentId);
  };

  return (
    <div className="space-y-2">
      {students.map((s) => {
        const open = expandedId === s.id;
        const tone = s.avgScore >= 75 ? "success" : s.avgScore >= 50 ? "warning" : "destructive";

        return (
          <article
            key={s.id}
            className={cn(
              "overflow-hidden rounded-2xl border bg-card shadow-soft transition-colors",
              open ? "border-primary/40 ring-1 ring-primary/20" : "border-border",
            )}
          >
            <button
              type="button"
              onClick={() => toggle(s.id)}
              aria-expanded={open}
              className="flex w-full min-w-0 items-center gap-3 p-3 text-left transition-colors hover:bg-muted/30 sm:p-4"
            >
              <Avatar className="size-11 shrink-0">
                <AvatarFallback className="text-xs font-medium">{s.avatarInitials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{s.name}</div>
                <div className="text-xs text-muted-foreground">
                  Roll {s.roll}
                  {showClassLabel ? ` · Class ${s.className}-${s.section}` : ""}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] tabular-nums",
                    tone === "success" && "border-success/30 text-success",
                    tone === "warning" && "border-warning/30 text-warning-foreground",
                    tone === "destructive" && "border-destructive/30 text-destructive",
                  )}
                >
                  {s.avgScore}%
                </Badge>
                <span className="text-[10px] text-muted-foreground">{s.attendancePct}% att.</span>
              </div>
              <ChevronDown
                className={cn(
                  "size-5 shrink-0 text-muted-foreground transition-transform duration-200",
                  open && "rotate-180 text-primary",
                )}
              />
            </button>

            {open ? (
              <div className="border-t border-border bg-muted/20 px-3 py-4 sm:px-4">
                {loadingId === s.id && !details[s.id] ? (
                  <PageSkeleton rows={4} />
                ) : details[s.id] ? (
                  <StudentDetailPanel
                    detail={details[s.id]}
                    compact
                    onAddRemark={(type, text) => addRemark(s.id, type, text)}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">Could not load student details.</p>
                )}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
