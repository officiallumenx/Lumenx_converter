import { memo, type KeyboardEvent, type MouseEvent } from "react";
import { Button, Card } from "@lumenx/ui-admin";
import { KeyRound, Mail } from "lucide-react";
import {
  TeacherAvatar,
  TeacherRolePill,
  TeacherStatusPill,
  type Teacher,
} from "./TeacherDisplay";

type TeacherStaffCardProps = {
  teacher: Teacher;
  onOpen: (teacher: Teacher) => void;
  onMessage: (teacher: Teacher) => void;
  onReset: (teacher: Teacher) => void;
};

export const TeacherStaffCard = memo(function TeacherStaffCard({
  teacher,
  onOpen,
  onMessage,
  onReset,
}: TeacherStaffCardProps) {
  const handleOpen = () => onOpen(teacher);
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen(teacher);
    }
  };
  const handleMessage = (e: MouseEvent) => {
    e.stopPropagation();
    onMessage(teacher);
  };
  const handleReset = (e: MouseEvent) => {
    e.stopPropagation();
    onReset(teacher);
  };

  return (
    <Card
      interactive
      role="button"
      tabIndex={0}
      aria-label={`View ${teacher.name} profile`}
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
      className="p-4 sm:p-5 hover:bg-surface-hover transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <TeacherAvatar name={teacher.name} />
          <div>
            <div className="text-sm font-medium">{teacher.name}</div>
            <div className="text-[11px] text-muted-foreground">{teacher.dept}</div>
            <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{teacher.id}</div>
          </div>
        </div>
        <TeacherStatusPill status={teacher.status} />
      </div>
      <div className="mt-3">
        <TeacherRolePill role={teacher.role} />
      </div>
      <div className="mt-3 sm:mt-5">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Classes</div>
        <div className="text-base font-semibold mt-1">{teacher.classes}</div>
      </div>
      <div className="mt-3 sm:mt-4 flex flex-wrap gap-1">
        {teacher.subjects.slice(0, 2).map((s) => (
          <span
            key={s}
            className="px-2 py-0.5 rounded text-[10px] bg-accent border border-border"
          >
            {s}
          </span>
        ))}
        {teacher.subjects.length > 2 && (
          <span className="text-[10px] text-muted-foreground">+{teacher.subjects.length - 2}</span>
        )}
      </div>
      <div
        className="flex gap-2 mt-4 sm:mt-5"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Button type="button" className="flex-1 justify-center" onClick={handleMessage}>
          <Mail className="size-3" /> Message
        </Button>
        <Button type="button" className="flex-1 justify-center" onClick={handleReset}>
          <KeyRound className="size-3" /> Reset
        </Button>
      </div>
    </Card>
  );
});
