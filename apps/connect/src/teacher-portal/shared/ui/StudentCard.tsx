import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, Badge } from "@lumenx/ui";
import { cn } from "@lumenx/ui";
import type { StudentReturnContext, TeacherStudent } from "@/lib/teacher/types";

export function StudentCard({
  student,
  returnTo,
  className,
}: {
  student: TeacherStudent;
  returnTo?: StudentReturnContext;
  className?: string;
}) {
  const tone =
    student.avgScore >= 75 ? "success" : student.avgScore >= 50 ? "warning" : "destructive";

  const search =
    returnTo?.from === "classes" && returnTo.classId
      ? { from: "classes" as const, classId: returnTo.classId }
      : returnTo?.from === "students"
        ? { from: "students" as const }
        : undefined;

  return (
    <Link
      to="/students/$studentId"
      params={{ studentId: student.id }}
      search={search}
      className={cn(
        "group flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft transition-all hover:border-primary/30 active:scale-[0.99] sm:p-4",
        className,
      )}
    >
      <Avatar className="size-11 shrink-0">
        <AvatarFallback className="text-xs font-medium">{student.avatarInitials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{student.name}</div>
        <div className="text-xs text-muted-foreground">
          Roll {student.roll} · Class {student.className}-{student.section}
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
          {student.avgScore}%
        </Badge>
        <span className="text-[10px] text-muted-foreground">{student.attendancePct}% att.</span>
        <span className="text-[10px] text-muted-foreground">
          {student.homeworkSubmissionPct}% hw
        </span>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
