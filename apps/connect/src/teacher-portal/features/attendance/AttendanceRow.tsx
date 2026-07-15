import { Check, UserX, CalendarOff } from "lucide-react";
import { Avatar, AvatarFallback, cn } from "@lumenx/ui";
import type { TeacherStudent } from "@/lib/teacher/types";

export function AttendanceRow({
  student,
  isAbsent,
  isOnLeave,
  onToggle,
}: {
  student: TeacherStudent;
  isAbsent: boolean;
  isOnLeave?: boolean;
  onToggle: () => void;
}) {
  if (isOnLeave) {
    return (
      <div
        className="flex min-w-0 w-full items-center gap-2 bg-warning/5 px-3 py-3 sm:gap-3 sm:px-5"
        aria-label={`${student.name}, roll ${student.roll}, on approved leave`}
      >
        <div className="w-7 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
          {student.roll}
        </div>
        <Avatar className="size-10 shrink-0">
          <AvatarFallback className="text-xs">{student.avatarInitials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{student.name}</div>
          <div className="text-[10px] font-medium text-warning-foreground">Approved leave</div>
        </div>
        <div className="size-10 shrink-0 rounded-full grid place-items-center bg-warning/15 text-warning-foreground">
          <CalendarOff className="size-4" />
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex min-w-0 w-full items-center gap-2 px-3 py-3 text-left transition-colors sm:gap-3 sm:px-5",
        isAbsent ? "bg-destructive/5" : "hover:bg-muted/40 active:bg-muted/60",
      )}
      aria-pressed={isAbsent}
      aria-label={`${student.name}, roll ${student.roll}, ${isAbsent ? "absent" : "present"}`}
    >
      <div className="w-7 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
        {student.roll}
      </div>
      <Avatar className="size-10 shrink-0">
        <AvatarFallback className="text-xs">{student.avatarInitials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 truncate font-medium">{student.name}</div>
      <div
        className={cn(
          "size-10 shrink-0 rounded-full grid place-items-center transition-all duration-200",
          isAbsent
            ? "bg-destructive text-destructive-foreground scale-100"
            : "bg-success/15 text-success",
        )}
      >
        {isAbsent ? <UserX className="size-4" /> : <Check className="size-4" />}
      </div>
    </button>
  );
}
