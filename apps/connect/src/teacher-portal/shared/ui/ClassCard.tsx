import { Link } from "@tanstack/react-router";
import { Users, ChevronRight, Star } from "lucide-react";
import { Badge } from "@lumenx/ui";
import { cn } from "@lumenx/ui";
import type { TeacherClass } from "@/lib/teacher/types";

export function ClassCard({ cls, className }: { cls: TeacherClass; className?: string }) {
  return (
    <Link
      to="/classes"
      search={{ id: cls.id }}
      className={cn(
        "teacher-list-row group flex min-w-0 flex-col rounded-2xl border border-border bg-card p-4 shadow-soft hover:border-primary/30 sm:p-5",
        className,
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-display text-lg font-semibold">
            Class {cls.className}-{cls.section}
          </div>
          <div className="text-sm text-muted-foreground">{cls.subject}</div>
        </div>
        {cls.isClassTeacher ? (
          <Badge className="shrink-0 gap-1 border-0 bg-primary/15 text-primary">
            <Star className="size-3" /> Class teacher
          </Badge>
        ) : null}
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="size-4 shrink-0" />
          <span>{cls.studentCount} students</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-success">{cls.attendanceRate}% att.</span>
          <span className="text-primary">{cls.homeworkSubmissionRate}% hw</span>
          <span className="text-muted-foreground">{cls.avgScore}% avg</span>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
