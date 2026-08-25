import { Card, CardHeader, Pill } from "@lumenx/ui-admin";
import { ClipboardList } from "lucide-react";

export type StudentAttendanceRosterPlaceholderProps = {
  ready: boolean;
  title?: string;
  message?: string;
};

/**
 * Roster / mark surface placeholder.
 * No attendance rows or mark actions — architecture slot for future logic.
 */
export function StudentAttendanceRosterPlaceholder({
  ready,
  title = "Student roster",
  message,
}: StudentAttendanceRosterPlaceholderProps) {
  const body =
    message ??
    (ready
      ? "Roster and mark actions will appear here. Attendance logic is not connected yet."
      : "Select a class and section to open the attendance workspace.");

  return (
    <Card>
      <CardHeader
        title={title}
        hint="Mark sheet · coming next"
        action={<Pill tone="info">Architecture</Pill>}
      />
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center sm:px-5">
        <span className="flex size-12 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground">
          <ClipboardList className="size-5" aria-hidden />
        </span>
        <p className="max-w-md text-sm text-muted-foreground">{body}</p>
      </div>
    </Card>
  );
}
